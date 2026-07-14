'use client'
import Navbar from '@/components/navbar'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function LibrarySettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
        <Link href="/library" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> 返回素材库
        </Link>
        <h1 className="text-2xl font-bold mb-3">素材库设置</h1>
        <p className="text-muted-foreground mb-6">功能开发中，敬请期待。</p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-sm text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
          正在建设中
        </div>
      </div>
    </div>
  )
}
