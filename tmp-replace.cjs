const fs = require('fs');

const filePath = 'src/screens/ProfileScreen.jsx';
const content = fs.readFileSync(filePath, 'utf8');

const oldStr = '  const [notificationsExpanded, setNotificationsExpanded] = useState(false)\n  const [pushBusy, setPushBusy] = useState(false)';
const newStr = '  const [notificationsExpanded, setNotificationsExpanded] = useState(false)\n\n  const activeTabRef = useRef(activeTab)\n  activeTabRef.current = activeTab\n  const authPromptOpenRef = useRef(authPromptOpen)\n  authPromptOpenRef.current = authPromptOpen\n  const supportOpenRef = useRef(supportOpen)\n  supportOpenRef.current = supportOpen\n\n  useEffect(() => {\n    const handlePopState = () => {\n      if (authPromptOpenRef.current) {\n        setAuthPromptOpen(false)\n      } else if (supportOpenRef.current) {\n        setSupportOpen(false)\n      } else if (activeTabRef.current) {\n        setActiveTab(null)\n      }\n    }\n    window.addEventListener(\'popstate\', handlePopState)\n    return () =\u003e window.removeEventListener(\'popstate\', handlePopState)\n  }, [])\n\n  const [pushBusy, setPushBusy] = useState(false)';

if (content.indexOf(oldStr) === -1) {
  const idx = content.indexOf('notificationsExpanded');
  console.log('OLD STRING NOT FOUND. Found at:', idx);
  console.log('Nearby:', JSON.stringify(content.substring(idx - 5, idx + 80)));
  process.exit(1);
}

const updated = content.replace(oldStr, newStr);
fs.writeFileSync(filePath, updated, 'utf8');
console.log('Done - replaced successfully');
</parameter>
<parameter name="filePath" string="true">C:\projects\korset\tmp-replace.cjs</parameter>
