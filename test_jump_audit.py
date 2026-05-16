from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 390, 'height': 844})
    
    page.goto('http://localhost:5173/setup-profile')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(1500)
    
    # Fill name
    inputs = page.locator('input').all()
    for inp in inputs:
        ph = inp.get_attribute('placeholder') or ''
        if 'имя' in ph.lower() or 'name' in ph.lower():
            inp.fill('Тест')
            break
    page.wait_for_timeout(500)
    
    # Click continue
    buttons = page.locator('button').all()
    for btn in buttons:
        if 'Продолжить' in btn.inner_text():
            btn.click()
            break
    page.wait_for_timeout(3000)
    
    # Screenshot BEFORE click
    page.screenshot(path='C:/projects/korset/test_before_click.png', full_page=False)
    
    # Click second avatar (first preset)
    avatar_buttons = page.locator('button[aria-pressed]').all()
    if len(avatar_buttons) > 1:
        avatar_buttons[1].click()
    page.wait_for_timeout(600)
    
    # Screenshot AFTER avatar click
    page.screenshot(path='C:/projects/korset/test_after_avatar_click.png', full_page=False)
    
    # Click second banner (first preset after upload)
    all_btns = page.locator('button').all()
    # Filter to banner area buttons (after avatar buttons)
    banner_buttons = [b for b in all_btns if b not in avatar_buttons and b.is_visible()]
    if len(banner_buttons) > 2:
        banner_buttons[2].click()
    page.wait_for_timeout(600)
    
    # Screenshot AFTER banner click
    page.screenshot(path='C:/projects/korset/test_after_banner_click.png', full_page=False)
    
    print('Jump test complete')
    browser.close()
