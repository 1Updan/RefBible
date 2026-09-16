mod commands;
mod db;

use std::fs;
use std::io::Read;
use std::path::PathBuf;
use flate2::read::GzDecoder;
use tauri::Manager;
use rusqlite;

fn ensure_db(app: &tauri::App) {
    let app_dir: PathBuf = app.path().app_data_dir().expect("failed to get app data dir");
    let db_path = app_dir.join("refbible.db");
    let marker = app_dir.join(".refbible-v3");

    if marker.exists() && db_path.exists() {
        return;
    }

    fs::create_dir_all(&app_dir).expect("failed to create app data dir");
    let buf = read_bundled_db_gz(app);
    fs::write(&db_path, &buf).expect("failed to write decompressed DB");
    fs::write(&marker, b"1").expect("failed to write marker file");
}

fn migrate_user_data(app: &tauri::App) {
    let app_dir: PathBuf = app.path().app_data_dir().expect("failed to get app data dir");
    let old_db_path = app_dir.join("refbible.db");
    let marker_v2 = app_dir.join(".refbible-v2");
    let marker_v3 = app_dir.join(".refbible-v3");

    if !marker_v2.exists() || marker_v3.exists() {
        return;
    }

    let temp_new_db = app_dir.join("refbible.db.new");
    let buf = read_bundled_db_gz(app);
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

#[cfg(not(any(target_os = "android", target_os = "ios")))]
fn read_bundled_db_gz(app: &tauri::App) -> Vec<u8> {
    let resource_path = app.path()
        .resource_dir()
        .expect("failed to get resource dir")
        .join("refbible.db.gz");

    let file = fs::File::open(&resource_path)
        .expect("failed to open bundled refbible.db.gz");
    let mut gz = GzDecoder::new(file);
    let mut buf = Vec::new();
    gz.read_to_end(&mut buf).expect("failed to decompress bundled DB");
    buf
}

#[cfg(any(target_os = "android", target_os = "ios"))]
fn read_bundled_db_gz(_app: &tauri::App) -> Vec<u8> {
    let data: &[u8] = include_bytes!("../bundled/refbible.db.gz");
    let mut gz = GzDecoder::new(data);
    let mut buf = Vec::new();
    gz.read_to_end(&mut buf).expect("failed to decompress bundled DB");
    buf
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
            ensure_db(app);
            migrate_user_data(app);
            let app_dir = app.path().app_data_dir().expect("failed to get app data dir");
            if cfg!(debug_assertions) {
                eprintln!("[setup] app_data_dir: {:?}", app_dir);
            }
            let db_path = app_dir.join("refbible.db");
            let conn = db::open(db_path).expect("failed to open database");
            run_migrations(&conn);
            app.manage(db::DbState(std::sync::Mutex::new(conn)));
            if cfg!(debug_assertions) {
                eprintln!("[setup] complete");
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            db::db_query,
            db::db_execute,
            commands::ai::ai_query_stream,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
