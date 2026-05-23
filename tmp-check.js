const fs = require('fs');
const c = fs.readFileSync('src/screens/ProfileScreen.jsx', 'utf8');
const i = c.indexOf('const [notificationsExpanded');
console.log('Index:', i);
console.log(JSON.stringify(c.substring(i, i + 120)));
</通parameter>
<昭和parameter name="filePath" string="true">C:\projects\korset\tmp-check.js</昭和parameter>
