from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 390, 'height': 844})
    
    page.goto('http://localhost:5173/setup-profile')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(1500)
    
    inputs = page.locator('input').all()
    for inp in inputs:
        ph = inp.get_attribute('placeholder') or ''
        if 'имя' in ph.lower() or 'name' in ph.lower():
            inp.fill('Тест')
            break
    page.wait_for_timeout(500)
    
    buttons = page.locator('button').all()
    for btn in buttons:
        if 'Продолжить' in btn.inner_text():
            btn.click()
            break
    page.wait_for_timeout(3000)
    
    page.screenshot(path='C:/projects/korset/test_no_thumbs.png', full_page=False)
    
    # Check failed requests
    failed = []
    def on_fail(req):
        if req.resource_type == 'image' and req.failure:
            failed.append(req.url)
    page.on('requestfailed', on_fail)
    page.wait_for_timeout(1000)
    
    print('Failed image requests:', failed)
    browser.close()
