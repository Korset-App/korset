import { useEffect } from 'react'

// The app scrolls inside .screen containers (body itself is overflow:hidden),
// so a scroll lock must freeze those too, not just html/body.
const SCREEN_SELECTOR = '.screen'

let lockCount = 0
let savedState = null

function acquireLock() {
  lockCount += 1
  if (lockCount > 1) return

  const html = document.documentElement
  const body = document.body
  savedState = {
    htmlOverflow: html.style.overflow,
    bodyOverflow: body.style.overflow,
    screens: Array.from(document.querySelectorAll(SCREEN_SELECTOR)).map((el) => ({
      el,
      overflow: el.style.overflow,
      touchAction: el.style.touchAction,
    })),
  }

  html.style.overflow = 'hidden'
  body.style.overflow = 'hidden'
  for (const item of savedState.screens) {
    item.el.style.overflow = 'hidden'
    item.el.style.touchAction = 'none'
  }
}

function releaseLock() {
  if (lockCount === 0) return
  lockCount -= 1
  if (lockCount > 0 || !savedState) return
  document.documentElement.style.overflow = savedState.htmlOverflow
  document.body.style.overflow = savedState.bodyOverflow
  for (const item of savedState.screens) {
    item.el.style.overflow = item.overflow
    item.el.style.touchAction = item.touchAction
  }
  savedState = null
}

export function useOverlayLock(active) {
  useEffect(() => {
    if (!active) return undefined
    acquireLock()
    return releaseLock
  }, [active])
}

export default useOverlayLock
