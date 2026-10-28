from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        errors = []
        page.on('pageerror', lambda err: errors.append(str(err)))

        print('Navigating to http://localhost:8080/ ...')
        page.goto('http://localhost:8080/')
        page.wait_for_timeout(3000)

        # Trigger 5 turns in succession
        for turn in range(1, 6):
            print(f'Triggering Turn {turn}/5...')
            turn_label = page.evaluate("() => document.getElementById('turn-indicator').innerText")
            print(f'  Current Turn Label: {turn_label}')
            page.keyboard.press('Space')
            page.wait_for_timeout(2400) # wait for clash animation and advance

        # Check if 5-turn series modal is visible
        modal_visible = not page.evaluate("() => document.getElementById('series-modal').classList.contains('hidden')")
        p2_final = page.evaluate("() => document.getElementById('series-p2-score').innerText")
        print(f'Series Modal Visible: {modal_visible}, Final AI Score: {p2_final}')

        # Click new series button
        print('Testing New Series button...')
        page.click('#btn-new-series')
        page.wait_for_timeout(500)
        reset_label = page.evaluate("() => document.getElementById('turn-indicator').innerText")
        print(f'Turn Label after reset: {reset_label}')

        print('PAGE ERRORS:', errors)
        browser.close()
        assert len(errors) == 0
        assert modal_visible == True
        print('ALL 5-TURN SERIES TESTS PASSED PERFECTLY!')

if __name__ == '__main__':
    run()
