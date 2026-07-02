import { useState } from 'react'

export type Theme = 'dark' | 'light'
const KEY = 'adspro-theme'

export function getTheme(): Theme {
  return (localStorage.getItem(KEY) as Theme) || 'dark' // default: escuro (preserva o atual)
}

export function applyTheme(t: Theme): void {
  document.documentElement.classList.toggle('dark', t === 'dark')
  localStorage.setItem(KEY, t)
}

export function initTheme(): void {
  const q = new URLSearchParams(window.location.search).get('theme')
  if (q === 'light' || q === 'dark') { applyTheme(q); return }
  applyTheme(getTheme())
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getTheme())
  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    setTheme(next)
  }
  return { theme, toggle }
}
