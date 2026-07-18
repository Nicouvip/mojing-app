'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

interface User {
  id: string
  name: string
  email: string
  avatar?: string
}

interface AuthState {
  user: User | null
  token: string | null
  isLoggedIn: boolean
  isGuest: boolean
  login: (user: User, token: string) => void
  logout: () => void
}

const GUEST_KEY = 'mojing_guest_id'
const AUTH_KEY = 'mojing_auth'

const AuthContext = createContext<AuthState>({
  user: null, token: null, isLoggedIn: false, isGuest: true,
  login: () => {}, logout: () => {},
})

export function useAuth() { return useContext(AuthContext) }

function readStored(): { user: User | null; token: string | null } {
  if (typeof window === 'undefined') return { user: null, token: null }
  try {
    const stored = localStorage.getItem(AUTH_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return { user: parsed.user || null, token: parsed.token || null }
    }
  } catch {}
  return { user: null, token: null }
}

/** 从 NextAuth session API 同步用户（Google登录/callback 回来自动同步） */
async function syncFromNextAuth(): Promise<{ user: User | null; token: string | null }> {
  try {
    const res = await fetch('/api/auth/session')
    const session = await res.json()
    if (session?.user?.email) {
      const user = { id: session.user.id || session.user.email, name: session.user.name || session.user.email.split('@')[0], email: session.user.email }
      localStorage.setItem(AUTH_KEY, JSON.stringify({ user, token: 'nextauth-session' }))
      return { user, token: 'nextauth-session' }
    }
  } catch {}
  return { user: null, token: null }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = readStored()
  const [user, setUser] = useState<User | null>(stored.user)
  const [token, setToken] = useState<string | null>(stored.token)
  const [guestId] = useState(() => {
    if (typeof window === 'undefined') return ''
    let id = localStorage.getItem(GUEST_KEY)
    if (!id) { id = 'guest_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8); localStorage.setItem(GUEST_KEY, id) }
    return id
  })

  // 如果 localStorage 无用户但 NextAuth session 有，自动同步
  useEffect(() => {
    if (!stored.user) {
      syncFromNextAuth().then(result => {
        if (result.user) { setUser(result.user); setToken(result.token) }
      })
    }
  }, [])

  const isLoggedIn = !!user && !!token

  const login = useCallback((u: User, t: string) => {
    setUser(u); setToken(t)
    try { localStorage.setItem(AUTH_KEY, JSON.stringify({ user: u, token: t })) } catch {}
  }, [])

  const logout = useCallback(() => {
    setUser(null); setToken(null)
    try { localStorage.removeItem(AUTH_KEY) } catch {}
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, isLoggedIn, isGuest: !isLoggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
