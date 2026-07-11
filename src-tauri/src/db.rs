use std::path::PathBuf;
use std::sync::Mutex;

use rusqlite::Connection;
use serde_json::{Map, Number, Value};

pub struct DbState(pub Mutex<Connection>);

pub fn open(path: PathBuf) -> Result<Connection, String> {
    Connection::open(&path).map_err(|e| format!("Failed to open database: {}", e))
}

fn json_to_rusqlite(val: &Value) -> rusqlite::types::Value {
    match val {
        Value::Null => rusqlite::types::Value::Null,
        Value::Bool(b) => rusqlite::types::Value::Integer(if *b { 1 } else { 0 }),
        Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                rusqlite::types::Value::Integer(i)
            } else if let Some(f) = n.as_f64() {
                rusqlite::types::Value::Real(f)
            } else {
                rusqlite::types::Value::Null
            }
        }
        Value::String(s) => rusqlite::types::Value::Text(s.clone()),
        Value::Array(_) | Value::Object(_) => rusqlite::types::Value::Null,
    }
}

fn rusqlite_to_json(val: &rusqlite::types::Value) -> Value {
    match val {
        rusqlite::types::Value::Null => Value::Null,
        rusqlite::types::Value::Integer(i) => Value::Number(Number::from(*i)),
        rusqlite::types::Value::Real(f) => {
            Number::from_f64(*f).map_or(Value::Null, Value::Number)
        }
        rusqlite::types::Value::Text(s) => Value::String(s.clone()),
        rusqlite::types::Value::Blob(b) => {
            Value::Array(b.iter().map(|x| Value::Number((*x as u64).into())).collect())
        }
    }
}

fn convert_sql(sql: &str) -> String {
    sql.replace('$', "?")
}

#[tauri::command]
pub fn db_query(
    state: tauri::State<'_, DbState>,
    sql: String,
    params: Vec<Value>,
) -> Result<Vec<Map<String, Value>>, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let sql = convert_sql(&sql);
    let mut stmt = conn.prepare(&sql).map_err(|e| format!("Prepare: {}", e))?;

    let col_names: Vec<String> = (0..stmt.column_count())
        .map(|i| stmt.column_name(i).unwrap_or("").to_string())
        .collect();

    let owned: Vec<rusqlite::types::Value> = params.iter().map(json_to_rusqlite).collect();
    let refs: Vec<&dyn rusqlite::types::ToSql> = owned.iter().map(|v| v as &dyn rusqlite::types::ToSql).collect();

    let rows = stmt
        .query_map(refs.as_slice(), |row| {
            let mut map = Map::new();
            for (i, name) in col_names.iter().enumerate() {
                let val: rusqlite::types::Value = row.get(i).unwrap_or(rusqlite::types::Value::Null);
                map.insert(name.clone(), rusqlite_to_json(&val));
            }
            Ok(map)
        })
        .map_err(|e| format!("Query: {}", e))?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| format!("Row: {}", e))?);
    }
    Ok(result)
}

#[tauri::command]
pub fn db_execute(
    state: tauri::State<'_, DbState>,
    sql: String,
    params: Vec<Value>,
) -> Result<u64, String> {
    let conn = state.0.lock().map_err(|e| format!("Lock error: {}", e))?;
    let sql = convert_sql(&sql);
    let owned: Vec<rusqlite::types::Value> = params.iter().map(json_to_rusqlite).collect();
    let refs: Vec<&dyn rusqlite::types::ToSql> = owned.iter().map(|v| v as &dyn rusqlite::types::ToSql).collect();
    conn.execute(&sql, refs.as_slice())
        .map(|n| n as u64)
        .map_err(|e| format!("Execute: {}", e))
}
