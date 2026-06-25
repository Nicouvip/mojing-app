import Link from 'next/link'
import { AdminSidebar } from './sidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 px-6 flex items-center justify-between border-b border-border bg-card/80 shrink-0">
          <h1 className="text-sm font-medium text-foreground">后台管理系统</h1>
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            ← 返回写作台
          </Link>
        </header>
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
