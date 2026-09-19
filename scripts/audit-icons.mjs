import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      if (!['node_modules', '.git', 'dist', 'build'].includes(file)) {
        results = results.concat(walk(full));
      }
    } else if (/\.(jsx|js|html)$/.test(file)) {
      results.push(full);
    }
  }
  return results;
}

const files = walk('./src');
const iconCounts = {};
const iconLocations = {};

// Match both static icon names and JSX expressions
const regex = /<span[^>]*className=["'][^"']*material-symbols-outlined[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi;

for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  let match;
  while ((match = regex.exec(content)) !== null) {
    const raw = match[1].trim();
    if (/^[a-z0-9_]+$/.test(raw)) {
      iconCounts[raw] = (iconCounts[raw] || 0) + 1;
      if (!iconLocations[raw]) iconLocations[raw] = [];
      const rel = path.relative('.', f);
      if (!iconLocations[raw].includes(rel)) iconLocations[raw].push(rel);
    } else {
      // Dynamic or expression
      const key = `[DYNAMIC: ${raw.slice(0, 30)}]`;
      iconCounts[key] = (iconCounts[key] || 0) + 1;
    }
  }
}

console.log('Total unique static icons:', Object.keys(iconCounts).filter(k => !k.startsWith('[DYNAMIC')).length);
console.log('Top 30 static icons:');
const sorted = Object.entries(iconCounts).sort((a,b) => b[1] - a[1]);
for (const [icon, count] of sorted.slice(0, 30)) {
  console.log(`  ${icon.padEnd(25)} : ${count} times (in ${iconLocations[icon]?.length || 0} files)`);
}
