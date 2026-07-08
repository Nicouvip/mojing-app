'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils/utils'

const colorMap: Record<string, { badge: string; dot: string }> = {
  red: { badge: 'bg-red-100 text-red-600', dot: 'bg-red-400' },
  amber: { badge: 'bg-amber-100 text-amber-600', dot: 'bg-amber-400' },
  green: { badge: 'bg-primary-light text-primary', dot: 'bg-primary' },
  violet: { badge: 'bg-violet-100 text-violet-600', dot: 'bg-violet-400' },
  orange: { badge: 'bg-orange-100 text-orange-600', dot: 'bg-orange-400' },
  emerald: { badge: 'bg-emerald-100 text-emerald-600', dot: 'bg-emerald-400' },
  teal: { badge: 'bg-teal-100 text-teal-600', dot: 'bg-teal-400' },
  rose: { badge: 'bg-rose-100 text-rose-600', dot: 'bg-rose-400' },
}

interface Props {
  label: string
  description: string
  items: readonly string[]
  count?: number
  color: string
}

export function ComplianceSection({ label, description, items, count, color }: Props) {
  const [open, setOpen] = useState(false)
  const colors = colorMap[color] || colorMap.green
  const displayCount = count ?? items.length

  return (
    <Card className="transition-shadow hover:shadow-card">
      <CardContent className="p-0">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-secondary/30 transition-colors"
        >
          <span className={cn("w-2 h-2 rounded-full shrink-0", colors.dot)} />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-foreground">{label}</span>
            <span className={cn("ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-medium", colors.badge)}>
              {displayCount} 项
            </span>
          </div>
          {open ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
        </button>

        {open && (
          <div className="border-t border-border px-5 py-3">
            {description && <p className="text-xs text-muted-foreground mb-2">{description}</p>}
            <div className="flex flex-wrap gap-1.5">
              {items.map((item, i) => (
                <span
                  key={i}
                  className="inline-flex px-2 py-0.5 rounded-md bg-secondary text-xs text-muted-foreground font-mono"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
