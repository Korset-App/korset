from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 390, 'height': 844})
    
    # Open profile edit screen directly (will redirect to auth, but we can still inspect)
    page.goto('http://localhost:5173/s/demo-store/profile/edit')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)
    
    # Screenshot full page
    page.screenshot(path='C:/projects/korset/test_profile_edit_full.png', full_page=True)
    
    # Also take setup-profile step 2
    page.goto('http://localhost:5173/setup-profile')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(1000)
    page.fill('input[placeholder*="имя" i]', 'Test')
    page.wait_for_timeout(500)
    page.click('button:has-text("Продолжить")')
    page.wait_for_timeout(2000)
    page.screenshot(path='C:/projects/korset/test_setup_step2_full.png', full_page=True)
    
    print('Screenshots saved')
    browser.close()
