from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 390, 'height': 844})
    
    page.goto('http://localhost:5173/setup-profile')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)
    
    # Find and fill the first text input by checking placeholder
    inputs = page.locator('input').all()
    for inp in inputs:
        placeholder = inp.get_attribute('placeholder') or ''
        if 'имя' in placeholder.lower() or 'name' in placeholder.lower():
            inp.fill('Test')
            break
    
    page.wait_for_timeout(500)
    
    # Find and click continue button
    buttons = page.locator('button').all()
    for btn in buttons:
        text = btn.inner_text()
        if 'Продолжить' in text or 'Continue' in text:
            btn.click()
            break
    
    page.wait_for_timeout(2500)
    page.screenshot(path='C:/projects/korset/test_setup_s1_step2.png', full_page=False)
    
    print('Step 2 screenshot saved')
    browser.close()
