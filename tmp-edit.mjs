const fs = require('fs');

const filePath = 'src/screens/ProfileScreen.jsx';
const content = fs.readFileSync(filePath, 'utf8');

const oldStr = '  const [notificationsExpanded, setNotificationsExpanded] = useState(false)\n  const [pushBusy, setPushBusy] = useState(false)';
const newStr = `  const [notificationsExpanded, setNotificationsExpanded] = useState(false)

  const activeTabRef = useRef(activeTab)
  activeTabRef.current = activeTab
  const authPromptOpenRef = useRef(authPromptOpen)
  authPromptOpenRef.current = authPromptOpen
  const supportOpenRef = useRef(supportOpen)
  supportOpenRef.current = supportOpen

  useEffect(() => {
    const handlePopState = () => {
      if (authPromptOpenRef.current) {
        setAuthPromptOpen(false)
      } else if (supportOpenRef.current) {
        setSupportOpen(false)
      } else if (activeTabRef.current) {
        setActiveTab(null)
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const [pushBusy, setPushBusy] = useState(false)`;

if (content.indexOf(oldStr) === -1) {
  console.log('OLD STRING NOT FOUND. Checking nearby content...');
  const idx = content.indexOf('notificationsExpanded');
  console.log('Found at:', idx);
  console.log('Nearby:', JSON.stringify(content.substring(idx - 5, idx + 80)));
  process.exit(1);
}

const updated = content.replace(oldStr, newStr);
fs.writeFileSync(filePath, updated, 'utf8');
console.log('Done - replaced successfully');
</parameter>
<parameter name="filePath" string="true">C:\projects\korset\tmp-edit.mjs</parameter>
