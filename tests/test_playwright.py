from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        errors = []
        logs = []
        page.on('pageerror', lambda err: errors.append(str(err)))
        page.on('console', lambda msg: logs.append(f'[{msg.type}] {msg.text}'))

        print('Navigating to http://localhost:8080/ ...')
        page.goto('http://localhost:8080/')
        page.wait_for_timeout(3500)

        print('PAGE ERRORS after 3.5s:', errors)
        print('Recent console logs:')
        for l in logs[-5:]:
            print('  ', l)

        # Test Settings drawer toggle
        print('Testing Settings drawer...')
        page.click('#btn-toggle-settings')
        page.wait_for_timeout(400)
        is_hidden = page.evaluate("() => document.getElementById('settings-drawer').classList.contains('hidden')")
        print('Settings drawer open (hidden==False):', not is_hidden)

        # Test Instant Shoot button
        print('Testing Instant Shoot button...')
        page.click('#btn-instant-shoot')
        page.wait_for_timeout(600)

        p2_score = page.evaluate("() => document.getElementById('score-p2').innerText")
        result_banner_visible = not page.evaluate("() => document.getElementById('result-banner').classList.contains('hidden')")
        print(f'P2 Score: {p2_score}, Result Banner Visible: {result_banner_visible}')

        # Wait for auto-dismiss
        page.wait_for_timeout(2500)
        result_banner_closed = page.evaluate("() => document.getElementById('result-banner').classList.contains('hidden')")
        print('Result Banner Auto-Closed after clash:', result_banner_closed)

        # Test Space Key
        print('Testing Space key press...')
        page.keyboard.press('Space')
        page.wait_for_timeout(600)
        p2_score_2 = page.evaluate("() => document.getElementById('score-p2').innerText")
        print(f'P2 Score after Space clash: {p2_score_2}')

        print('FINAL PAGE ERRORS:', errors)
        browser.close()
        assert len(errors) == 0, f"Found errors: {errors}"
        print("ALL PLAYWRIGHT TESTS PASSED SUCCESSFULLY WITH ZERO ERRORS!")

if __name__ == '__main__':
    run()
