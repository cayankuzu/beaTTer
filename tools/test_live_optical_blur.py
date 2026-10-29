import os
import time
from playwright.sync_api import sync_playwright

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
artifact_dir = r"C:\Users\Cayan\.gemini\antigravity\brain\34c50b5c-d710-42d4-ad1a-7ca67b578c41"

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=chrome_path,
            headless=True,
            args=["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--no-sandbox"]
        )
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()
        
        page.goto("http://localhost:8000")
        page.wait_for_selector("#webcam")
        time.sleep(2.0)
        
        # Verify FaceDetector loaded in window
        res = page.evaluate("""
            () => {
                return {
                    hasFaceDetector: !!window.faceDetector,
                    hasGestureRecognizer: !!window.gestureRecognizer,
                    isPrivacyEnabled: window.setFacePrivacyShield !== undefined
                };
            }
        """)
        print("Page ML status:", res)
        
        # Capture screenshot with optical defocus enabled
        screenshot_path = os.path.join(artifact_dir, "app_live_optical_blur.png")
        page.screenshot(path=screenshot_path)
        print("Saved screenshot to:", screenshot_path)
        
        # Toggle privacy off and screenshot
        page.locator("#btn-toggle-privacy").click()
        time.sleep(0.5)
        
        screenshot_off = os.path.join(artifact_dir, "app_live_optical_blur_off.png")
        page.screenshot(path=screenshot_off)
        print("Saved privacy OFF screenshot to:", screenshot_off)
        
        # Toggle back on
        page.locator("#btn-toggle-privacy").click()
        time.sleep(0.5)
        
        browser.close()

if __name__ == "__main__":
    main()
