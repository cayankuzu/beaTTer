import sys
import os
import time
import subprocess
import http.server
import socketserver
import threading
from playwright.sync_api import sync_playwright

PORT = 8089
DIRECTORY = os.path.join(os.path.dirname(__file__), "..", "web")
chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
artifact_dir = r"C:\Users\Cayan\.gemini\antigravity\brain\34c50b5c-d710-42d4-ad1a-7ca67b578c41"

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    def log_message(self, format, *args):
        pass

def start_server():
    httpd = socketserver.TCPServer(("", PORT), QuietHandler)
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    return httpd

def run_tests():
    httpd = start_server()
    print(f"Test web server running on port {PORT}")
    target_url = f"http://localhost:{PORT}"

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

        # 1. Desktop Test (1920x1080)
        print("\n--- 1. Testing Desktop 1080p View ---")
        context_desk = browser.new_context(viewport={"width": 1920, "height": 1080})
        page_desk = context_desk.new_page()
        page_desk.goto(target_url, wait_until="domcontentloaded")
        page_desk.wait_for_timeout(2000)

        # Verify Cognitive HUD elements
        player_tag = page_desk.inner_text("#player-cognitive-tag")
        ai_badge = page_desk.inner_text("#ai-learning-badge")
        print(f"  Desktop Player Tag: '{player_tag}'")
        print(f"  Desktop AI Learning Badge: '{ai_badge}'")
        assert "OYUNCU #" in player_tag.upper(), f"Expected OYUNCU # in tag, got {player_tag}"
        assert "%" in ai_badge, f"Expected % in learning badge, got {ai_badge}"

        # Trigger a clash
        page_desk.evaluate("() => window.triggerClash('ROCK', 'ROCK', 180, 'PAPER')")
        page_desk.wait_for_timeout(500)
        lesson_text = page_desk.inner_text("#mind-cognitive-lesson")
        print(f"  Extracted Cognitive Lesson: '{lesson_text}'")
        assert len(lesson_text) > 10, "Expected lesson to be populated"

        # Check footer button synchronization
        shoot_btn_text = page_desk.inner_text("#btn-instant-shoot")
        print(f"  Footer Button Text during clash: '{shoot_btn_text}'")
        assert "Sonraki Tur" in shoot_btn_text or "Sonraki Tura Geç" in shoot_btn_text, "Expected footer button to prompt Next Turn"

        desk_shot = os.path.join(artifact_dir, "cognitive_desktop_clash.png")
        page_desk.screenshot(path=desk_shot)
        print(f"  Saved Desktop screenshot: {desk_shot}")

        # 2. Mobile Portrait Test (390x844 - iPhone 14 / Pixel 7)
        print("\n--- 2. Testing Mobile Portrait (390x844) View ---")
        context_mob = browser.new_context(
            viewport={"width": 390, "height": 844},
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15"
        )
        page_mob = context_mob.new_page()
        page_mob.goto(target_url, wait_until="domcontentloaded")
        page_mob.wait_for_timeout(2000)

        # Trigger a FEINT Clash on mobile: player threw Taş, AI had locked Makas
        page_mob.evaluate("() => window.triggerClash('ROCK', 'PAPER', 320, 'SCISSORS')")
        page_mob.wait_for_timeout(500)

        # Verify button visibility and bounds
        btn_next = page_mob.query_selector("#btn-next-turn")
        assert btn_next is not None, "#btn-next-turn must exist"
        box = btn_next.bounding_box()
        print(f"  #btn-next-turn bounding box on mobile: {box}")
        assert box is not None, "Button must have a bounding box"
        assert box['y'] + box['height'] <= 844, f"Button bottom ({box['y'] + box['height']}) must be <= 844"

        # Check footer button
        mob_footer_btn = page_mob.inner_text("#btn-instant-shoot")
        print(f"  Mobile Footer Button: '{mob_footer_btn}'")

        mob_shot = os.path.join(artifact_dir, "cognitive_mobile_feint_clash.png")
        page_mob.screenshot(path=mob_shot)
        print(f"  Saved Mobile screenshot: {mob_shot}")

        # Click Next Turn via the primary button inside banner
        print("  Clicking #btn-next-turn to proceed to Turn 2...")
        page_mob.click("#btn-next-turn")
        page_mob.wait_for_timeout(400)

        turn_indicator = page_mob.inner_text("#turn-indicator")
        print(f"  After clicking Next Turn, indicator is: '{turn_indicator}'")
        assert "TUR 2/5" in turn_indicator, f"Expected TUR 2/5, got {turn_indicator}"

        mob_turn2_shot = os.path.join(artifact_dir, "cognitive_mobile_turn2.png")
        page_mob.screenshot(path=mob_turn2_shot)
        print(f"  Saved Mobile Turn 2 screenshot: {mob_turn2_shot}")

        browser.close()

    print("\nALL COGNITIVE END-TO-END BROWSER TESTS PASSED (REAL CHROME)!")

if __name__ == "__main__":
    run_tests()
