const fs = require('fs');
const filePath = 'src/screens/ProfileScreen.jsx';
const content = fs.readFileSync(filePath, 'utf8');
const idx = content.indexOf('notificationsExpanded');
if (idx === -1) { console.log('NOT FOUND'); process.exit(1); }
const line = content.substring(idx - 5, idx + 200);
const hex = Buffer.from(line).toString('hex');
console.log('LINE HEX:', hex);
</parameter>
<昭parameter name="filePath" string="true">C:\projects\korset\tmp-hex.cjs</昭parameter>
</parameter>
<接parameter name="filePath" string="true">C:\projects\korset\tmp-hex.cjs</接parameter>
