import time
from playwright.sync_api import sync_playwright

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

def test_restart_button(target_url="http://localhost:8080"):
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
        time.sleep(2)

        # 1. Simulate 5 turns and display Series Modal
        page.evaluate("""() => {
            window.p1SeriesScore = 2;
            window.p2SeriesScore = 3;
            window.currentSeriesTurn = 5;
            document.getElementById('score-p1').innerText = "2";
            document.getElementById('score-p2').innerText = "3";
            showSeriesChampionModal();
        }""")
        time.sleep(0.5)

        # Check modal is visible
        modal_visible = page.evaluate("""() => {
            const m = document.getElementById('series-modal');
            const style = window.getComputedStyle(m);
            return {
                hasHiddenClass: m.classList.contains('hidden'),
                display: style.display,
                bodyHasClashActive: document.body.classList.contains('clash-active')
            };
        }""")
        print("MODAL DISPLAY STATE BEFORE CLICK:", modal_visible)
        assert not modal_visible["hasHiddenClass"], "Modal should NOT have hidden class"
        assert modal_visible["display"] != "none", "Modal display should NOT be none"
        assert modal_visible["bodyHasClashActive"], "Body should have clash-active"

        # 2. Click the restart button!
        print("Clicking #btn-restart-series...")
        page.click("#btn-restart-series")
        time.sleep(0.5)

        # 3. Check everything is cleanly reset
        reset_state = page.evaluate("""() => {
            const m = document.getElementById('series-modal');
            const style = window.getComputedStyle(m);
            const p1 = document.getElementById('score-p1').innerText;
            const p2 = document.getElementById('score-p2').innerText;
            const turn = document.getElementById('turn-indicator').innerText;
            const pip1Current = document.getElementById('pip-1').classList.contains('current');
            const pip2Current = document.getElementById('pip-2').classList.contains('current');
            const bodyClashActive = document.body.classList.contains('clash-active');

            return {
                hasHiddenClass: m.classList.contains('hidden'),
                display: style.display,
                p1Score: p1,
                p2Score: p2,
                turnIndicator: turn,
                pip1Current: pip1Current,
                pip2Current: pip2Current,
                bodyClashActive: bodyClashActive,
                currentTurnVar: window.currentSeriesTurn,
                p1Var: window.p1SeriesScore,
                p2Var: window.p2SeriesScore
            };
        }""")
        print("RESET STATE AFTER CLICK:", reset_state)

        assert reset_state["hasHiddenClass"], "Modal should have hidden class"
        assert reset_state["display"] == "none", "Modal display should be none"
        assert reset_state["p1Score"] == "0", "P1 score text should be 0"
        assert reset_state["p2Score"] == "0", "P2 score text should be 0"
        assert reset_state["turnIndicator"] == "TUR 1/5", "Turn indicator should be TUR 1/5"
        assert reset_state["pip1Current"], "Pip 1 should be current"
        assert not reset_state["pip2Current"], "Pip 2 should not be current"
        assert not reset_state["bodyClashActive"], "body should not have clash-active"
        assert reset_state["currentTurnVar"] == 1, "currentSeriesTurn should be 1"
        assert reset_state["p1Var"] == 0, "p1SeriesScore should be 0"
        assert reset_state["p2Var"] == 0, "p2SeriesScore should be 0"

        print("\nALL ASSERTIONS PASSED! 'Yeni Seri Başlat' button resets the entire game seamlessly!")
        browser.close()

if __name__ == "__main__":
    test_restart_button()
