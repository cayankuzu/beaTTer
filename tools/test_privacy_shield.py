import os
import time
from playwright.sync_api import sync_playwright

artifact_dir = r"C:\Users\Cayan\.gemini\antigravity\brain\34c50b5c-d710-42d4-ad1a-7ca67b578c41"
chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

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
        page.wait_for_selector("#face-privacy-shield")
        time.sleep(1.0)
        
        # Verify initial state (enabled by default)
        shield = page.locator("#face-privacy-shield")
        toggle_btn = page.locator("#btn-toggle-privacy")
        
        btn_text = toggle_btn.inner_text()
        shield_class = shield.get_attribute("class")
        print(f"Initial toggle button text: '{btn_text}'")
        print(f"Initial shield class: '{shield_class}'")
        
        assert "hidden" not in shield_class, "Privacy shield should be visible by default"
        assert "Açık" in btn_text, "Toggle button should display Açık"
        
        shield_on_path = os.path.join(artifact_dir, "face_privacy_shield_on.png")
        page.screenshot(path=shield_on_path)
        print(f"Saved shield ON screenshot to: {shield_on_path}")
        
        # Click toggle to disable
        toggle_btn.click()
        time.sleep(0.5)
        
        btn_text_off = toggle_btn.inner_text()
        shield_class_off = shield.get_attribute("class")
        print(f"After click toggle button text: '{btn_text_off}'")
        print(f"After click shield class: '{shield_class_off}'")
        
        assert "hidden" in shield_class_off, "Privacy shield should have 'hidden' class after click"
        assert "Kapalı" in btn_text_off, "Toggle button should display Kapalı"
        
        shield_off_path = os.path.join(artifact_dir, "face_privacy_shield_off.png")
        page.screenshot(path=shield_off_path)
        print(f"Saved shield OFF screenshot to: {shield_off_path}")
        
        # Click toggle to re-enable
        toggle_btn.click()
        time.sleep(0.5)
        
        shield_class_on2 = shield.get_attribute("class")
        assert "hidden" not in shield_class_on2, "Privacy shield should be visible again after second click"
        print("Face privacy shield toggle test PASSED 100% on real Chrome!")
        
        browser.close()

if __name__ == "__main__":
    main()
