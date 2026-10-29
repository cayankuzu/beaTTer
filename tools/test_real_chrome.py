import sys
import time
from playwright.sync_api import sync_playwright

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

def test_real_chrome(target_url="http://localhost:8080"):
    console_logs = []
    page_errors = []
    network_errors = []

    with sync_playwright() as p:
        print(f"Launching real Google Chrome from: {chrome_path}")
        browser = p.chromium.launch(
            executable_path=chrome_path,
            headless=True,
            args=[
                "--use-fake-ui-for-media-stream",
                "--use-fake-device-for-media-stream",
                "--no-sandbox"
            ]
        )
        context = browser.new_context()
        page = context.new_page()

        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
        page.on("pageerror", lambda err: page_errors.append(str(err)))
        page.on("response", lambda res: network_errors.append(f"[{res.status}] {res.url}") if res.status >= 400 else None)

        print(f"Navigating to {target_url} in real Google Chrome...")
        page.goto(target_url, wait_until="domcontentloaded", timeout=30000)
        time.sleep(4)

        title = page.title()
        print(f"Page title: {title}")

        hint = page.inner_text("#hint-msg") if page.query_selector("#hint-msg") else "NO_HINT"
        print(f"Hint text: {hint}")

        # Check video & overlay state
        dom_state = page.evaluate("""() => {
            const v = document.getElementById('webcam');
            const overlay = document.getElementById('camera-error-overlay');
            const retryBtn = document.getElementById('btn-retry-camera');
            const rivalCan = document.getElementById('rival-canvas');
            const camCan = document.getElementById('camera-canvas');
            return {
                srcObject: !!(v && v.srcObject),
                paused: v ? v.paused : true,
                readyState: v ? v.readyState : 0,
                videoWidth: v ? v.videoWidth : 0,
                videoHeight: v ? v.videoHeight : 0,
                overlayHidden: overlay ? overlay.classList.contains('hidden') : true,
                hasRetryBtn: !!retryBtn,
                rivalWidth: rivalCan ? rivalCan.width : 0,
                rivalHeight: rivalCan ? rivalCan.height : 0,
                camWidth: camCan ? camCan.width : 0,
                camHeight: camCan ? camCan.height : 0
            };
        }""")
        print(f"DOM / Video State: {dom_state}")

        # Check engines state
        engine_state = page.evaluate("""() => {
            return {
                hasRecognizer: !!window.gestureRecognizer,
                hasSwingEngine: !!window.swingEngine,
                hasRivalHand: !!window.rivalHand,
                hasCyberTwin: !!window.cyberTwinHand
            };
        }""")
        print(f"Engine state: {engine_state}")

        out_img = r"C:\Users\Cayan\.gemini\antigravity\brain\34c50b5c-d710-42d4-ad1a-7ca67b578c41\screen_real_chrome_test.png"
        page.screenshot(path=out_img)
        print(f"Saved screenshot to {out_img}")

        browser.close()

    print("\n--- Network Errors (>= 400) ---")
    if not network_errors:
        print("NONE (All resources loaded with 200 OK)")
    for ne in network_errors:
        print(ne)

    print("\n--- Page Errors ---")
    if not page_errors:
        print("NONE")
    for pe in page_errors:
        print(pe)

    print("\n--- Console Logs ---")
    for cl in console_logs:
        print(cl)

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080"
    test_real_chrome(url)
