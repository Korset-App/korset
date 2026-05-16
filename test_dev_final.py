from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 390, 'height': 844})
    
    # First, directly test if profile-bgs image loads
    page.goto('http://localhost:5173/profile-bgs/thumbs/golden-samurai.webp')
    page.wait_for_timeout(1000)
    page.screenshot(path='C:/projects/korset/test_direct_image.png')
    
    # Check if it's displayed
    img_info = page.evaluate("""() => {
        const img = document.querySelector('img');
        if (img) return { src: img.src, complete: img.complete, nw: img.naturalWidth, nh: img.naturalHeight };
        const body = document.body.innerText;
        return { text: body.substring(0, 200) };
    }""")
    print('Direct image:', img_info)
    
    # Now test setup-profile step 2
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
    
    page.screenshot(path='C:/projects/korset/test_dev_final.png', full_page=False)
    
    # Check ALL network requests for images
    requests = page.evaluate("""() => {
        return performance.getEntriesByType('resource')
            .filter(r => r.name.includes('profile-bgs') || r.name.includes('webp'))
            .map(r => ({
                name: r.name,
                status: r.responseStatus,
                duration: r.duration,
                type: r.initiatorType
            }));
    }""")
    print('Resources:', requests)
    
    browser.close()
