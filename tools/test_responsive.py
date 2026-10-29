import os
import sys
import time
from playwright.sync_api import sync_playwright

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
out_dir = r"C:\Users\Cayan\.gemini\antigravity\brain\34c50b5c-d710-42d4-ad1a-7ca67b578c41"

VIEWPORTS = [
    {"name": "mobile_iphone14", "width": 390, "height": 844, "is_mobile": True},
    {"name": "mobile_pixel7", "width": 412, "height": 915, "is_mobile": True},
    {"name": "mobile_landscape", "width": 844, "height": 390, "is_mobile": True},
    {"name": "tablet_ipad", "width": 768, "height": 1024, "is_mobile": True},
    {"name": "desktop_1080p", "width": 1920, "height": 1080, "is_mobile": False}
]

def run_responsive_tests(target_url=None):
    if not target_url:
        target_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080"
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
            print(f"\n--- Testing Viewport: {vp['name']} ({vp['width']}x{vp['height']}) on {target_url} ---")
            page.goto(target_url, wait_until="domcontentloaded", timeout=20000)
            time.sleep(2)

            metrics = page.evaluate("""() => {
                const header = document.querySelector('.game-hud-header');
                const arena = document.querySelector('.arena-split');
                const playerBox = document.querySelector('.player-box');
                const rivalBox = document.querySelector('.rival-box');
                const footer = document.querySelector('.app-footer');
                const body = document.body;
                
                return {
                    docHeight: document.documentElement.scrollHeight,
                    docWidth: document.documentElement.scrollWidth,
                    winHeight: window.innerHeight,
                    winWidth: window.innerWidth,
                    hasHorizontalScroll: document.documentElement.scrollWidth > window.innerWidth,
                    hasVerticalScroll: document.documentElement.scrollHeight > window.innerHeight,
                    headerHeight: header ? header.offsetHeight : 0,
                    arenaHeight: arena ? arena.offsetHeight : 0,
                    playerBoxHeight: playerBox ? playerBox.offsetHeight : 0,
                    rivalBoxHeight: rivalBox ? rivalBox.offsetHeight : 0,
                    footerHeight: footer ? footer.offsetHeight : 0,
                    areBothBoxesVisible: (() => {
                        if (!playerBox || !rivalBox) return false;
                        const r1 = playerBox.getBoundingClientRect();
                        const r2 = rivalBox.getBoundingClientRect();
                        return (r1.bottom > 0 && r1.top < window.innerHeight) &&
                               (r2.bottom > 0 && r2.top < window.innerHeight);
                    })()
                };
            }""")
            print(f"Metrics: {metrics}")

            img_path = os.path.join(out_dir, f"responsive_{vp['name']}.png")
            page.screenshot(path=img_path)
            print(f"Saved: {img_path}")
            context.close()

        browser.close()

if __name__ == "__main__":
    run_responsive_tests()
