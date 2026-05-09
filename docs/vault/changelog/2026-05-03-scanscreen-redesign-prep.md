# 2026-05-03 — ScanScreen redesign prep

> Связи: [[v1-zero-friction-and-light-premium-2026-04-26]] · [[product-resolution]]

## Summary

User provided a light-theme ScanScreen visual reference and custom SVG icons. The redesign itself is not implemented yet; this note preserves the first safe preparation step.

## Completed

- Replaced gallery Material Symbol with an inline SVG component.
- Added torch off/on inline SVG variants using `currentColor`.
- Added compare inline SVG with mirrored active state for pressed/active feedback.
- Added a history SVG placeholder for the upcoming manual/recent action.
- Added a filled camera-switch SVG variant for future pressed-state animation.

## Constraints for the redesign

- Preserve scanner logic and product lookup behavior.
- Keep all new UI adaptive for different phone sizes.
- Support both light and dark themes using existing CSS variables.
- Match the project typography rhythm, especially the profile title scale/weight.
- Use the reference image as visual direction, not fixed pixel-perfect dimensions.

## Verification

- `npm run build` — passed.
- `npm run lint` — passed with warnings only.

## Minimal scan-line polish

- Reduced the strong blur/glow around the moving scanner line after user feedback.
- Kept the line white and premium, but made the tail much smaller and CSS-only for weaker phones.
- Verification after this polish:
  - `npm run build` — passed.
  - `node scripts/check-i18n.mjs` — passed.
  - `npm run lint` — passed with warnings only.

## 2026-05-04 frame and camera toggle polish

- Raised the central scan frame slightly so it sits visually higher in the live camera composition.
- Kept the hint aligned with the raised frame.
- Changed the camera switch icon fill from a temporary press flash to a persistent toggle:
  - filled while the selected camera index is not the first camera;
  - unfilled after switching back to the first camera.
- Verification:
  - `npm run build` — passed.
  - `npm run lint` — passed with warnings only.

## 2026-05-04 permission and manual EAN UX polish

- Improved the camera permission-denied state:
  - explains that the user did not grant camera access;
  - explains camera use is safe and only for barcode scanning;
  - advises reopening the screen/browser permission flow when needed;
  - keeps Retry and Gallery fallback actions available.
- Improved manual EAN entry:
  - stores only raw digits;
  - limits input to 13 digits;
  - displays grouped digits for readability;
  - shows a small helper/counter explaining that valid EAN is 8 or 13 digits.
- Added RU/KZ i18n keys for the new permission and manual helper copy.
- Verification:
  - `npm run build` — passed.
  - `node scripts/check-i18n.mjs` — passed.
  - `npm run lint` — passed with warnings only.

---

# 2026-05-03 — ScanScreen V1 redesign implemented

## Summary

The ScanScreen redesign moved from icon preparation to a production V1 implementation. The screen is now a full-screen scanner experience with live camera as the background, adaptive glass UI controls, manual barcode entry, recent scans, and a scoped two-product compare flow.

## Completed

- Rebuilt the ScanScreen layout into componentized React helpers plus `src/screens/ScanScreen.css`.
- Preserved live `html5-qrcode` scanning while replacing the old inline-style panel UI with a full-screen camera stage.
- Added adaptive scan frame, animated scan line, focus flash, success flash, loading/error overlays, and glass action dock.
- Added bottom-sheet UX for one-time compare guidance, stored with `localStorage` key `korset_compare_scan_hint_seen`.
- Added recent scans bottom sheet from local recent scan storage.
- Implemented V1 compare scope for exactly two products:
  - first scan pins product A inside the scanner;
  - second scan pins product B;
  - user taps explicit compare CTA to navigate to CompareScreen.
- Added keyboard-aware manual input lift using `visualViewport`.
- Added RU/KZ locale keys for all new scan texts.

## Scanner reliability improvements

- Reduced scanner fps from 25 to 15 to lower load on weak phones.
- Replaced fixed qrbox with dynamic sizing based on camera viewport.
- Added camera-start fallback sequence: exact selected device, plain device id, ideal environment, environment, user, first camera id.
- Added stale-start guard with `startSeqRef` so React StrictMode or slow async camera startup cannot leave duplicate streams.
- Set scanner video host to `pointer-events: none` so camera internals cannot block UI controls.
- Raised ScanScreen above BottomNav to avoid bottom-sheet and action click interception.
- Added CSS fallbacks around `color-mix()` and `backdrop-filter` for weaker/older browsers.

## Verification

- `npm run build` — passed.
- `npm run lint` — passed with warnings only.
- `node scripts/check-i18n.mjs` — passed.
- Playwright fake-camera smoke check:
  - one active video stream;
  - scanner frame/action dock rendered;
  - compare hint opens;
  - recent scans sheet opens;
  - BottomNav no longer overlays ScanScreen.

## Follow-up polish in the same session

- Manual EAN input now matches the reference mockup more closely:
  - empty state shows only the manual input and recent/history button;
  - submit arrow appears only after the user enters digits.
- Added a non-permission camera failure recovery overlay:
  - Retry starts camera again;
  - Gallery remains available as a fallback.
- RU scan title changed to "Сканирование" to match the provided reference direction.
- Added `scan.cameraErrorBody` in RU/KZ locales.
- Re-ran verification:
  - `npm run build` — passed;
  - `npm run lint` — passed with warnings only;
  - `node scripts/check-i18n.mjs` — passed;
  - Playwright fake-camera check confirmed one stream, no submit button in empty manual state, submit appears after EAN input, and compare hint opens.

## Real-device feedback fixes

User tested on a real phone and reported final V1 polish issues. Fixed in the same ScanScreen iteration:

- Removed the unwanted horizontal line inside the scan frame by deleting the `.scan-frame::before` visual rule.
- Reworked the scan line:
  - white/glass visual instead of purple;
  - lightweight glow/tail effect using CSS only;
  - movement is constrained to frame height with `calc(var(--scan-frame-h) - 4px)`;
  - no heavy canvas/JS animation.
- Restored BottomNav visibility on ScanScreen:
  - `.scan-screen` now sits below BottomNav;
  - scanner controls are lifted above nav using `--scan-nav-space`.
- Improved compare hint sheet:
  - shorter two-step copy;
  - solid/opaque sheet;
  - positioned above nav, not over broken transparent layers.
- Improved recent scans sheet:
  - solid/opaque panel;
  - above nav;
  - verified with KZ locale and a mock recent scan.
- Added transient filled center state to camera-switch icon after tapping the camera switch button.
- Corrected KZ scan copy:
  - `scan.recentScans`: "Жақында сканерленгендер";
  - `scan.manualInputPlaceholder`: "Штрих-кодты қолмен теру".

Verification:

- `node scripts/check-i18n.mjs` — passed.
- Playwright fake-camera checks:
  - BottomNav visible;
  - frame before-line removed;
  - scan line is white;
  - one video stream;
  - compare hint short and solid;
  - KZ recent/manual texts correct.
- `npm run build` — passed.
- `npm run lint` — passed with warnings only.
