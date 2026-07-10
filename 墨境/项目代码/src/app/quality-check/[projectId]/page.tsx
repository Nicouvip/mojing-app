'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { QualityDashboard } from '@/components/quality-dashboard'
import { getProject } from '@/lib/db/store'
import type { Project } from '@/lib/db/types'

export default function ProjectQualityPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string
  const [project, setProject] = useState<Project | null>(null)

  useEffect(() => {
    const p = getProject(projectId)
    if (p) {
      setProject(p)
    } else {
      router.push('/quality-check')
    }
  }, [projectId, router])

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 h-14 px-6 flex items-center justify-between glass-panel border-b border-border">
        <div className="flex items-center gap-6">
          <Link href="/"><Image src="/assets/brand/mojing-logo-nav.png" alt="墨境" width={160} height={36} className="h-9 w-auto" priority /></Link>
          <Link href="/quality-check" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> 返回质检中心
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/editor/${projectId}`} className="text-xs text-muted-foreground hover:text-foreground">
            打开编辑器
          </Link>
        </div>
      </nav>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {project.genre} · 跨章质量趋势总览
          </p>
        </div>
        <QualityDashboard projectId={projectId} projectName={project.name} />
      </div>
    </div>
  )
}
