from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=["--window-size=1280,900"])

    context = browser.new_context(
        viewport={"width": 1280, "height": 900},
        permissions=["clipboard-read", "clipboard-write"],
    )

    page = context.new_page()

    # Capture console messages
    page.on("console", lambda msg: print(f"[{msg.type}] {msg.text}"))
    page.on("pageerror", lambda err: print(f"[PAGE ERROR] {err}"))

    page.goto('http://localhost:5173', timeout=60000)
    page.wait_for_load_state('networkidle')
    time.sleep(4)

    # Click on New Testament
    nt = page.locator('button:has-text("New Testament")').first
    if nt.is_visible():
        nt.click()
        time.sleep(0.5)

    # Click on John
    john = page.locator('button:has-text("John")').first
    if john.is_visible():
        john.click()
        time.sleep(0.5)

    # Click chapter 1
    ch1 = page.locator('button:has-text("1")').first
    if ch1.is_visible():
        ch1.click()
        time.sleep(3)

    page.screenshot(path='C:\\Users\\user\\refbible\\scripts\\screenshot_loaded.png', full_page=True)
    print("Screenshot: after navigation")

    # Log page content to see if verses are shown
    content = page.content()
    if "requires a Tauri shell" in content:
        print("ERROR: App showing Tauri shell error - not running inside Tauri")
    elif "Loading Scripture" in content or "Loading…" in content:
        print("App still loading")
    elif "Failed to initialize" in content:
        print("App failed to initialize")
    else:
        print("App appears to be loaded")

    browser.close()
