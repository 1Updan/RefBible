mod commands;
mod db;

use std::fs;
use std::io::Read;
use std::path::PathBuf;
use flate2::read::GzDecoder;
use futures_util::StreamExt;
use sha2::{Digest, Sha256};
use tauri::{Emitter, Manager};
use rusqlite;

// First-run Bible database (~22MB). Deliberately NOT bundled inside the
// app binary/installer (keeps installs small); downloaded once from the
// project's GitHub release, checksum-verified, then cached locally.
const DB_DOWNLOAD_URL: &str =
    "https://github.com/1Updan/RefBible/releases/download/db-v3/refbible.db.gz";
const DB_DOWNLOAD_SHA256: &str =
    "612f674a2a3946c27bc799a5c2428f30d6fb44899cd60ef2f606db81b69a1e80";
const DB_DOWNLOAD_ATTEMPTS: u32 = 3;
const DB_MARKER: &str = ".refbible-v3";

fn db_paths(app: &tauri::AppHandle) -> Result<(PathBuf, PathBuf), String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("failed to get app data dir: {}", e))?;
    Ok((app_dir.join("refbible.db"), app_dir.join(DB_MARKER)))
}

fn emit_progress(app: &tauri::AppHandle, phase: &str, downloaded: u64, total: Option<u64>, attempt: u32) {
    let _ = app.emit(
        "db-download",
        serde_json::json!({
            "phase": phase,
            "downloaded": downloaded,
            "total": total,
            "attempt": attempt,
        }),
    );
}

async fn try_download_once(
    client: &reqwest::Client,
    app: &tauri::AppHandle,
    attempt: u32,
) -> Result<Vec<u8>, String> {
    let resp = client
        .get(DB_DOWNLOAD_URL)
        .send()
        .await
        .map_err(|e| format!("request failed: {}", e))?;
    if !resp.status().is_success() {
        return Err(format!("server returned HTTP {}", resp.status().as_u16()));
    }
    let total = resp.content_length();
    let mut buf = Vec::new();
    let mut stream = resp.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("download interrupted: {}", e))?;
        buf.extend_from_slice(&chunk);
        emit_progress(app, "downloading", buf.len() as u64, total, attempt);
    }
    Ok(buf)
}

async fn download_db_gz(app: &tauri::AppHandle) -> Result<Vec<u8>, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(600))
        .connect_timeout(std::time::Duration::from_secs(20))
        .build()
        .map_err(|e| format!("failed to create HTTP client: {}", e))?;

    let mut last_err = String::from("unknown error");
    for attempt in 1..=DB_DOWNLOAD_ATTEMPTS {
        emit_progress(app, "downloading", 0, None, attempt);
        match try_download_once(&client, app, attempt).await {
            Ok(buf) => {
                emit_progress(app, "verifying", buf.len() as u64, Some(buf.len() as u64), attempt);
                let actual = format!("{:x}", Sha256::digest(&buf));
                if actual != DB_DOWNLOAD_SHA256 {
                    last_err = format!("checksum mismatch on attempt {}", attempt);
                } else {
                    // The download is the compressed .gz; the database file
                    // itself must be stored decompressed (same as the old
                    // bundled path produced).
                    let mut gz = GzDecoder::new(&buf[..]);
                    let mut out = Vec::new();
                    match gz.read_to_end(&mut out) {
                        Ok(_) => {
                            emit_progress(app, "done", out.len() as u64, Some(out.len() as u64), attempt);
                            return Ok(out);
                        }
                        Err(e) => {
                            last_err = format!("failed to decompress database: {}", e);
                        }
                    }
                }
            }
            Err(e) => {
                last_err = e;
            }
        }
        std::thread::sleep(std::time::Duration::from_secs(2 * attempt as u64));
    }
    Err(format!(
        "Could not download the Bible database after {} attempts ({}). Connect to the internet and tap Retry.",
        DB_DOWNLOAD_ATTEMPTS, last_err
    ))
}

