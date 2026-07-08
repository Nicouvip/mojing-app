'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'warm' | 'cool'

interface ThemeCtx {
  theme: Theme
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeCtx>({ theme: 'light', setTheme: () => {} })

export function useTheme() { return useContext(ThemeContext) }

function readTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  try {
    const stored = localStorage.getItem('mojing_theme')
    return (stored === 'dark' || stored === 'warm' || stored === 'cool') ? stored : 'light'
  } catch { return 'light' }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readTheme)

  useEffect(() => {
    const root = document.documentElement
    root.className = root.className.replace(/theme-\w+|dark/g, '').trim()
    if (theme === 'dark') root.classList.add('dark')
    else if (theme !== 'light') root.classList.add('theme-' + theme)
  }, [theme])

  const apply = useCallback((t: Theme) => {
    setTheme(t)
    try { localStorage.setItem('mojing_theme', t) } catch {}
  }, [])

  return <ThemeContext.Provider value={{ theme, setTheme: apply }}>{children}</ThemeContext.Provider>
}
