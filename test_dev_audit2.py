from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 390, 'height': 844})
    
    # Go to setup-profile
    page.goto('http://localhost:5173/setup-profile')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(1500)
    
    # Find text input by placeholder
    inputs = page.locator('input').all()
    name_input = None
    for inp in inputs:
        ph = inp.get_attribute('placeholder') or ''
        if ph and ('имя' in ph.lower() or 'name' in ph.lower()):
            name_input = inp
            break
    
    if name_input:
        name_input.fill('Тест')
        page.wait_for_timeout(500)
    
    # Find continue button
    buttons = page.locator('button').all()
    continue_btn = None
    for btn in buttons:
        text = btn.inner_text()
        if 'Продолжить' in text:
            continue_btn = btn
            break
    
    if continue_btn:
        continue_btn.click()
        page.wait_for_timeout(3000)
    
    # Screenshot step 2
    page.screenshot(path='C:/projects/korset/test_dev_step2_fixed.png', full_page=False)
    
    # Get all images
    img_urls = page.evaluate("""() => {
        return Array.from(document.querySelectorAll('img')).map(img => ({
            src: img.src,
            complete: img.complete,
            naturalWidth: img.naturalWidth,
            alt: img.alt || ''
        }));
    }""")
    
    print('Images found:', img_urls)
    print('Step:', page.evaluate("() => document.body.innerText.match(/ШАГ (\\d) ИЗ/)?.[1]"))
    
    browser.close()
