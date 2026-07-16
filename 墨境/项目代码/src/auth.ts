import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { verifyPassword } from '@/lib/db/auth-store'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    // Google OAuth —— 需要真实凭据（AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET）
    // 当 .env.local 中为 placeholder 时，NextAuth 自动跳过不可用 provider
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    // 邮箱+密码 fallback —— 不依赖任何第三方服务
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: '邮箱', type: 'email' },
        password: { label: '密码', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const email = credentials.email as string
        const password = credentials.password as string
        const user = await verifyPassword(email, password)
        if (!user) return null
        if (user.banned) return null
        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth }) {
      // 路由保护由 middleware.ts 统一处理，此处只需确认 session 有效
      return true
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
      }
      return session
    },
  },
})
