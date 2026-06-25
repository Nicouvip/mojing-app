'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { getProjects } from '@/lib/db/store'
import { FileText, BookOpen, Users } from 'lucide-react'

export default function StatsPage() {
  const [projects, setProjects] = useState<any[]>([])
  useEffect(() => { setProjects(getProjects()) }, [])

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold mb-6">统计报表</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<FileText className="w-5 h-5 text-blue-500" />} label="总作品数" value={projects.length} />
        <StatCard icon={<BookOpen className="w-5 h-5 text-green-500" />} label="总章节数" value="—" />
        <StatCard icon={<Users className="w-5 h-5 text-purple-500" />} label="总字数" value="—" />
        <StatCard icon={<Users className="w-5 h-5 text-amber-500" />} label="活跃用户" value={projects.length > 0 ? 1 : 0} />
      </div>
    </div>
  )
}

function StatCard({ icon, label, value }: any) {
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
