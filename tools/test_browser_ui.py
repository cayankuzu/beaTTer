import os
import sys
import time
from playwright.sync_api import sync_playwright

artifacts_dir = r"C:\Users\Cayan\.gemini\antigravity\brain\34c50b5c-d710-42d4-ad1a-7ca67b578c41"

def test_browser():
    console_logs = []
    errors = []

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--use-fake-ui-for-media-stream",
                "--use-fake-device-for-media-stream",
                "--no-sandbox",
                "--disable-dev-shm-usage"
            ]
        )
        page = browser.new_page(viewport={"width": 1280, "height": 800})

        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
        page.on("pageerror", lambda err: errors.append(str(err)))

        print("Navigating to http://localhost:8080 ...")
        page.goto("http://localhost:8080", wait_until="domcontentloaded")
        time.sleep(2.5)

        # 1. Verify basic UI elements in RPS mode
        title = page.title()
        print(f"Page title: {title}")
        assert "beaTTer" in title, f"Unexpected title: {title}"

        # 2. Check telemetry elements
        accel_el = page.query_selector("#stat-accel")
        pred_el = page.query_selector("#stat-predictability")
        lock_badge_el = page.query_selector("#stat-lock-badge")

        assert accel_el is not None, "#stat-accel not found"
        assert pred_el is not None, "#stat-predictability not found"
        assert lock_badge_el is not None, "#stat-lock-badge not found"
        print("Telemetry elements verified: stat-accel, stat-predictability, stat-lock-badge present!")

        # 3. Test Honest Clash in RPS mode
        print("Testing Honest Clash in RPS mode...")
        # Simulate AI locking PAPER, Player throwing SCISSORS -> Player wins!
        page.evaluate("""() => {
            window.triggerClash('SCISSORS', 'ROCK', 215, 'PAPER', 'A1B2C3D4', true);
        }""")
        time.sleep(0.5)

        winner_text = page.inner_text("#result-winner")
        print(f"Result winner text: {winner_text}")
        assert "SEN KAZANDIN" in winner_text, f"Expected user win, got: {winner_text}"

        p1_score = page.inner_text("#score-p1")
        print(f"Player score: {p1_score}")
        assert p1_score == "1", f"Expected player score 1, got {p1_score}"

        # Check breakdown rows
        early_guess = page.inner_text("#mind-early-guess")
        print(f"Breakdown lock lead time: {early_guess}")
        assert "-215ms" in early_guess

        # Check seal row
        seal_text = page.inner_text("#mind-seal")
        print(f"Cryptographic seal text: {seal_text}")
        assert "MÜHÜR #" in seal_text
        assert "DOĞRULANDI" in seal_text

        screenshot_rps = os.path.join(artifacts_dir, "screen_rps_honest_prelock.png")
        page.screenshot(path=screenshot_rps)
        print(f"Saved RPS pre-lock clash screenshot to: {screenshot_rps}")

        # Wait for clash reset
        time.sleep(2.5)

        # 4. Switch to MindTwin mode
        print("Testing MindTwin mode...")
        page.click("#tab-mode-mindtwin")
        time.sleep(1)

        box_title = page.inner_text("#rival-box-title")
        print(f"Rival box title in MindTwin: {box_title}")
        assert "MEKANİK DİJİTAL İKİZ" in box_title

        # Simulate MindTwin clash
        page.evaluate("""() => {
            window.mindTwinEngine.currentPredictedCount = 3;
            window.triggerClash(3, 3, 190);
        }""")
        time.sleep(0.5)

        twin_winner = page.inner_text("#result-winner")
        print(f"MindTwin result winner: {twin_winner}")
        assert "ZİHİN OKUNDU" in twin_winner

        screenshot_mindtwin = os.path.join(artifacts_dir, "screen_mindtwin_clash.png")
        page.screenshot(path=screenshot_mindtwin)
        print(f"Saved MindTwin clash screenshot to: {screenshot_mindtwin}")

        browser.close()

    print("\n--- Browser Console Logs ---")
    for log in console_logs[-15:]:
        print(log)

    if errors:
        print("\n--- JavaScript Page Errors ---")
        for err in errors:
            print(err)
        raise RuntimeError("Browser tests encountered JS page errors!")

    print("\nAll browser verification checks passed successfully!")

if __name__ == "__main__":
    test_browser()
