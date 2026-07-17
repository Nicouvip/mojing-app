'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { getProjects, getChapters, getAllSubscriptions } from '@/lib/db/store'
import { getAllChapterReports } from '@/lib/ai/report-store'
import { FileText, BookOpen, Users, Crown } from 'lucide-react'
import type { ReactNode } from 'react'

export default function StatsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [totalChs, setTotalChs] = useState(0)
  const [totalWords, setTotalWords] = useState(0)
  const [reportCount, setReportCount] = useState(0)
  const [subBreakdown, setSubBreakdown] = useState({ free: 0, pro: 0, admin: 0 })
  useEffect(() => {
    const ps = getProjects(); setProjects(ps)
    let chs = 0; let wds = 0
    ps.forEach((p: any) => { const ch = getChapters(p.id); chs += ch.length; wds += ch.reduce((s: number,c: any)=>s+(c.wordCount||0),0) })
    setTotalChs(chs); setTotalWords(wds)
    let rpts = 0
    ps.forEach((p: any) => { const rs = getAllChapterReports(p.id); rpts += rs.length })
    setReportCount(rpts)
    const subs = getAllSubscriptions()
    const counts = { free: 0, pro: 0, admin: 0 }
    for (const sub of Object.values(subs)) { const p = (sub as {plan:string}).plan; if (p === 'free' || p === 'pro' || p === 'admin') counts[p]++ }
    setSubBreakdown(counts)
  }, [])

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold mb-6">统计报表</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<FileText className="w-5 h-5 text-blue-500" />} label="总作品数" value={projects.length} />
        <StatCard icon={<BookOpen className="w-5 h-5 text-green-500" />} label="总章节数" value={totalChs} />
        <StatCard icon={<Users className="w-5 h-5 text-purple-500" />} label="总字数" value={totalWords.toLocaleString()} />
        <StatCard icon={<Users className="w-5 h-5 text-amber-500" />} label="质量报告" value={reportCount} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={<Crown className="w-5 h-5 text-gray-400" />} label="免费用户" value={subBreakdown.free} />
        <StatCard icon={<Crown className="w-5 h-5 text-amber-400" />} label="创作者" value={subBreakdown.pro} />
        <StatCard icon={<Crown className="w-5 h-5 text-red-400" />} label="管理员" value={subBreakdown.admin} />
      </div>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-6 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">{icon}</div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}
