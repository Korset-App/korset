from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 390, 'height': 844})
    page.goto('http://localhost:5173/setup-profile')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(500)
    # Fill name
    page.fill('input[placeholder="Введите имя"]', 'Test User')
    page.wait_for_timeout(500)
    page.click('button:has-text("Продолжить")')
    page.wait_for_timeout(1500)
    page.screenshot(path='C:/projects/korset/test_setup_step2_preview.png', full_page=False)
    print('Preview step 2 saved')
    browser.close()
