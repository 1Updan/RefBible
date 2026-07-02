use tauri::Emitter;
use futures_util::StreamExt;

#[tauri::command]
pub async fn ai_query_stream(app: tauri::AppHandle, api_key: String, prompt: String) -> Result<(), String> {
    let url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse";

    let body = serde_json::json!({
        "contents": [{
            "parts": [{"text": prompt}]
        }]
    });

    let body_str = serde_json::to_string(&body).map_err(|e| e.to_string())?;

    let client = reqwest::Client::new();
    let resp = client
        .post(url)
        .header("X-Goog-Api-Key", &api_key)
        .header("Content-Type", "application/json")
        .body(body_str)
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    let mut buffer = String::new();
    let mut stream = resp.bytes_stream();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Stream error: {}", e))?;
        let chunk_str = String::from_utf8_lossy(&chunk);
        buffer.push_str(&chunk_str);

        loop {
            if let Some(line_end) = buffer.find('\n') {
                let line = buffer[..line_end].trim().to_string();
                buffer = buffer[line_end + 1..].to_string();

                if let Some(data) = line.strip_prefix("data: ") {
                    let data = data.trim();
                    if data.is_empty() || data == "[DONE]" {
                        continue;
                    }
                    if let Ok(val) = serde_json::from_str::<serde_json::Value>(data) {
                        if let Some(text) = val["candidates"][0]["content"]["parts"][0]["text"].as_str() {
                            app.emit("ai:token", text).map_err(|e| format!("Emit error: {}", e))?;
                        }
                    }
                }
            } else {
                break;
            }
        }
    }

    app.emit("ai:done", "").ok();
    Ok(())
}
