const fs = require("fs");
let c = fs.readFileSync("src/screens/LandingScreen.jsx", "utf8");

// Add videoModalOpen state (after useState declarations)
c = c.replace(
  "const [activeFaq, setActiveFaq] = useState(null)",
  "const [activeFaq, setActiveFaq] = useState(null)\n  const [videoModalOpen, setVideoModalOpen] = useState(false)"
);

// Add Escape key and body scroll lock effects for video modal (before the popstate handler)
c = c.replace(
  "useEffect(() => {\n    const onPop = () => {\n      setMenuOpen(false)\n      setActiveFaq(null)\n      setActiveFeatureTab(0)\n    }\n    window.addEventListener('popstate', onPop)\n    return () => window.removeEventListener('popstate', onPop)\n  }, [])",
  "useEffect(() => {\n    if (videoModalOpen) {\n      document.body.style.overflow = 'hidden'\n      const onKey = (e) => { if (e.key === 'Escape') setVideoModalOpen(false) }\n      window.addEventListener('keydown', onKey)\n      return () => {\n        document.body.style.overflow = ''\n        window.removeEventListener('keydown', onKey)\n      }\n    }\n  }, [videoModalOpen])\n\n  useEffect(() => {\n    const onPop = () => {\n      setMenuOpen(false)\n      setActiveFaq(null)\n      setActiveFeatureTab(0)\n      setVideoModalOpen(false)\n    }\n    window.addEventListener('popstate', onPop)\n    return () => window.removeEventListener('popstate', onPop)\n  }, [])"
);

// Make video play button functional
c = c.replace(
  '<button className="lp-video__play-btn" aria-label={d.video.play}>',
  '<button className="lp-video__play-btn" aria-label={d.video.play} onClick={() => { window.history.pushState(null, \'\'); setVideoModalOpen(true) }}>'
);

// Add video modal before the closing fragment (before </main>)
const videoModal = `
      {videoModalOpen && (
        <div className="lp-video-modal" role="dialog" aria-modal="true" aria-label={d.video.play} onClick={(e) => { if (e.target === e.currentTarget) setVideoModalOpen(false) }}>
          <div className="lp-video-modal__inner">
            <button className="lp-video-modal__close" aria-label="Close" onClick={() => setVideoModalOpen(false)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <video
              className="lp-video-modal__video"
              src="/here_video.mp4"
              controls
              autoPlay
              playsInline
              poster="/landing/video_thumb.png"
            />
          </div>
        </div>
      )}
    </main>`;

c = c.replace("    </main>", videoModal);

fs.writeFileSync("src/screens/LandingScreen.jsx", c);
console.log("Done");
