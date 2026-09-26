use tauri::Emitter;
use futures_util::StreamExt;

/// Normalize a user-entered endpoint base URL so common paste mistakes
/// can't break provider calls:
/// - missing scheme ("openrouter.ai/api/v1" -> "https://openrouter.ai/api/v1")
/// - trailing slashes
/// - pasted full paths ("/chat/completions", "/models", "/api/tags" are
///   stripped because the code appends its own path per operation)
fn normalize_base(endpoint: &str) -> String {
    let mut base = endpoint.trim().to_string();
    if !base.is_empty() && !base.contains("://") {
        base = format!("https://{}", base);
    }
    while base.ends_with('/') && base.len() > 1 {
        base.pop();
    }
    for suffix in ["/chat/completions", "/models", "/api/tags"] {
        if let Some(stripped) = base.strip_suffix(suffix) {
            if !stripped.is_empty() {
                base = stripped.to_string();
            }
        }
    }
    base
}

/// Translate low-level HTTP errors into hints a non-technical user can act on.
fn friendly_send_error(e: reqwest::Error) -> String {
    if e.is_timeout() {
        return format!(
            "Timed out after 30 seconds. Check your internet connection and try again. ({})",
            e
        );
    }
    if e.is_connect() {
        return format!(
            "Could not reach the server. Check the endpoint URL for typos. ({})",
            e
        );
    }
    if e.is_builder() {
        return "That endpoint URL looks invalid. It should look like https://openrouter.ai/api/v1 .".to_string();
    }
    format!("Connection failed: {}", e)
}

/// Test an AI provider connection from Rust (not the WebView) so the
/// check works under the app's strict CSP and for any custom endpoint:
/// WebView fetch is limited to allow-listed domains, reqwest is not.
#[tauri::command]
pub async fn ai_test_connection(
    api_key: String,
    provider: String,
    endpoint: String,
) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .connect_timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let (url, auth_header): (String, Option<(String, String)>) = match provider.as_str() {
        "gemini" => (
            format!(
                "https://generativelanguage.googleapis.com/v1beta/models?key={}",
                api_key
            ),
            None,
        ),
        "ollama" => {
            let base = normalize_base(&endpoint);
            let base = if base.is_empty() {
                "http://localhost:11434".to_string()
            } else {
                base
            };
            (format!("{}/api/tags", base), None)
        }
        _ => {
            // openai / custom / nvidia (all OpenAI-compatible)
            let base = normalize_base(&endpoint);
            let base = if base.is_empty() {
                "https://api.openai.com/v1".to_string()
            } else {
                base
            };
            (
                format!("{}/models", base),
                Some((
                    "Authorization".to_string(),
                    format!("Bearer {}", api_key),
                )),
            )
        }
    };

    let mut req = client.get(&url);
    if let Some((name, value)) = auth_header {
        req = req.header(name, value);
    }
    let resp = req
        .send()
        .await
        .map_err(friendly_send_error)?;
    if !resp.status().is_success() {
        let code = resp.status().as_u16();
        let body = resp.text().await.unwrap_or_default();
        let snippet: String = body.chars().take(200).collect();
        let hint = match code {
            401 => "The API key was rejected. Double-check the key and try again.",
            404 => "Server not found at that address. Double-check the endpoint URL.",
            429 => "Rate limit reached. Wait a little and try again.",
            500..=599 => "The provider's server had a problem. Try again in a bit.",
            _ => "The provider returned an error.",
        };
        return Err(format!("{} (HTTP {}) {}", hint, code, snippet));
    }
    let data: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Invalid response: {}", e))?;

    // Extract a short model list for display; shape differs per provider.
    let models: Vec<String> = if provider == "gemini" {
        data.get("models")
            .and_then(|m| m.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|m| m.get("name").and_then(|n| n.as_str()))
                    .map(|n| n.trim_start_matches("models/").to_string())
                    .filter(|n| n.contains("gemini"))
                    .take(8)
                    .collect()
            })
            .unwrap_or_default()
    } else if provider == "ollama" {
        data.get("models")
            .and_then(|m| m.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|m| m.get("name").and_then(|n| n.as_str()))
                    .map(|s| s.to_string())
                    .take(8)
                    .collect()
            })
            .unwrap_or_default()
    } else {
        data.get("data")
            .and_then(|m| m.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|m| m.get("id").and_then(|n| n.as_str()))
                    .map(|s| s.to_string())
                    .take(8)
                    .collect()
            })
            .unwrap_or_default()
    };

    Ok(serde_json::json!({ "valid": true, "models": models }))
}

