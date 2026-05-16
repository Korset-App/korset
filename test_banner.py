from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    # open a simple page that embeds the banner image
    page.goto('http://localhost:5173')
    page.wait_for_load_state('networkidle')
    # inject an img tag for the banner thumb
    page.evaluate("""
        const img = document.createElement('img');
        img.src = '/banners/thumbs/golden-samurai.webp';
        img.style.width = '200px';
        img.style.height = '100px';
        document.body.appendChild(img);
    """)
    page.wait_for_timeout(500)
    page.screenshot(path='C:/projects/korset/test_banner.png', full_page=True)
    print('Screenshot saved to test_banner.png')
    browser.close()