/// Compressed database bytes from the install bundle when present
/// (older desktop builds shipped it), otherwise None.
fn read_bundled_db_gz(app: &tauri::AppHandle) -> Option<Vec<u8>> {
    let resource_path = app.path().resource_dir().ok()?.join("refbible.db.gz");
    let file = fs::File::open(resource_path).ok()?;
    let mut gz = GzDecoder::new(file);
    let mut buf = Vec::new();
    gz.read_to_end(&mut buf).ok()?;
    Some(buf)
}

/// Fresh database bytes: bundled copy if the installer shipped one,
/// otherwise a verified download. No `include_bytes!` anywhere on
/// purpose — embedding the 22MB blob would defeat the slim installer.
/// Fully async: NEVER block_on this (panics inside the Tauri runtime and
/// the release profile turns panics into a native crash via abort).
async fn fresh_db_bytes(app: &tauri::AppHandle) -> Result<Vec<u8>, String> {
    if let Some(buf) = read_bundled_db_gz(app) {
        return Ok(buf);
    }
    download_db_gz(app).await
}

async fn ensure_db(app: &tauri::AppHandle) -> Result<(), String> {
    let (db_path, marker) = db_paths(app)?;
    if marker.exists() && db_path.exists() {
        return Ok(());
    }

    if let Some(parent) = db_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("failed to create app data dir: {}", e))?;
    }
    let buf = fresh_db_bytes(app).await?;
    fs::write(&db_path, &buf).map_err(|e| format!("failed to write database: {}", e))?;
    fs::write(&marker, b"1").map_err(|e| format!("failed to write marker file: {}", e))?;
    Ok(())
}

fn migrate_user_data(app: &tauri::AppHandle) {
    let app_dir: PathBuf = match app.path().app_data_dir() {
        Ok(d) => d,
        Err(_) => return,
    };
    let old_db_path = app_dir.join("refbible.db");
    let marker_v2 = app_dir.join(".refbible-v2");
    let marker_v3 = app_dir.join(DB_MARKER);

    if !marker_v2.exists() || marker_v3.exists() {
        return;
    }

    let temp_new_db = app_dir.join("refbible.db.new");
    // Legacy upgrades only, and strictly synchronous: setup must never
    // block on the network, so only a installer-bundled copy qualifies.
    // If none is bundled, leave the old database untouched (the app keeps
    // running on existing data) instead of risking startup.
    let buf = match read_bundled_db_gz(app) {
        Some(b) => b,
        None => {
            eprintln!("[migrate] no bundled database; leaving existing data in place");
            return;
        }
    };
    fs::write(&temp_new_db, &buf).expect("failed to write new DB");

    let old_conn = db::open(old_db_path.clone()).expect("failed to open old DB");
    let new_conn = db::open(temp_new_db.clone()).expect("failed to open new DB");

    let user_tables = [
        ("bookmarks", "verse_id, created_at"),
        ("notes", "verse_id, text_content, created_at"),
        ("highlights", "verse_id, color, created_at"),
        ("user_custom_cross_references", "origin_verse_id, target_verse_id, created_at"),
    ];

    for (table, cols) in user_tables {
        let col_names: Vec<String> = cols.split(',').map(|s| s.trim().to_string()).collect();
        let col_count = col_names.len();
        let mut stmt = old_conn
            .prepare(&format!("SELECT {} FROM {}", cols, table))
            .expect("prepare failed");
        let rows = stmt
            .query_map([], |row| {
                let mut vals = Vec::new();
                for i in 0..col_count {
                    vals.push(row.get(i).unwrap_or(rusqlite::types::Value::Null));
                }
                Ok(vals)
            })
            .expect("query failed")
            .collect::<Result<Vec<_>, _>>()
            .expect("collect failed");

        if !rows.is_empty() {
            let placeholders = cols.split(',').map(|_| "?").collect::<Vec<_>>().join(", ");
            for row in rows {
                new_conn
                    .execute(
                        &format!("INSERT OR IGNORE INTO {} ({}) VALUES ({})", table, cols, placeholders),
                        rusqlite::params_from_iter(row),
                    )
                    .expect("insert failed");
            }
        }
    }

    fs::rename(&temp_new_db, &old_db_path).expect("failed to replace DB");
    fs::write(&marker_v3, b"1").expect("failed to write v3 marker");
}

