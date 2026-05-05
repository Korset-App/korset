import { useEffect } from 'react'

let sharedObserver = null
let observedNodes = new WeakSet()

function ensureObserver() {
  if (sharedObserver) return sharedObserver
  if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
    return null
  }
  sharedObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          sharedObserver.unobserve(entry.target)
        }
      }
    },
    {
      rootMargin: '0px 0px -10% 0px',
      threshold: 0.08,
    }
  )
  return sharedObserver
}

export function useReveal(rootRef) {
  useEffect(() => {
    const root = rootRef?.current ?? document
    const observer = ensureObserver()
    if (!observer) {
      const nodes = root.querySelectorAll(
        '.lp-reveal, .lp-reveal--scale, .lp-reveal--right, .lp-reveal--left'
      )
      nodes.forEach((n) => n.classList.add('is-visible'))
      return
    }
    const nodes = root.querySelectorAll(
      '.lp-reveal, .lp-reveal--scale, .lp-reveal--right, .lp-reveal--left'
    )
    nodes.forEach((node) => {
      if (!observedNodes.has(node)) {
        observer.observe(node)
        observedNodes.add(node)
      }
    })
    return () => {
      nodes.forEach((node) => {
        observer.unobserve(node)
        observedNodes.delete(node)
      })
    }
  }, [rootRef])
}

export default useReveal
