from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 390, 'height': 844})
    
    # Capture network requests
    failed_requests = []
    def handle_failed(req):
        if req.resource_type == 'image' and req.failure:
            failed_requests.append(req.url)
    page.on("requestfailed", handle_failed)
    
    # Go to setup-profile step 2 in DEV mode
    page.goto('http://localhost:5173/setup-profile')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)
    
    # Fill name and continue
    page.evaluate("""
        const inputs = document.querySelectorAll('input');
        for (const inp of inputs) {
            if (inp.type === 'text' || inp.placeholder) {
                inp.value = 'Test';
                inp.dispatchEvent(new Event('input', { bubbles: true }));
                break;
            }
        }
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
            if (btn.textContent.includes('Продолжить')) {
                btn.click();
                break;
            }
        }
    """)
    page.wait_for_timeout(2500)
    
    # Screenshot
    page.screenshot(path='C:/projects/korset/test_dev_step2.png', full_page=False)
    
    # Check all image URLs
    img_urls = page.evaluate("""() => {
        return Array.from(document.querySelectorAll('img')).map(img => ({
            src: img.src,
            complete: img.complete,
            naturalWidth: img.naturalWidth,
            alt: img.alt
        }));
    }""")
    
    print('Image URLs:', img_urls)
    print('Failed requests:', failed_requests)
    
    browser.close()
