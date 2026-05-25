const fs = require("fs");
let css = fs.readFileSync("src/screens/LandingScreen.css", "utf8");

const themeToggleCSS = `

/* ───────── Theme Toggle ───────── */

.lp-theme-toggle {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--lp-fg-soft);
  cursor: pointer;
  transition: background var(--lp-dur-fast) var(--lp-ease), border-color var(--lp-dur-fast) var(--lp-ease), color var(--lp-dur-fast) var(--lp-ease);
}

.lp-theme-toggle:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.24);
  color: var(--lp-fg);
}

.lp-theme-toggle:focus-visible {
  outline: 2px solid var(--lp-brand-glow);
  outline-offset: 3px;
}

@media (max-width: 1023px) {
  .lp-theme-toggle {
    width: 36px;
    height: 36px;
    border-radius: 10px;
  }
}
`;

fs.writeFileSync("src/screens/LandingScreen.css", css + themeToggleCSS);
console.log("Done");
