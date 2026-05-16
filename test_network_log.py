from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 390, 'height': 844})
    
    # Log all network requests
    all_requests = []
    page.on('request', lambda req: all_requests.append({
        'url': req.url,
        'type': req.resource_type,
        'method': req.method
    }))
    page.on('requestfailed', lambda req: all_requests.append({
        'url': req.url,
        'type': req.resource_type,
        'failed': True,
        'error': req.failure['errorText'] if req.failure else 'unknown'
    }))
    page.on('response', lambda res: all_requests.append({
        'url': res.url,
        'status': res.status,
        'type': res.request.resource_type
    }))
    
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
    
    # Filter for profile-bgs requests
    bg_requests = [r for r in all_requests if 'profile-bgs' in r.get('url', '')]
    for r in bg_requests:
        print(r)
    
    browser.close()