#[tauri::command]
pub async fn ai_query_stream(
    app: tauri::AppHandle,
    api_key: String,
    prompt: String,
    provider: String,
    endpoint: String,
    model: String,
) -> Result<(), String> {
    match provider.as_str() {
        "gemini" => gemini_stream(app, api_key, prompt, model).await,
        _ => openai_stream(app, api_key, prompt, endpoint, model).await,
    }
}

async fn gemini_stream(
    app: tauri::AppHandle,
    api_key: String,
    prompt: String,
    model: String,
) -> Result<(), String> {
    // Use the user-configured model (sanitized to model-id characters so a
    // hostile/stale config value cannot break out of the URL path).
    let clean: String = model
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '.' || *c == '_' || *c == '-')
        .collect();
    let model = if clean.is_empty() {
        "gemini-3.5-flash".to_string()
    } else {
        clean
    };
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{}:streamGenerateContent?alt=sse",
        model
    );

    let body = serde_json::json!({
        "contents": [{
            "parts": [{"text": prompt}]
        }]
    });

    let body_str = serde_json::to_string(&body).map_err(|e| e.to_string())?;

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .connect_timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let resp = client
        .post(url)
        .header("X-Goog-Api-Key", &api_key)
        .header("Content-Type", "application/json")
        .body(body_str)
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    let status = resp.status();
    if !status.is_success() {
        let body = resp.text().await.unwrap_or_else(|e| format!("(failed to read: {})", e));
        return Err(format!("Gemini API returned {}: {}", status.as_u16(), body));
    }

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

async fn openai_stream(
    app: tauri::AppHandle,
    api_key: String,
    prompt: String,
    endpoint: String,
    model: String,
) -> Result<(), String> {
    let base = normalize_base(&endpoint);
    let url = format!("{}/chat/completions", base);

    let body = serde_json::json!({
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "stream": true,
    });

    let body_str = serde_json::to_string(&body).map_err(|e| e.to_string())?;

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .connect_timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let resp = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .body(body_str)
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    let status = resp.status();
    if !status.is_success() {
        let body = resp.text().await.unwrap_or_else(|e| format!("(failed to read: {})", e));
        return Err(format!("API returned {}: {}", status.as_u16(), body));
    }

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
                        if let Some(text) = val["choices"][0]["delta"]["content"].as_str() {
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn adds_missing_scheme() {
        assert_eq!(
            normalize_base("openrouter.ai/api/v1"),
            "https://openrouter.ai/api/v1"
        );
    }

    #[test]
    fn trims_whitespace_and_slashes() {
        assert_eq!(
            normalize_base("  https://openrouter.ai/api/v1//  "),
            "https://openrouter.ai/api/v1"
        );
    }

    #[test]
    fn strips_pasted_full_paths() {
        assert_eq!(
            normalize_base("https://openrouter.ai/api/v1/chat/completions"),
            "https://openrouter.ai/api/v1"
        );
        assert_eq!(
            normalize_base("https://api.openai.com/v1/models"),
            "https://api.openai.com/v1"
        );
        assert_eq!(
            normalize_base("http://localhost:11434/api/tags"),
            "http://localhost:11434"
        );
    }

    #[test]
    fn leaves_good_urls_alone() {
        assert_eq!(
            normalize_base("https://api.openai.com/v1"),
            "https://api.openai.com/v1"
        );
        assert_eq!(
            normalize_base("http://localhost:11434"),
            "http://localhost:11434"
        );
        assert_eq!(normalize_base(""), "");
    }
}
