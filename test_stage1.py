from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 390, 'height': 844})
    
    # Setup profile step 2 - just screenshot
    page.goto('http://localhost:5173/setup-profile')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)
    page.screenshot(path='C:/projects/korset/test_setup_s1_step1.png', full_page=False)
    
    # Use JS to set name and advance to step 2
    page.evaluate("""
        const inputs = document.querySelectorAll('input');
        for (const input of inputs) {
            if (input.type === 'text' || input.placeholder) {
                input.value = 'Test';
                input.dispatchEvent(new Event('input', { bubbles: true }));
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
    page.wait_for_timeout(2000)
    page.screenshot(path='C:/projects/korset/test_setup_s1.png', full_page=False)
    
    # Click second avatar (index 1)
    page.evaluate("""
        const avatarSection = [...document.querySelectorAll('div')].find(d => d.textContent.includes('АВАТАР'));
        if (avatarSection) {
            const buttons = avatarSection.querySelectorAll('button');
            if (buttons.length > 1) buttons[1].click();
        }
    """)
    page.wait_for_timeout(500)
    page.screenshot(path='C:/projects/korset/test_setup_s1_avatar_clicked.png', full_page=False)
    
    print('Stage 1 screenshots saved')
    browser.close()
