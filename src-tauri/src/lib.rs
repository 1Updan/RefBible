mod db;

use std::fs;
use std::io::Read;
use std::path::PathBuf;
use flate2::read::GzDecoder;
use tauri::Manager;

fn ensure_db(app: &tauri::App) {
    let app_dir: PathBuf = app.path().app_data_dir().expect("failed to get app data dir");
    let db_path = app_dir.join("refbible.db");
    let marker = app_dir.join(".refbible-v2");

    if marker.exists() && db_path.exists() {
        return;
    }

    fs::create_dir_all(&app_dir).expect("failed to create app data dir");
    let buf = read_bundled_db_gz(app);
    fs::write(&db_path, &buf).expect("failed to write decompressed DB");
    fs::write(&marker, b"1").expect("failed to write marker file");
}

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
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            ensure_db(app);
            let app_dir = app.path().app_data_dir().expect("failed to get app data dir");
            let db_path = app_dir.join("refbible.db");
            let conn = db::open(db_path).expect("failed to open database");
            run_migrations(&conn);
            app.manage(db::DbState(std::sync::Mutex::new(conn)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            db::db_query,
            db::db_execute,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
