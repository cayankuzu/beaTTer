import os
import sys
import time
from playwright.sync_api import sync_playwright

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
out_dir = r"C:\Users\Cayan\.gemini\antigravity\brain\34c50b5c-d710-42d4-ad1a-7ca67b578c41"

VIEWPORTS = [
    {"name": "iphone14", "width": 390, "height": 844, "is_mobile": True},
    {"name": "pixel7", "width": 412, "height": 915, "is_mobile": True},
    {"name": "landscape", "width": 844, "height": 390, "is_mobile": True},
    {"name": "ipad", "width": 768, "height": 1024, "is_mobile": True},
    {"name": "desktop", "width": 1920, "height": 1080, "is_mobile": False}
]

def run_clash_diagnostics(target_url="http://localhost:8080"):
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

        for vp in VIEWPORTS:
            context = browser.new_context(
                viewport={"width": vp["width"], "height": vp["height"]},
                is_mobile=vp["is_mobile"],
                has_touch=vp["is_mobile"]
            )
            page = context.new_page()
            page.goto(target_url, wait_until="domcontentloaded", timeout=20000)
            time.sleep(1.5)

            # Test 1: Win Banner with Real Text
            metrics_win = page.evaluate("""() => {
                const banner = document.getElementById('result-banner');
                const winner = document.getElementById('result-winner');
                const quote = document.getElementById('clash-analysis');
                const seal = document.getElementById('mind-seal');
                const bio = document.getElementById('mind-bio-trigger');
                const guess = document.getElementById('mind-early-guess');
                const finalMove = document.getElementById('mind-final-move');
                const counter = document.getElementById('mind-counter-move');
                const stage = document.querySelector('.rival-stage');

                winner.innerText = 'SEN KAZANDIN! AI ŞAŞIRTILDI! 🎉';
                winner.className = 'result-winner user-win';
                quote.innerText = 'Havadayken Kağıt bekleyip Makas kilitledim; ancak son anda Taş yaparak yapay zekayı ters köşe yaptın!';
                seal.innerText = 'MÜHÜR #BEAT8821 (✓ DOĞRULANDI)';
                bio.innerText = 'V-Açısı: 0.0°, Tendon Hızı: 0°/s';
                guess.innerText = '-320ms Önce (Havadayken)';
                finalMove.innerText = 'Taş 🪨';
                counter.innerText = 'Makas ✂️ (Kilitlenen Antitez)';

                banner.classList.remove('hidden');

                const bRect = banner.getBoundingClientRect();
                const sRect = stage.getBoundingClientRect();

                return {
                    stageHeight: sRect.height,
                    bannerHeight: bRect.height,
                    overflowBottom: Math.round(bRect.bottom - sRect.bottom),
                    overflowTop: Math.round(sRect.top - bRect.top),
                    hasVerticalScroll: document.documentElement.scrollHeight > window.innerHeight
                };
            }""")
            print(f"[{vp['name']}] WIN CLASH METRICS:", metrics_win)
            page.screenshot(path=os.path.join(out_dir, f"diag_win_{vp['name']}.png"))

            # Test 2: Series End Modal
            metrics_series = page.evaluate("""() => {
                const banner = document.getElementById('result-banner');
                banner.classList.add('hidden');

                const modal = document.getElementById('series-modal');
                const content = document.querySelector('.series-modal-content');
                const list = document.getElementById('series-history-list');
                list.innerHTML = `
                    <div class="history-turn-row"><span>Tur 1: TAŞ vs KAĞIT</span><span class="ht-winner ai">AI KAZANDI (-180ms)</span></div>
                    <div class="history-turn-row"><span>Tur 2: MAKAS vs TAŞ</span><span class="ht-winner ai">AI KAZANDI (-210ms)</span></div>
                    <div class="history-turn-row"><span>Tur 3: TAŞ vs MAKAS</span><span class="ht-winner user">SEN KAZANDIN (FEINT)</span></div>
                    <div class="history-turn-row"><span>Tur 4: KAĞIT vs KAĞIT</span><span class="ht-winner tie">BERABERE</span></div>
                    <div class="history-turn-row"><span>Tur 5: MAKAS vs TAŞ</span><span class="ht-winner ai">AI KAZANDI (-160ms)</span></div>
                `;
                modal.classList.remove('hidden');

                const cRect = content.getBoundingClientRect();
                const stage = document.querySelector('.rival-stage');
                const sRect = stage.getBoundingClientRect();

                return {
                    stageHeight: sRect.height,
                    contentHeight: cRect.height,
                    overflowBottom: Math.round(cRect.bottom - sRect.bottom),
                    btnVisible: (() => {
                        const btn = document.getElementById('btn-restart-series');
                        const bRect = btn.getBoundingClientRect();
                        return bRect.bottom <= sRect.bottom && bRect.top >= sRect.top;
                    })()
                };
            }""")
            print(f"[{vp['name']}] SERIES MODAL METRICS:", metrics_series)
            page.screenshot(path=os.path.join(out_dir, f"diag_series_{vp['name']}.png"))

            context.close()
        browser.close()

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080"
    run_clash_diagnostics(url)
