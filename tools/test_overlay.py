from playwright.sync_api import sync_playwright

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=chrome_path, headless=True)
    page = browser.new_page()
    page.goto("http://localhost:8080", wait_until="domcontentloaded")
    
    # Simulate how setupWebcam error handler behaves on NotReadableError
    res = page.evaluate("""() => {
        const overlay = document.getElementById('camera-error-overlay');
        const titleEl = document.getElementById('cam-err-title');
        const descEl = document.getElementById('cam-err-desc');
        
        overlay.classList.remove('hidden');
        titleEl.innerText = 'Kamera Başka Bir Yerde Kullanılıyor';
        descEl.innerText = 'Kamera başka bir sekmede (örn. localhost:8080) veya uygulamada (OBS, Discord, Zoom) açık. Lütfen o sekmeyi/uygulamayı kapatıp Yeniden Dene butonuna tıklayın.';
        
        return {
            visible: !overlay.classList.contains('hidden'),
            title: titleEl.innerText,
            desc: descEl.innerText
        };
    }""")
    print("Error overlay test:", res)
    page.screenshot(path=r"C:\Users\Cayan\.gemini\antigravity\brain\34c50b5c-d710-42d4-ad1a-7ca67b578c41\screen_error_overlay_test.png")
    browser.close()
