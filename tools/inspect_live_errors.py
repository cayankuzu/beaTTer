import json
import time
from playwright.sync_api import sync_playwright

def inspect_live():
    console_logs = []
    page_errors = []
    network_requests = []
    failed_requests = []

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--use-fake-ui-for-media-stream",
                "--use-fake-device-for-media-stream",
                "--no-sandbox"
            ]
        )
        context = browser.new_context()
        page = context.new_page()

        page.on("console", lambda msg: console_logs.append({
            "type": msg.type,
            "text": msg.text,
            "location": msg.location
        }))
        page.on("pageerror", lambda err: page_errors.append(str(err)))

        def handle_response(response):
            network_requests.append({
                "url": response.url,
                "status": response.status,
                "statusText": response.status_text
            })
            if response.status >= 400:
                failed_requests.append({
                    "url": response.url,
                    "status": response.status,
                    "statusText": response.status_text
                })

        page.on("response", handle_response)

        print("Navigating to https://beatter.vercel.app ...")
        page.goto("https://beatter.vercel.app", wait_until="networkidle", timeout=30000)
        time.sleep(5)

        title = page.title()
        print(f"Page title: {title}")

        # Check webcam video element and hint message
        hint_text = page.inner_text("#hint-msg") if page.query_selector("#hint-msg") else "NO_HINT"
        gesture_title = page.inner_text("#gesture-title") if page.query_selector("#gesture-title") else "NO_TITLE"

        print(f"Hint Message: {hint_text}")
        print(f"Gesture Title: {gesture_title}")

        screenshot_path = r"C:\Users\Cayan\.gemini\antigravity\brain\34c50b5c-d710-42d4-ad1a-7ca67b578c41\screen_live_error_inspect.png"
        page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to: {screenshot_path}")

        browser.close()

    print("\n--- FAILED NETWORK REQUESTS (>=400) ---")
    for req in failed_requests:
        print(f"[{req['status']}] {req['url']}")

    print("\n--- PAGE ERRORS (Uncaught exceptions) ---")
    for err in page_errors:
        print(f"[PAGE ERROR] {err}")

    print("\n--- BROWSER CONSOLE LOGS ---")
    for log in console_logs:
        print(f"[{log['type']}] {log['text']}")

if __name__ == "__main__":
    inspect_live()
