#!/usr/bin/env python3
"""
Generate normalized DietIcon.jsx - simple nested approach (correct SVG).
"""
import json
import re

with open('icon-normalization.json', 'r') as f:
    transforms = json.load(f)

with open('src/components/icons/DietIcon.jsx', 'r', encoding='utf-8') as f:
    original = f.read()

# Extract each icon's inner SVG content
pattern = r'(\w+):\s*\(\s*<svg\s+[^>]*>([\s\S]*?)<\/svg>\s*\)'
matches = re.findall(pattern, original)

icon_iners = {}
for name, inner in matches:
    icon_iners[name] = inner.strip()

# Handle aliases
alias_pattern = r'icons\.(\w+)\s*=\s*icons\.(\w+)'
for alias, target in re.findall(alias_pattern, original):
    if target in icon_iners and alias not in icon_iners:
        icon_iners[alias] = icon_iners[target]

# Icons that use stroke
STROKE_ICONS = {
    'veggie': {'stroke_width': '1.8'},
    'nodairy': {'stroke_width': '2.2'},
    'milk': {'stroke_width': '2.2'},
    'lactose': {'stroke_width': '2.2'},
    'nogluten': {'stroke_width': '2.2'},
    'wheat': {'stroke_width': '2.2'},
    'keto': {'stroke_width': '1.5'},
}

def process_inner(inner, name):
    if name not in STROKE_ICONS:
        return inner
    sw = STROKE_ICONS[name]['stroke_width']
    def add_attrs(match):
        tag = match.group(0)
        if 'vectorEffect' in tag or 'vector-effect' in tag:
            return tag
        tag = tag.rstrip('>')
        tag = re.sub(r'stroke-width\s*=\s*[\'"{][^\'"}]*[\'"}]', f'strokeWidth="{sw}" vectorEffect="non-scaling-stroke"', tag)
        tag = re.sub(r'strokeWidth\s*=\s*[\'"{][^\'"}]*[\'"}]', f'strokeWidth="{sw}" vectorEffect="non-scaling-stroke"', tag)
        if 'strokeWidth' not in tag and 'stroke-width' not in tag and ('stroke="currentColor"' in tag or 'stroke={' in tag):
            tag += f' strokeWidth="{sw}" vectorEffect="non-scaling-stroke"'
        elif ('strokeWidth' in tag or 'stroke-width' in tag) and 'vectorEffect' not in tag:
            tag += ' vectorEffect="non-scaling-stroke"'
        tag += '>'
        return tag
    inner = re.sub(r'<(path|line|polyline|polygon|circle|ellipse|rect)([^>]*stroke\s*=\s*[\'"][^\'"]+[\'"][^>]*)>', add_attrs, inner)
    inner = re.sub(r'<(path|line|polyline|polygon|circle|ellipse|rect)([^>]*strokeWidth\s*=\s*[\'"{][^\'"}]*[\'"}"][^>]*)>', add_attrs, inner)
    inner = re.sub(r'<(path|line|polyline|polygon|circle|ellipse|rect)([^>]*stroke-width\s*=\s*[\'"{][^\'"}]*[\'"}"][^>]*)>', add_attrs, inner)
    return inner

# Simple approach: wrap original inner content in normalization <g>, keep any inner <g> as-is
# This creates nested <g> which is valid SVG and correctly composes transforms
icon_entries = []

for name in sorted(transforms.keys()):
    if name not in icon_iners:
        print(f"Warning: {name} not found")
        continue
    
    t = transforms[name]
    scale = t['scale']
    tx = t['translateX']
    ty = t['translateY']
    
    inner = process_inner(icon_iners[name], name)
    norm_transform = f'translate({tx:.6f} {ty:.6f}) scale({scale:.6f})'
    
    # Just wrap in normalization transform - keep inner structure intact
    # This creates: <g transform="norm"><original inner content></g>
    g_content = f'<g transform="{norm_transform}">\n{inner.strip()}\n</g>'
    
    indented_content = '\n'.join('          ' + line for line in g_content.split('\n'))
    
    entry = f'''    {name}: (
      <svg
        width={{w}}
        height={{h}}
        viewBox="0 0 100 100"
        fill="currentColor"
        aria-hidden="true"
      >
{indented_content}
      </svg>
    )'''
    
    icon_entries.append(entry)

new_icons_object = ',\n'.join(icon_entries)

new_content = f'''export function DietIcon({{ name, size = 24 }}) {{
  const w = size,
    h = size
  const icons = {{
{new_icons_object}
  }}
  icons.tree_nuts = icons.tree_nuts || icons.nuts
  icons.peanuts = icons.peanuts || icons.peanut
  icons.eggs = icons.eggs || icons.egg
  icons.lactose = icons.nodairy
  icons.nutrition = icons.celery
  icons.science = icons.sulfites
  const svg = icons[name] || null
  if (!svg) return null
  return (
    <span
      style={{{{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        lineHeight: 1,
        overflow: 'visible',
      }}}}
    >
      {{svg}}
    </span>
  )
}}
'''

with open('src/components/icons/DietIcon.jsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Written new DietIcon.jsx (nested transform approach)")