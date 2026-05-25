const fs = require("fs");
let c = fs.readFileSync("src/screens/LandingScreen.jsx", "utf8");

// Remove the useCallback import that was accidentally added
c = c.replace(
  "import { useCallback, useEffect, useMemo, useRef, useState } from 'react'",
  "import { useEffect, useMemo, useRef, useState } from 'react'"
);

// Add useTheme import
c = c.replace(
  "import { Helmet } from 'react-helmet-async'",
  "import { Helmet } from 'react-helmet-async'\nimport { useTheme } from '../utils/theme.js'"
);

// Add useTheme hook (after other hooks)
c = c.replace(
  "const [activeFaq, setActiveFaq] = useState(null)",
  "const [activeFaq, setActiveFaq] = useState(null)\n  const { theme, toggleTheme } = useTheme()"
);

// Add theme toggle button in header actions (before the stores CTA)
c = c.replace(
  '<div className="lp-header__actions">\n            <a className="lp-btn lp-btn--primary lp-btn--sm" href="/stores">',
  '<div className="lp-header__actions">\n            <button className="lp-theme-toggle" onClick={toggleTheme} aria-label={d.nav.themeToggle} title={d.nav.themeToggle}>\n              {theme === "light" ? (\n                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">\n                  <path d="M9 2.25v1.5M9 14.25v1.5M2.25 9h1.5M14.25 9h1.5M4.23 4.23l1.06 1.06M12.71 12.71l1.06 1.06M4.23 13.77l1.06-1.06M12.71 5.29l1.06-1.06" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />\n                  <circle cx="9" cy="9" r="3.75" stroke="currentColor" strokeWidth="1.5" />\n                </svg>\n              ) : (\n                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">\n                  <path d="M15.2 9.84A6 6 0 0 1 8.16 2.8 6 6 0 1 0 15.2 9.84z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />\n                </svg>\n              )}\n            </button>\n            <a className="lp-btn lp-btn--primary lp-btn--sm" href="/stores">'
);

fs.writeFileSync("src/screens/LandingScreen.jsx", c);
console.log("Done");
