use tauri_plugin_http::reqwest;

#[tauri::command]
pub async fn ai_query(api_key: String, prompt: String) -> Result<String, String> {
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={}",
        api_key
    );

    let body = serde_json::json!({
        "contents": [{
            "parts": [{"text": prompt}]
        }]
    });

    let body_str = serde_json::to_string(&body).map_err(|e| e.to_string())?;

    let client = reqwest::Client::new();
    let resp = client
        .post(&url)
        .header("Content-Type", "application/json")
        .body(body_str)
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    let text = resp.text().await.map_err(|e| format!("Failed to read response: {}", e))?;
    Ok(text)
}
