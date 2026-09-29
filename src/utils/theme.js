import { useEffect, useState } from 'react'

export const THEME_KEY = 'korset_theme'
export const THEMES = {
  light: 'light',
  dark: 'dark',
}

const THEME_COLORS = {
  light: '#F5F8FF',
  dark: '#07070F',
}

function isTheme(value) {
  return value === THEMES.light || value === THEMES.dark
}

export function getStoredTheme() {
  try {
    const value = localStorage.getItem(THEME_KEY)
    return isTheme(value) ? value : null
  } catch {
    return null
  }
}

export function getSystemTheme() {
  return THEMES.light
}

export function getInitialTheme() {
  return getStoredTheme() || THEMES.light
}

export function applyTheme(theme, { persist = false, animate = false } = {}) {
  const nextTheme = isTheme(theme) ? theme : THEMES.light
  if (typeof document === 'undefined') return nextTheme

  const root = document.documentElement

  if (animate) {
    root.classList.remove('theme-transition')
    void root.offsetWidth
    root.classList.add('theme-transition')
    window.setTimeout(() => root.classList.remove('theme-transition'), 820)
  }

  root.dataset.theme = nextTheme
  root.style.colorScheme = nextTheme

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', THEME_COLORS[nextTheme])

  if (persist) {
    try {
      localStorage.setItem(THEME_KEY, nextTheme)
    } catch {
      /* noop */
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('korset:theme-change', { detail: { theme: nextTheme } }))
  }
  return nextTheme
}

export function initializeTheme() {
  if (typeof document === 'undefined') return THEMES.light
  return applyTheme(getInitialTheme())
}

export function useTheme() {
  const [theme, setThemeState] = useState(() =>
    typeof document === 'undefined'
      ? THEMES.light
      : document.documentElement.dataset.theme || getInitialTheme()
  )

  useEffect(() => {
    const onThemeChange = (event) => setThemeState(event.detail?.theme || getInitialTheme())
    window.addEventListener('korset:theme-change', onThemeChange)
    return () => window.removeEventListener('korset:theme-change', onThemeChange)
  }, [])

  const setTheme = (nextTheme) => {
    const applied = applyTheme(nextTheme, { persist: true, animate: true })
    setThemeState(applied)
  }

  const toggleTheme = () => setTheme(theme === THEMES.dark ? THEMES.light : THEMES.dark)

  return { theme, setTheme, toggleTheme, isLight: theme === THEMES.light }
}
