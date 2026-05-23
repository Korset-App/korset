const fs = require('fs');
const path = 'src/screens/ProfileScreen.jsx';
let content = fs.readFileSync(path, 'utf8');

// Change 1: Add refs + useEffect after notificationsExpanded, before pushBusy
content = content.replace(
  '  const [notificationsExpanded, setNotificationsExpanded] = useState(false)\r\n  const [pushBusy, setPushBusy] = useState(false)',
  `  const [notificationsExpanded, setNotificationsExpanded] = useState(false)

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

  const [pushBusy, setPushBusy] = useState(false)`
);

// Change 2: Guest backdrop button - onClick={() => setAuthPromptOpen(true)}
content = content.replace(
  'onClick={() => setAuthPromptOpen(true)}',
  `onClick={() => { try { window.history.pushState({ _profileInternal: true, _key: 'auth' }, '', window.location.pathname + window.location.search) } catch (e) { /* noop */ }; setAuthPromptOpen(true) }}`
);

// Change 3: Avatar guest button - setAuthPromptOpen(true) (with specific indentation to be unique)
content = content.replace(
  '                    setAuthPromptOpen(true)\r\n                  }}',
  `                    try { window.history.pushState({ _profileInternal: true, _key: 'auth' }, '', window.location.pathname + window.location.search) } catch (e) { /* noop */ }; setAuthPromptOpen(true)
                  }}`
);

// Change 4: onAuthPrompt={() => setAuthPromptOpen(true)}
content = content.replace(
  'onAuthPrompt={() => setAuthPromptOpen(true)}',
  `onAuthPrompt={() => { try { window.history.pushState({ _profileInternal: true, _key: 'auth' }, '', window.location.pathname + window.location.search) } catch (e) { /* noop */ }; setAuthPromptOpen(true) }}`
);

// Change 5: onTabChange={setActiveTab}
content = content.replace(
  '              onTabChange={setActiveTab}',
  `              onTabChange={(tab) => { if (tab && !activeTab) { try { window.history.pushState({ _profileInternal: true, _key: 'tab' }, '', window.location.pathname + window.location.search) } catch (e) { /* noop */ } } setActiveTab(tab) }}`
);

// Change 6: onClick: () => setSupportOpen(true),
content = content.replace(
  '                  onClick: () => setSupportOpen(true),',
  `                  onClick: () => { try { window.history.pushState({ _profileInternal: true, _key: 'support' }, '', window.location.pathname + window.location.search) } catch (e) { /* noop */ }; setSupportOpen(true) },`
);

fs.writeFileSync(path, content, 'utf8');
console.log('All 6 changes applied successfully.');