// Inline migrations: the bundled refbible.db.gz ships WITHOUT the highlights
// and user_custom_cross_references tables (they'd be empty anyway), so we have
// to create them on first run. The orphan-cleanup keeps stale content_text rows
// (from older buggy downloads that used the wrong verse-id format) from
// polluting the table. The 1JHN/2JHN/3JHN rewrite fixes a source-data bug where
// cross-references for 1-3 John used the long OSIS book code (1JHN) instead of
// the short one (1JN) the verses table uses. Idempotent: safe to run on every launch.
fn run_migrations(conn: &rusqlite::Connection) {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS highlights (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            verse_id TEXT NOT NULL,
            color TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS user_custom_cross_references (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            origin_verse_id TEXT NOT NULL,
            target_verse_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        DELETE FROM content_text WHERE verse_id NOT IN (SELECT id FROM verses);
        UPDATE cross_references SET origin_verse_id = '1JN.' || substr(origin_verse_id, 6) WHERE origin_verse_id LIKE '1JHN.%';
        UPDATE cross_references SET origin_verse_id = '2JN.' || substr(origin_verse_id, 6) WHERE origin_verse_id LIKE '2JHN.%';
        UPDATE cross_references SET origin_verse_id = '3JN.' || substr(origin_verse_id, 6) WHERE origin_verse_id LIKE '3JHN.%';
        UPDATE cross_references SET target_verse_id = '1JN.' || substr(target_verse_id, 6) WHERE target_verse_id LIKE '1JHN.%';
        UPDATE cross_references SET target_verse_id = '2JN.' || substr(target_verse_id, 6) WHERE target_verse_id LIKE '2JHN.%';
        UPDATE cross_references SET target_verse_id = '3JN.' || substr(target_verse_id, 6) WHERE target_verse_id LIKE '3JHN.%';
        "
    ).expect("failed to run migrations");
}

/// Open the existing database if fully present, else None.
/// Setup never blocks on the network: a missing database is downloaded
/// later from the UI (which can show progress and a Retry button).
fn open_managed_db(app: &tauri::AppHandle) -> Option<rusqlite::Connection> {
    let (db_path, marker) = db_paths(app).ok()?;
    if !(marker.exists() && db_path.exists()) {
        return None;
    }
    migrate_user_data(app);
    let conn = db::open(db_path).ok()?;
    run_migrations(&conn);
    Some(conn)
}

#[tauri::command]
fn db_status(state: tauri::State<'_, db::DbState>) -> Result<bool, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    Ok(conn.is_some())
}

#[tauri::command]
async fn download_db(
    app: tauri::AppHandle,
    state: tauri::State<'_, db::DbState>,
) -> Result<(), String> {
    {
        let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
        if conn.is_some() {
            return Ok(());
        }
    }
    ensure_db(&app).await?;
    let (db_path, _) = db_paths(&app)?;
    let conn = db::open(db_path)?;
    run_migrations(&conn);
    let mut guard = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    *guard = Some(conn);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_http::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                eprintln!("[setup] starting...");
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            let handle = app.handle().clone();
            if cfg!(debug_assertions) {
                eprintln!(
                    "[setup] app_data_dir: {:?}",
                    handle.path().app_data_dir()
                );
            }
            let conn = open_managed_db(&handle);
            app.manage(db::DbState(std::sync::Mutex::new(conn)));
            if cfg!(debug_assertions) {
                eprintln!("[setup] complete");
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            db::db_query,
            db::db_execute,
            db_status,
            download_db,
            commands::ai::ai_query_stream,
            commands::ai::ai_test_connection,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
