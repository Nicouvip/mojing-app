'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { X, Sparkles, Play } from 'lucide-react'

export interface DesignedVoice {
  id: string
  name: string
  desc: string
  audioBase64: string
}

interface VoiceDesignModalProps {
  open: boolean
  onClose: () => void
  designedVoices: DesignedVoice[]
  onVoiceDesigned: (voice: DesignedVoice) => void
  onUseVoice: (voiceId: string) => void
}

const QUICK_TEMPLATES = [
  { icon: '👨', label: '青年男性', desc: '年轻男性，声音清亮，充满活力' },
  { icon: '👨', label: '中年男性', desc: '中年男性，声音低沉稳重，适合长辈' },
  { icon: '👨', label: '老年男性', desc: '老年男性，声音苍老但有力量，适合智者' },
  { icon: '👧', label: '青年女性', desc: '年轻女性，声音甜美，充满活力' },
  { icon: '👩', label: '中年女性', desc: '中年女性，声音温暖，有母性的光辉' },
  { icon: '👵', label: '老年女性', desc: '老年女性，声音慈祥，像是在讲睡前故事' },
  { icon: '👶', label: '儿童', desc: '八岁的小男孩，声音稚嫩，充满好奇心' },
  { icon: '🎙️', label: '旁白', desc: '专业旁白，声音沉稳，语速适中，适合有声书' },
]

function playPreview(base64: string, mime: string) {
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  const blob = new Blob([bytes], { type: mime })
  const url = URL.createObjectURL(blob)
  const audio = new Audio(url)
  audio.play()
}

export function VoiceDesignModal({
  open,
  onClose,
  designedVoices,
  onVoiceDesigned,
  onUseVoice,
}: VoiceDesignModalProps) {
  const [designDesc, setDesignDesc] = useState('')
  const [designText, setDesignText] = useState('你好，这是音色预览。')
  const [designLoading, setDesignLoading] = useState(false)
  const [polishDescLoading, setPolishDescLoading] = useState(false)
  const [originalDesc, setOriginalDesc] = useState('')

  const handlePolishDesc = async () => {
    if (!designDesc.trim()) { toast.error('请先输入音色描述'); return }
    setOriginalDesc(designDesc)
    setPolishDescLoading(true)
    try {
      const res = await fetch('/api/audiobook/voices/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: designDesc }),
      })
      const data = await res.json()
      if (data.success && data.polished) {
        setDesignDesc(data.polished)
      } else {
        toast.error('润色失败：' + (data.error || '未知错误'))
      }
    } catch (err) {
      toast.error('润色失败：' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setPolishDescLoading(false)
    }
  }

  const handleDesignVoice = async () => {
    if (!designDesc.trim()) { toast.error('请输入音色描述'); return }
    setDesignLoading(true)
    try {
      const res = await fetch('/api/audiobook/voices/design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: designDesc, text: designText }),
      })
      const data = await res.json()
      if (data.success && data.audio) {
        const id = `design-${Date.now()}`
        onVoiceDesigned({ id, name: designDesc.slice(0, 20), desc: designDesc, audioBase64: data.audio })
        playPreview(data.audio, 'audio/wav')
      } else {
        toast.error('设计失败：' + (data.error || '未知错误'))
      }
    } catch (err) {
      toast.error('设计失败：' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setDesignLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-overlay flex items-center justify-center z-[1000] modal-enter" onClick={onClose}>
      <div className="w-full max-w-[560px] bg-card rounded-xl p-6 shadow-modal max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[15px] font-semibold text-card-foreground m-0">
            <Sparkles className="inline h-4 w-4 mr-1" />设计新音色
          </h2>
          <button onClick={onClose} className="bg-transparent border-none cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {/* 快速模板 */}
          <div>
            <label className="block text-xs font-medium text-card-foreground mb-1.5">快速模板（点击填入）</label>
            <div className="grid grid-cols-4 gap-1.5">
              {QUICK_TEMPLATES.map(t => (
                <button key={t.label} onClick={() => setDesignDesc(t.desc)}
                  className="p-2 border border-border rounded-md text-center cursor-pointer bg-card hover:bg-muted transition-colors">
                  <div className="text-sm">{t.icon}</div>
                  <div className="text-[10px] font-medium text-card-foreground">{t.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-card-foreground mb-1">音色描述（1-4句）</label>
            <textarea value={designDesc} onChange={e => setDesignDesc(e.target.value)} placeholder="例：年轻女性，声音清亮，充满活力，适合旁白" className="w-full px-3 py-2 border border-border rounded-md text-[13px] text-card-foreground font-inherit min-h-[70px] resize-y box-border" />
            <button onClick={handlePolishDesc} disabled={polishDescLoading} className="mt-1.5 px-4 py-1.5 bg-[#8e63ce] border-none rounded-md text-xs font-medium text-white cursor-pointer font-inherit disabled:opacity-60 disabled:cursor-default transition-opacity">
              {polishDescLoading ? '⏳ 润色中...' : '✨ 润色描述'}
            </button>
          </div>

          {/* 润色前后对比 */}
          {originalDesc && originalDesc !== designDesc && (
            <div className="p-3 bg-muted/50 rounded-lg text-[11px]">
              <p className="font-medium text-card-foreground mb-1.5">✨ 润色对比</p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <p className="text-muted-foreground mb-0.5">原文：</p>
                  <p className="text-foreground leading-relaxed">{originalDesc}</p>
                </div>
                <div className="w-px bg-border" />
                <div className="flex-1">
                  <p className="text-primary mb-0.5">润色后：</p>
                  <p className="text-foreground leading-relaxed">{designDesc}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-card-foreground mb-1">预览文本</label>
            <input value={designText} onChange={e => setDesignText(e.target.value)} className="w-full px-3 py-2 border border-border rounded-md text-[13px] text-card-foreground font-inherit box-border" />
          </div>
          <button onClick={handleDesignVoice} disabled={designLoading} className="py-2.5 bg-primary border-none rounded-md text-[13px] font-medium text-white cursor-pointer font-inherit disabled:opacity-60 disabled:cursor-default hover:bg-primary-hover transition-all">
            {designLoading ? '⏳ 生成中...' : '🎵 生成并试听'}
          </button>

          {/* 已设计音色列表 */}
          {designedVoices.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-card-foreground mb-1.5">已设计音色（{designedVoices.length}）</label>
              <div className="space-y-1.5">
                {designedVoices.map(v => (
                  <div key={v.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-card-foreground truncate">{v.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{v.desc}</p>
                    </div>
                    <div className="flex gap-1 ml-2 shrink-0">
                      <button onClick={() => playPreview(v.audioBase64, 'audio/wav')}
                        className="w-6 h-6 flex items-center justify-center rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer border-none">
                        <Play className="w-3 h-3" />
                      </button>
                      <button onClick={() => onUseVoice(v.id)}
                        className="px-2 py-0.5 text-[10px] rounded bg-primary text-white hover:bg-primary-hover transition-colors cursor-pointer border-none font-inherit">
                        选用
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
