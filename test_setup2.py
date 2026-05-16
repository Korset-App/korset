from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 390, 'height': 844})
    page.goto('http://localhost:5173/setup-profile')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(1000)

    # Fill name input
    page.fill('input[placeholder="Введите имя"]', 'Test User')
    page.wait_for_timeout(500)

    # Click continue (enabled after valid name)
    page.click('button:has-text("Продолжить")')
    page.wait_for_timeout(1500)

    page.screenshot(path='C:/projects/korset/test_setup_step2.png', full_page=False)
    print('Step 2 saved')
    browser.close()
