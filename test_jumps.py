from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 390, 'height': 844})
    
    page.goto('http://localhost:5173/setup-profile')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)
    
    # Fill name and continue
    inputs = page.locator('input').all()
    for inp in inputs:
        placeholder = inp.get_attribute('placeholder') or ''
        if 'имя' in placeholder.lower() or 'name' in placeholder.lower():
            inp.fill('Test')
            break
    page.wait_for_timeout(500)
    buttons = page.locator('button').all()
    for btn in buttons:
        text = btn.inner_text()
        if 'Продолжить' in text:
            btn.click()
            break
    page.wait_for_timeout(2500)
    
    # Screenshot before click
    page.screenshot(path='C:/projects/korset/test_before_click.png', full_page=False)
    
    # Click second avatar preset (index 1 in avatar section)
    avatar_btns = page.locator('button[aria-pressed]').all()
    if len(avatar_btns) > 1:
        avatar_btns[1].click()
    page.wait_for_timeout(500)
    page.screenshot(path='C:/projects/korset/test_after_avatar_click.png', full_page=False)
    
    # Click third banner preset 
    # Banner buttons are inside the banner grid (after avatar section)
    all_btns = page.locator('button').all()
    # Find buttons in banner area (they come after avatar buttons)
    banner_btns = [b for b in all_btns if b not in avatar_btns]
    if len(banner_btns) > 2:
        banner_btns[2].click()
    page.wait_for_timeout(500)
    page.screenshot(path='C:/projects/korset/test_after_banner_click.png', full_page=False)
    
    print('Jump test screenshots saved')
    browser.close()
