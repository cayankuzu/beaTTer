import time
from playwright.sync_api import sync_playwright

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

def test_banner_duration_and_skip(target_url="http://localhost:8080"):
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=chrome_path,
            headless=True,
            args=[
                "--use-fake-ui-for-media-stream",
                "--use-fake-device-for-media-stream",
                "--no-sandbox"
            ]
        )
        page = browser.new_page()
        page.goto(target_url, wait_until="domcontentloaded", timeout=20000)
        time.sleep(1.5)

        # TEST 1: Trigger clash, verify it stays visible at 2.5s and 3.5s (old was 2.2s)
        print("Triggering clash...")
        page.evaluate("""() => {
            triggerClash('ROCK', 'ROCK', 80, 'PAPER', 'BEAT9999', true);
        }""")

        time.sleep(1.0)
        v1 = page.evaluate("() => !document.getElementById('result-banner').classList.contains('hidden')")
        print("Banner visible at 1.0s:", v1)
        assert v1, "Banner should be visible at 1.0s"

        time.sleep(1.8) # Total 2.8s (past old 2.2s timeout!)
        v2 = page.evaluate("() => !document.getElementById('result-banner').classList.contains('hidden')")
        print("Banner visible at 2.8s (past old 2.2s timeout!):", v2)
        assert v2, "Banner MUST be visible past old 2.2s limit!"

        time.sleep(1.0) # Total 3.8s
        v3 = page.evaluate("() => !document.getElementById('result-banner').classList.contains('hidden')")
        print("Banner visible at 3.8s:", v3)
        assert v3, "Banner MUST be visible at 3.8s"

        # TEST 2: Test click-to-skip!
        print("Testing click-to-skip on banner...")
        page.click("#result-banner")
        time.sleep(0.3)
        v_after_click = page.evaluate("() => document.getElementById('result-banner').classList.contains('hidden')")
        turn_after_click = page.evaluate("() => window.currentSeriesTurn")
        print("Banner hidden immediately after click:", v_after_click)
        print("Turn advanced to:", turn_after_click)
        assert v_after_click, "Banner should be hidden immediately upon click!"
        assert turn_after_click == 2, "Turn should advance to 2 upon skip!"

        # TEST 3: Test auto-advance after 4.6s on next turn
        print("Triggering Turn 2 clash and waiting for full 4.6s auto-advance...")
        page.evaluate("""() => {
            triggerClash('SCISSORS', 'SCISSORS', 90, 'ROCK', 'BEAT8888', true);
        }""")
        time.sleep(1.0)
        assert page.evaluate("() => !document.getElementById('result-banner').classList.contains('hidden')")

        time.sleep(3.8) # Total 4.8s -> should have auto-advanced!
        v_auto = page.evaluate("() => document.getElementById('result-banner').classList.contains('hidden')")
        turn_auto = page.evaluate("() => window.currentSeriesTurn")
        print("Banner hidden automatically after 4.6s timeout:", v_auto)
        print("Turn auto-advanced to:", turn_auto)
        assert v_auto, "Banner should auto-advance after 4.6s"
        assert turn_auto == 3, "Turn should auto-advance to 3"

        print("\nALL BANNER DURATION & SKIP TESTS PASSED WITH 100% SUCCESS!")
        browser.close()

if __name__ == "__main__":
    test_banner_duration_and_skip()
