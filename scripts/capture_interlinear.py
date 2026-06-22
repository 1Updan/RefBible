from playwright.sync_api import sync_playwright
import os

out_dir = os.path.join(os.path.dirname(__file__), '..', 'tmp', 'screenshots')
os.makedirs(out_dir, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 900})

    # Navigate to the app
    page.goto('http://localhost:5173', wait_until='networkidle', timeout=15000)
    page.wait_for_timeout(3000)

    # Screenshot 1: Full page - will show error since no Tauri context
    page.screenshot(path=os.path.join(out_dir, '01_app_error.png'), full_page=True)

    # Check what rendered
    content = page.content()
    with open(os.path.join(out_dir, 'dom.txt'), 'w', encoding='utf-8') as f:
        f.write(content)

    # Try to open Settings panel (works via localStorage mocked prefs)
    # Since we can't use the app in Tauri-less context, capture console logs
    logs = []
    page.on('console', lambda msg: logs.append(f'[{msg.type}] {msg.text}'))

    # Reload and capture errors
    page.goto('http://localhost:5173', wait_until='networkidle', timeout=15000)
    page.wait_for_timeout(2000)

    with open(os.path.join(out_dir, 'console_logs.txt'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(logs))

    # Try injecting Tauri mock to see the rest of the app
    page.evaluate('''
        window.__TAURI_INTERNALS__ = {
            invoke: () => Promise.resolve('{}'),
            convertFileSrc: (p) => p
        };
        window.__TAURI__ = { plugin: { sql: {} } };
    ''')

    page.reload(wait_until='networkidle', timeout=15000)
    page.wait_for_timeout(3000)

    page.screenshot(path=os.path.join(out_dir, '02_with_mock_tauri.png'), full_page=True)

    with open(os.path.join(out_dir, 'dom_mocked.txt'), 'w', encoding='utf-8') as f:
        f.write(page.content())  # wrong, let me fix

    browser.close()
