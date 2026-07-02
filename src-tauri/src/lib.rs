mod commands;

use std::fs;
use std::io::Read;
use std::path::PathBuf;
use flate2::read::GzDecoder;
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

fn ensure_db(app: &tauri::App) {
    let app_dir: PathBuf = app.path().app_data_dir().expect("failed to get app data dir");
    let db_path = app_dir.join("refbible.db");
    let marker = app_dir.join(".refbible-v2");

    if marker.exists() && db_path.exists() {
        return;
    }

    log::info!("First launch: seeding database from bundled resource");

    fs::create_dir_all(&app_dir).expect("failed to create app data dir");

    let buf = read_bundled_db_gz(app);

    fs::write(&db_path, &buf).expect("failed to write decompressed DB");
    fs::write(&marker, b"1").expect("failed to write marker file");

    log::info!("Seeded database at {:?}", db_path);
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
    let migrations = vec![
        Migration {
            version: 1,
            description: "create initial tables",
            sql: include_str!("../migrations/001_initial.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "interlinear words and strongs definitions",
            sql: include_str!("../migrations/002_interlinear.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "verse highlights/color tags",
            sql: include_str!("../migrations/003_highlights.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_http::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:refbible.db", migrations)
                .build(),
        )
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            ensure_db(app);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![commands::ai::ai_query_stream])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
