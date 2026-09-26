#!/usr/bin/env python3
"""
Measure all DietIcon SVG glyphs in their native viewBox to compute normalized transforms.
"""
import json
import re
from playwright.sync_api import sync_playwright

ICON_NAMES = [
    'halal', 'nosugar', 'nodairy', 'nogluten', 'vegan', 'veggie',
    'lowfat', 'lupin', 'mollusks', 'nuts', 'keto', 'kids',
    'milk', 'egg', 'wheat', 'peanut', 'soy', 'fish',
    'shell', 'sesame', 'celery', 'mustard', 'sulfites'
]

# We'll extract each icon's SVG attributes and inner content
def extract_icon_data():
    with open('src/components/icons/DietIcon.jsx', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find all icon entries: name: ( <svg ...> ... </svg> ),
    # This regex captures the name, the SVG opening tag attributes, and inner content
    pattern = r'(\w+):\s*\(\s*(<svg\s+[^>]*>)([\s\S]*?)(<\/svg>)\s*\)'
    matches = re.findall(pattern, content)
    
    results = {}
    for name, svg_open, inner, svg_close in matches:
        if name in ICON_NAMES:
            # Extract viewBox from the opening tag
            vb_match = re.search(r'viewBox\s*=\s*["\']([^"\']+)["\']', svg_open)
            viewBox = vb_match.group(1) if vb_match else "0 0 100 100"
            
            # Extract width/height if present
            w_match = re.search(r'width\s*=\s*[\'"{]([^"\'}]+)[\'"}]', svg_open)
            h_match = re.search(r'height\s*=\s*[\'"{]([^"\'}]+)[\'"}]', svg_open)
            
            results[name] = {
                'viewBox': viewBox,
                'inner': inner.strip(),
                'width': w_match.group(1) if w_match else None,
                'height': h_match.group(1) if h_match else None,
            }
    
    # Handle aliases
    alias_pattern = r'icons\.(\w+)\s*=\s*icons\.(\w+)'
    for alias, target in re.findall(alias_pattern, content):
        if target in results and alias not in results:
            results[alias] = results[target]
    
    return results

def measure_icons(icon_data):
    """Render each SVG in its native viewBox and measure path bounding boxes."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        results = {}
        
        for name, data in icon_data.items():
            viewBox = data['viewBox']
            inner = data['inner']
            
            # Create a test page with just this icon at large size for accurate measurement
            html = f"""
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body {{ margin: 0; padding: 0; background: white; }}
                svg {{ width: 1000px; height: 1000px; display: block; }}
              </style>
            </head>
            <body>
              <svg viewBox="{viewBox}" preserveAspectRatio="xMidYMid meet" id="icon">{inner}</svg>
            </body>
            </html>
            """
            
            page.set_content(html)
            page.wait_for_load_state('networkidle')
            
            svg_el = page.locator('#icon')
            
            # Get all graphics elements
            paths = svg_el.locator('path, line, polyline, polygon, circle, ellipse, rect, g > *')
            count = paths.count()
            
            if count == 0:
                # Try direct children of svg
                paths = svg_el.locator('*')
                count = paths.count()
            
            min_x = float('inf')
            min_y = float('inf')
            max_x = float('-inf')
            max_y = float('-inf')
            
            for i in range(count):
                el = paths.nth(i)
                try:
                    box = el.bounding_box()
                    if box:
                        # Get stroke width
                        stroke_width = el.get_attribute('stroke-width')
                        sw = float(stroke_width) if stroke_width and stroke_width.replace('.','').isdigit() else 0
                        # Also check style attribute for stroke-width
                        if sw == 0:
                            style = el.get_attribute('style') or ''
                            sw_match = re.search(r'stroke-width\s*:\s*([\d.]+)', style)
                            if sw_match:
                                sw = float(sw_match.group(1))
                        
                        min_x = min(min_x, box['x'] - sw/2)
                        min_y = min(min_y, box['y'] - sw/2)
                        max_x = max(max_x, box['x'] + box['width'] + sw/2)
                        max_y = max(max_y, box['y'] + box['height'] + sw/2)
                except Exception as e:
                    pass
            
            if min_x == float('inf'):
                # Fallback: use the SVG's own bbox
                try:
                    bbox = svg_el.evaluate('el => el.getBBox()')
                    min_x, min_y = bbox.x, bbox.y
                    max_x, max_y = bbox.x + bbox.width, bbox.y + bbox.height
                except:
                    print(f"Warning: {name} - could not measure")
                    continue
            
            # The bounding box is in the SVG's user coordinate system (viewBox space)
            # But the SVG is rendered at 1000x1000 CSS pixels with the viewBox
            # bounding_box() returns CSS pixels, so we need to convert to viewBox coordinates
            # The SVG is 1000x1000 CSS px representing the viewBox
            vb_parts = list(map(float, viewBox.split()))
            vb_x, vb_y, vb_w, vb_h = vb_parts
            
            # Convert CSS pixel bbox to viewBox coordinates
            # The SVG element's bounding box in CSS pixels
            svg_box = svg_el.bounding_box()
            if svg_box:
                scale_x = vb_w / svg_box['width']
                scale_y = vb_h / svg_box['height']
                
                # The paths' bounding boxes are in CSS pixels relative to page
                # We need to offset by svg_box position and scale
                min_x = (min_x - svg_box['x']) * scale_x + vb_x
                min_y = (min_y - svg_box['y']) * scale_y + vb_y
                max_x = (max_x - svg_box['x']) * scale_x + vb_x
                max_y = (max_y - svg_box['y']) * scale_y + vb_y
            
            results[name] = {
                'viewBox': viewBox,
                'vb_width': vb_w,
                'vb_height': vb_h,
                'bbox': {
                    'x': min_x,
                    'y': min_y,
                    'width': max_x - min_x,
                    'height': max_y - min_y
                },
                'center': {
                    'x': (min_x + max_x) / 2,
                    'y': (min_y + max_y) / 2
                }
            }
            print(f"{name}: viewBox={viewBox}, bbox=({min_x:.1f}, {min_y:.1f}, {max_x-min_x:.1f}, {max_y-min_y:.1f}) center=({(min_x+max_x)/2:.1f}, {(min_y+max_y)/2:.1f})")
        
        browser.close()
        return results

def compute_transforms(measurements):
    """Compute transform to normalize each icon to a standard 100x100 box with 78% fill."""
    TARGET_SIZE = 100
    FILL_RATIO = 0.78
    
    transforms = {}
    for name, m in measurements.items():
        bbox = m['bbox']
        center = m['center']
        vb_w = m['vb_width']
        vb_h = m['vb_height']
        
        # Max dimension of glyph in viewBox coordinates
        max_dim = max(bbox['width'], bbox['height'])
        
        if max_dim <= 0:
            print(f"Warning: {name} has zero/negative max_dim")
            continue
        
        # Scale to make max_dim = FILL_RATIO * TARGET_SIZE in the NEW 100x100 space
        # The source is in viewBox coordinates, we want to map to 0..100
        scale = (TARGET_SIZE * FILL_RATIO) / max_dim
        
        # Translate to center in 0..100 box
        tx = TARGET_SIZE/2 - center['x'] * scale
        ty = TARGET_SIZE/2 - center['y'] * scale
        
        # For stroke-based icons, compute normalized stroke width
        # Original stroke width in viewBox units
        # We'll handle this separately per icon type
        
        transforms[name] = {
            'scale': scale,
            'translateX': tx,
            'translateY': ty,
            'targetViewBox': f'0 0 {TARGET_SIZE} {TARGET_SIZE}',
            'sourceViewBox': m['viewBox'],
            'sourceBBox': bbox,
            'sourceCenter': center,
        }
        print(f"{name}: scale={scale:.6f}, translate=({tx:.2f}, {ty:.2f})")
    
    return transforms

def main():
    print("Extracting icon data from DietIcon.jsx...")
    icon_data = extract_icon_data()
    print(f"Found {len(icon_data)} icons")
    
    print("\nMeasuring icons in browser (native viewBox)...")
    measurements = measure_icons(icon_data)
    
    print("\nComputing normalization transforms...")
    transforms = compute_transforms(measurements)
    
    with open('icon-normalization.json', 'w') as f:
        json.dump(transforms, f, indent=2)
    
    print("\nSaved to icon-normalization.json")

if __name__ == '__main__':
    main()