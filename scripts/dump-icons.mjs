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
const iconMap = {};

const regex = /<span[^>]*className=["'][^"']*material-symbols-outlined[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi;

for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  let match;
  while ((match = regex.exec(content)) !== null) {
    const raw = match[1].trim();
    if (!iconMap[raw]) iconMap[raw] = [];
    const rel = path.relative('.', f).replace(/\\/g, '/');
    if (!iconMap[raw].includes(rel)) iconMap[raw].push(rel);
  }
}

console.log(JSON.stringify(iconMap, null, 2));
