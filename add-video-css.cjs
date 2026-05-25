const fs = require("fs");
let css = fs.readFileSync("src/screens/LandingScreen.css", "utf8");

const videoModalCSS = `

/* ───────── Video Modal ───────── */

.lp-video-modal {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.88);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  animation: lp-fade-in var(--lp-dur) var(--lp-ease);
  padding: 20px;
}

.lp-video-modal__inner {
  position: relative;
  width: 100%;
  max-width: 960px;
  aspect-ratio: 16 / 9;
  border-radius: var(--lp-radius-lg);
  overflow: hidden;
  box-shadow: var(--lp-shadow-elevation);
  animation: lp-scale-in var(--lp-dur) var(--lp-ease);
}

.lp-video-modal__close {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 2;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  cursor: pointer;
  transition: background var(--lp-dur-fast) var(--lp-ease);
}

.lp-video-modal__close:hover {
  background: rgba(0, 0, 0, 0.8);
}

.lp-video-modal__video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #000;
}
`;

fs.writeFileSync("src/screens/LandingScreen.css", css + videoModalCSS);
console.log("Done");
