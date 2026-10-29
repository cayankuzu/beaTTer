import time
from playwright.sync_api import sync_playwright

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

def test_button_turn_flow(target_url="http://localhost:8080"):
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

        # STEP 1: Trigger Turn 1 Clash
        print("--- Step 1: Triggering Turn 1 Clash ---")
        page.evaluate("""() => {
            triggerClash('ROCK', 'ROCK', 80, 'PAPER', 'BEAT1111', true);
        }""")
        time.sleep(0.5)

        # Check banner visibility and button labels
        state_t1 = page.evaluate("""() => {
            const banner = document.getElementById('result-banner');
            const btnNext = document.getElementById('btn-next-turn');
            const btnText = document.getElementById('next-turn-btn-text').innerText;
            const shootText = document.getElementById('btn-instant-shoot').innerText;
            return {
                bannerVisible: !banner.classList.contains('hidden'),
                btnNextVisible: btnNext && window.getComputedStyle(btnNext).display !== 'none',
                btnText: btnText,
                shootText: shootText
            };
        }""")
        print("State at Turn 1 clash:", state_t1)
        assert state_t1["bannerVisible"], "Banner must be visible"
        assert state_t1["btnNextVisible"], "Next turn button must be visible"
        assert "Tur 2/5" in state_t1["btnText"], f"Expected Tur 2/5 in button text, got {state_t1['btnText']}"

        # WAIT 5 SECONDS to verify NO auto-dismiss!
        print("Waiting 5.0 seconds to confirm NO auto-dismiss...")
        time.sleep(5.0)
        is_still_visible = page.evaluate("() => !document.getElementById('result-banner').classList.contains('hidden')")
        print("Banner STILL visible after 5.0s:", is_still_visible)
        assert is_still_visible, "Banner MUST stay visible indefinitely until button click!"

        # STEP 2: Click #btn-next-turn
        print("--- Step 2: Clicking #btn-next-turn ---")
        page.click("#btn-next-turn")
        time.sleep(0.5)

        state_after_t1_click = page.evaluate("""() => {
            const banner = document.getElementById('result-banner');
            const turn = window.currentSeriesTurn;
            const shootText = document.getElementById('btn-instant-shoot').innerText;
            const pip2 = document.getElementById('pip-2').classList.contains('current');
            return {
                bannerHidden: banner.classList.contains('hidden'),
                currentTurn: turn,
                shootText: shootText,
                pip2Current: pip2
            };
        }""")
        print("State after clicking next turn button:", state_after_t1_click)
        assert state_after_t1_click["bannerHidden"], "Banner must be hidden"
        assert state_after_t1_click["currentTurn"] == 2, "Turn must advance to 2"
        assert "Şimdi Vur" in state_after_t1_click["shootText"], "Footer button must restore to 'Şimdi Vur'"
        assert state_after_t1_click["pip2Current"], "Pip 2 must be current"

        # STEP 3: Progress to Turn 5
        print("--- Step 3: Fast-forwarding through Turns 2, 3, 4, 5 ---")
        for t in range(2, 5):
            page.evaluate(f"() => triggerClash('PAPER', 'PAPER', 50, 'SCISSORS', 'BEAT{t}', true);")
            time.sleep(0.3)
            page.click("#btn-next-turn")
            time.sleep(0.3)

        assert page.evaluate("() => window.currentSeriesTurn") == 5, "Should be on Turn 5"

        # Turn 5 Clash
        print("--- Step 4: Turn 5 Final Clash ---")
        page.evaluate("() => triggerClash('SCISSORS', 'SCISSORS', 50, 'ROCK', 'BEAT5', true);")
        time.sleep(0.5)

        btn5_text = page.evaluate("() => document.getElementById('next-turn-btn-text').innerText")
        print("Turn 5 button text:", btn5_text)
        assert "Şampiyon" in btn5_text or "Seri" in btn5_text, f"Turn 5 button text should mention Şampiyon/Seri, got: {btn5_text}"

        # Click Turn 5 button -> opens series modal!
        page.click("#btn-next-turn")
        time.sleep(0.5)

        modal_visible = page.evaluate("""() => {
            const m = document.getElementById('series-modal');
            return !m.classList.contains('hidden') && window.getComputedStyle(m).display !== 'none';
        }""")
        print("Series champion modal opened after Turn 5 click:", modal_visible)
        assert modal_visible, "Series modal must open after Turn 5 click"

        # STEP 5: Click #btn-restart-series in modal
        print("--- Step 5: Clicking #btn-restart-series to reset ---")
        page.click("#btn-restart-series")
        time.sleep(0.5)

        final_reset_state = page.evaluate("""() => {
            const m = document.getElementById('series-modal');
            return {
                modalHidden: m.classList.contains('hidden'),
                currentTurn: window.currentSeriesTurn,
                p1Score: document.getElementById('score-p1').innerText,
                p2Score: document.getElementById('score-p2').innerText
            };
        }""")
        print("Final state after restart click:", final_reset_state)
        assert final_reset_state["modalHidden"], "Modal must be hidden"
        assert final_reset_state["currentTurn"] == 1, "Turn must reset to 1"
        assert final_reset_state["p1Score"] == "0", "P1 score must reset to 0"
        assert final_reset_state["p2Score"] == "0", "P2 score must reset to 0"

        print("\nALL BUTTON-DRIVEN TURN FLOW TESTS PASSED FLAWLESSLY (100%)!")
        browser.close()

if __name__ == "__main__":
    test_button_turn_flow()
