import os
import sys
import time
from playwright.sync_api import sync_playwright

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
out_dir = r"C:\Users\Cayan\.gemini\antigravity\brain\34c50b5c-d710-42d4-ad1a-7ca67b578c41"

VIEWPORTS = [
    {"name": "iphone14", "width": 390, "height": 844, "is_mobile": True},
    {"name": "landscape", "width": 844, "height": 390, "is_mobile": True},
    {"name": "desktop", "width": 1920, "height": 1080, "is_mobile": False}
]

def run_all_states_test(target_url="http://localhost:8080"):
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

            # 1. IDLE & ANALYST DOCK TEST
            analyst_metrics = page.evaluate("""() => {
                const dock = document.getElementById('analyst-dock-rps');
                const sub1 = document.querySelector('.analyst-sub');
                const sub2 = document.querySelector('.analyst-sub-2');
                const vA = document.getElementById('stat-v-angle');
                const tV = document.getElementById('stat-tendon-vel');
                const acc = document.getElementById('stat-accel');
                const pred = document.getElementById('stat-predictability');
                const lock = document.getElementById('stat-lock-badge');

                vA.innerText = "14.2°";
                tV.innerText = "420°/s";
                acc.innerText = "38 px/s²";
                pred.innerText = "%94";
                lock.innerText = "KİLİTLENDİ: TAŞ";
                lock.style.color = "#10b981";

                const dRect = dock.getBoundingClientRect();
                const stage = document.querySelector('.rival-stage');
                const sRect = stage.getBoundingClientRect();

                return {
                    sub1Visible: window.getComputedStyle(sub1).display !== 'none',
                    sub2Visible: window.getComputedStyle(sub2).display !== 'none',
                    dockInsideStage: dRect.bottom <= sRect.bottom && dRect.top >= sRect.top,
                    dockHeight: Math.round(dRect.height)
                };
            }""")
            print(f"[{vp['name']}] ANALYST DOCK STATE:", analyst_metrics)
            page.screenshot(path=os.path.join(out_dir, f"state_analyst_{vp['name']}.png"))

            # 2. LOSE STATE (AI Wins)
            lose_metrics = page.evaluate("""() => {
                const banner = document.getElementById('result-banner');
                const winner = document.getElementById('result-winner');
                const quote = document.getElementById('clash-analysis');
                const seal = document.getElementById('mind-seal');
                const bio = document.getElementById('mind-bio-trigger');
                const guess = document.getElementById('mind-early-guess');
                const p1Icon = document.getElementById('clash-p1-icon');
                const p1Text = document.getElementById('clash-p1-text');
                const p2Icon = document.getElementById('clash-p2-icon');
                const p2Text = document.getElementById('clash-p2-text');

                winner.innerText = 'AI KAZANDI! ZİHİN OKUNDU! 🤖';
                winner.className = 'result-winner ai-win';
                p1Icon.innerText = '✂️';
                p1Text.innerText = 'MAKAS';
                p2Icon.innerText = '🪨';
                p2Text.innerText = 'TAŞ';
                quote.innerText = 'Vuruş masaya varmadan 240ms önce parmak ivmeni ve Markov-2 modelini okudum; Makas tahmin edip Taş kilitledim.';
                seal.innerText = 'MÜHÜR #BEAT9104 (✓ DOĞRULANDI)';
                bio.innerText = 'V-Açısı: 18.5°, Tendon Hızı: 450°/s';
                guess.innerText = '-240ms Önce (Havadayken)';

                banner.classList.remove('hidden');
                document.body.classList.add('clash-active');

                const bRect = banner.getBoundingClientRect();
                const stage = document.querySelector('.rival-stage');
                const sRect = stage.getBoundingClientRect();

                return {
                    stageHeight: sRect.height,
                    bannerHeight: bRect.height,
                    overflowBottom: Math.round(bRect.bottom - sRect.bottom),
                    analystDockOpacity: window.getComputedStyle(document.getElementById('analyst-dock-rps')).opacity
                };
            }""")
            print(f"[{vp['name']}] LOSE STATE METRICS:", lose_metrics)
            page.screenshot(path=os.path.join(out_dir, f"state_lose_{vp['name']}.png"))

            # 3. TIE STATE (Berabere)
            tie_metrics = page.evaluate("""() => {
                const winner = document.getElementById('result-winner');
                const quote = document.getElementById('clash-analysis');
                const p1Icon = document.getElementById('clash-p1-icon');
                const p1Text = document.getElementById('clash-p1-text');
                const p2Icon = document.getElementById('clash-p2-icon');
                const p2Text = document.getElementById('clash-p2-text');

                winner.innerText = 'BERABERE! (HAMLELER EŞİT) 🤝';
                winner.className = 'result-winner tie';
                p1Icon.innerText = '🪨';
                p1Text.innerText = 'TAŞ';
                p2Icon.innerText = '🪨';
                p2Text.innerText = 'TAŞ';
                quote.innerText = 'İkimiz de aynı anda Taş hamlesini kilitledik; tur berabere sonuçlandı.';

                const banner = document.getElementById('result-banner');
                const bRect = banner.getBoundingClientRect();
                const stage = document.querySelector('.rival-stage');
                const sRect = stage.getBoundingClientRect();

                return {
                    bannerHeight: bRect.height,
                    overflowBottom: Math.round(bRect.bottom - sRect.bottom)
                };
            }""")
            print(f"[{vp['name']}] TIE STATE METRICS:", tie_metrics)
            page.screenshot(path=os.path.join(out_dir, f"state_tie_{vp['name']}.png"))

            # 4. MINDTWIN CLASH STATE
            mindtwin_metrics = page.evaluate("""() => {
                const winner = document.getElementById('result-winner');
                const quote = document.getElementById('clash-analysis');
                const p1Icon = document.getElementById('clash-p1-icon');
                const p1Text = document.getElementById('clash-p1-text');
                const p2Icon = document.getElementById('clash-p2-icon');
                const p2Text = document.getElementById('clash-p2-text');

                winner.innerText = 'MINDTWIN: ZİHİN OKUNDU! 🧠';
                winner.className = 'result-winner ai-win';
                p1Icon.innerText = '🖐️';
                p1Text.innerText = '4 PARMAK';
                p2Icon.innerText = '🤖';
                p2Text.innerText = 'SEZGİ: 4 PARMAK';
                quote.innerText = 'Mekanik ikiz 4 parmak açılma ivmesini -180ms önceden simüle ederek tam senkronize oldu.';

                const banner = document.getElementById('result-banner');
                const bRect = banner.getBoundingClientRect();
                const stage = document.querySelector('.rival-stage');
                const sRect = stage.getBoundingClientRect();

                return {
                    bannerHeight: bRect.height,
                    overflowBottom: Math.round(bRect.bottom - sRect.bottom)
                };
            }""")
            print(f"[{vp['name']}] MINDTWIN CLASH METRICS:", mindtwin_metrics)
            page.screenshot(path=os.path.join(out_dir, f"state_mindtwin_{vp['name']}.png"))

            context.close()
        browser.close()

if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080"
    run_all_states_test(url)
