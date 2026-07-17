'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Users as UsersIcon, ShieldOff, ShieldCheck, Search } from 'lucide-react'
import { getAllSubscriptions, setUserSubscription } from '@/lib/db/store'
import type { UserPlan } from '@/lib/db/types'

interface User {
  id: string
  email: string
  name: string
  createdAt: number
  banned: boolean
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [subscriptions, setSubscriptions] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch('/api/admin/users')
      .then(res => res.json())
      .then(data => {
        setUsers(data.users || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))

    const subs = getAllSubscriptions()
    const planMap: Record<string, string> = {}
    for (const [email, sub] of Object.entries(subs)) {
      planMap[email] = sub.plan
    }
    setSubscriptions(planMap)
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return users
    const q = search.toLowerCase()
    return users.filter(u =>
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    )
  }, [users, search])

  const setPlan = (email: string, plan: UserPlan) => {
    setUserSubscription(email, {
      plan, startedAt: Date.now(),
      monthlyAiQuota: plan === 'free' ? 100 : 999999,
      monthlyAiUsed: 0,
    })
    setSubscriptions(prev => ({ ...prev, [email]: plan }))
  }

  const toggleBan = async (email: string, currentlyBanned: boolean) => {
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, banned: !currentlyBanned }),
    })
    if (res.ok) {
      setUsers(prev => prev.map(u =>
        u.email === email ? { ...u, banned: !currentlyBanned } : u
      ))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <UsersIcon className="w-5 h-5 text-muted-foreground" />
        <h1 className="text-lg font-semibold text-foreground">用户管理</h1>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="搜索用户名或邮箱..."
              className="w-full h-9 pl-9 pr-3 text-sm rounded-lg border border-border bg-background outline-none focus:border-primary transition-colors" />
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">加载中...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">{search ? '无匹配用户' : '暂无用户'}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 font-medium text-muted-foreground text-xs">用户名</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs">邮箱</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs">会员</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs">注册时间</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs">状态</th>
                    <th className="pb-2 font-medium text-muted-foreground text-xs">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u.id} className="border-b border-border/40 hover:bg-secondary/50 transition-colors">
                      <td className="py-2.5 font-medium text-foreground">{u.name}</td>
                      <td className="py-2.5 text-muted-foreground">{u.email}</td>
                      <td className="py-2.5">
                        <select value={subscriptions[u.email] || 'free'}
                          onChange={e => setPlan(u.email, e.target.value as UserPlan)}
                          className="text-xs px-2 py-1 rounded border border-border bg-background outline-none cursor-pointer">
                          <option value="free">免费</option>
                          <option value="pro">创作者</option>
                          <option value="admin">管理员</option>
                        </select>
                      </td>
                      <td className="py-2.5 text-muted-foreground text-xs">
                        {new Date(u.createdAt).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="py-2.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          u.banned ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                        }`}>
                          {u.banned ? '已禁用' : '正常'}
                        </span>
                      </td>
                      <td className="py-2.5">
                        <button onClick={() => toggleBan(u.email, u.banned)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors bg-secondary hover:bg-secondary/80 text-foreground">
                          {u.banned ? <><ShieldCheck className="w-3.5 h-3.5" /> 启用</> : <><ShieldOff className="w-3.5 h-3.5" /> 禁用</>}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
