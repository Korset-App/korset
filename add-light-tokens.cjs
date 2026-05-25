const fs = require("fs");
let tokens = fs.readFileSync("src/screens/landing/landing-tokens.css", "utf8");

const lightTokens = `
/* Light theme specific tokens */
:root[data-theme="light"] {
  --lp-bg: #f5f7fc;
  --lp-bg-elevated: #eef1f8;
  --lp-bg-card: rgba(255, 255, 255, 0.82);
  --lp-bg-card-strong: rgba(255, 255, 255, 0.92);

  --lp-fg: #0f1222;
  --lp-fg-soft: rgba(15, 18, 34, 0.82);
  --lp-fg-mute: rgba(15, 18, 34, 0.58);
  --lp-fg-faint: rgba(15, 18, 34, 0.38);
  --lp-fg-disabled: rgba(15, 18, 34, 0.22);

  --lp-border: rgba(0, 0, 0, 0.08);
  --lp-border-strong: rgba(124, 92, 255, 0.3);
  --lp-border-bright: rgba(0, 0, 0, 0.14);
  --lp-line: rgba(0, 0, 0, 0.05);

  --lp-gradient-fade: linear-gradient(180deg, transparent 0%, rgba(245, 247, 252, 0.92) 80%);

  --lp-shadow-card: 0 16px 48px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.04);
  --lp-shadow-card-hover: 0 24px 64px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(124, 92, 255, 0.4);
  --lp-shadow-elevation: 0 32px 80px rgba(0, 0, 0, 0.14);
}
`;

tokens = tokens.replace("}\n\n/* ───────── Keyframes ───────── */", "}" + lightTokens + "\n\n/* ───────── Keyframes ───────── */");

fs.writeFileSync("src/screens/landing/landing-tokens.css", tokens);
console.log("Done");
