export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'playlist-gen:theme'

export function getStoredTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return 'system'
}

export function setStoredTheme(theme: Theme): void {
  if (theme === 'system') {
    localStorage.removeItem(STORAGE_KEY)
  } else {
    localStorage.setItem(STORAGE_KEY, theme)
  }
}

function getSystemPreference(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(resolved: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', resolved === 'dark')
}

export function resolveTheme(theme: Theme): 'light' | 'dark' {
  return theme === 'system' ? getSystemPreference() : theme
}

export function initTheme(): () => void {
  const theme = getStoredTheme()
  applyTheme(resolveTheme(theme))

  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = () => {
    if (getStoredTheme() === 'system') {
      applyTheme(getSystemPreference())
    }
  }
  mq.addEventListener('change', handler)
  return () => mq.removeEventListener('change', handler)
}

export function setTheme(theme: Theme): void {
  setStoredTheme(theme)
  applyTheme(resolveTheme(theme))
}
