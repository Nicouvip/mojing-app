import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "@/lib/utils/theme-context"
import { AuthProvider } from "@/lib/db/auth-context"
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: {
    default: "墨境 - 沉浸式小说写作",
    template: "%s | 墨境",
  },
  description: "墨境，一款极简优雅的小说写作工具。沉浸式编辑体验，让创作回归纯粹。",
  icons: { icon: '/assets/brand/mojing-icon.png' },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased font-sans bg-background text-foreground">
        <ThemeProvider><AuthProvider>{children}</AuthProvider></ThemeProvider>
        <Toaster position="bottom-right" />
      </body>
    </html>
  )
}
