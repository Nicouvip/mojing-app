'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/navbar'
import DeskSidebar from '@/components/desk-sidebar'
import { getProjects } from '@/lib/db/store'
import type { Project } from '@/lib/db/types'

/* ── 设计令牌 ── */
const C = {
  pri: '#c4956a',
  priDim: '#b08050',
  ink: '#1a1814',
  muted: 'rgba(26,24,20,.45)',
  line: 'rgba(26,24,20,.06)',
  paper: '#f5f2ed',
  sb: '#f5f2ed',
  card: '#fff',
  indigo: '#3a5279',
  crimson: '#b5454a',
  green: '#7a9e7a',
  radius: 8,
} as const

/* ── 音色预设 ── */
const VOICE_PRESETS = [
  { id: 'mimo-narrator-m', name: '云希', desc: '青年男声·旁白', gender: 'male', style: '旁白', icon: '🎤' },
  { id: 'mimo-narrator-f', name: '晓墨', desc: '青年女声·旁白', gender: 'female', style: '旁白', icon: '🎤' },
  { id: 'mimo-dialogue-m', name: '老周', desc: '中年男声·对话', gender: 'male', style: '对话', icon: '🗣️' },
  { id: 'mimo-dialogue-f', name: '小溪', desc: '少女声·对话', gender: 'female', style: '对话', icon: '🗣️' },
  { id: 'mimo-story-m', name: '沉渊', desc: '磁性男声·故事', gender: 'male', style: '故事', icon: '📖' },
  { id: 'mimo-story-f', name: '若雪', desc: '温柔女声·故事', gender: 'female', style: '故事', icon: '📖' },
]

export default function AudiobookPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [activeTab, setActiveTab] = useState<'projects' | 'voices' | 'settings'>('projects')
  const [showVoiceDesign, setShowVoiceDesign] = useState(false)
  const [showVoiceClone, setShowVoiceClone] = useState(false)

  useEffect(() => {
    const projs = getProjects()
    setProjects(projs)
    if (projs.length > 0) setSelectedProject(projs[0])
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: C.paper }}>
      <Navbar />
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
        <DeskSidebar active="/audiobook" />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          {/* ── 顶栏 ── */}
          <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', height: 56, borderBottom: `1px solid ${C.line}`, flexShrink: 0, gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>🎧</span>
              <h1 style={{ fontSize: 16, fontWeight: 600, color: C.ink, margin: 0 }}>有声书</h1>
            </div>
          </header>

          {/* ── Tab 切换 ── */}
          <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${C.line}`, padding: '0 28px', flexShrink: 0 }}>
            {[
              { key: 'projects' as const, label: '选择作品', icon: '📚' },
              { key: 'voices' as const, label: '音色管理', icon: '🎤' },
              { key: 'settings' as const, label: '生成设置', icon: '⚙️' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '12px 20px',
                  fontSize: 13,
                  fontWeight: activeTab === tab.key ? 600 : 400,
                  color: activeTab === tab.key ? C.pri : C.muted,
                  background: 'none',
                  border: 'none',
                  borderBottom: activeTab === tab.key ? `2px solid ${C.pri}` : '2px solid transparent',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── 内容区 ── */}
          <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>

            {/* ═══ 选择作品 Tab ═══ */}
            {activeTab === 'projects' && (
              <div>
                <div style={{ marginBottom: 20 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 600, color: C.ink, margin: '0 0 4px' }}>选择要生成有声书的作品</h2>
                  <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>选择一个作品，系统将自动分析文本并生成有声书</p>
                </div>

                {projects.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
                    <p style={{ fontSize: 14, color: C.muted, marginBottom: 16 }}>还没有作品</p>
                    <Link href="/desk" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 24px', background: C.pri, color: '#fff', borderRadius: 20, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
                      去创建作品
                    </Link>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                    {projects.filter(p => !p.deletedAt).map((project, i) => (
                      <div
                        key={project.id}
                        onClick={() => {
                          setSelectedProject(project)
                          router.push(`/audiobook/${project.id}`)
                        }}
                        style={{
                          padding: 20,
                          background: C.card,
                          border: `1px solid ${C.line}`,
                          borderRadius: C.radius,
                          cursor: 'pointer',
                          transition: 'all .15s',
                          position: 'relative',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = C.pri
                          e.currentTarget.style.boxShadow = '0 2px 12px rgba(196,149,106,.12)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = C.line
                          e.currentTarget.style.boxShadow = 'none'
                        }}
                      >
                        {/* 封面 */}
                        <div style={{
                          width: '100%',
                          height: 80,
                          borderRadius: 6,
                          background: `linear-gradient(135deg, ${['#e8dfd2', '#d9d4cb', '#cfc8bc', '#c4b090', '#b8a898'][i % 5]}, ${['#d5c8b5', '#c7bfb2', '#b8afa2', '#a88860', '#908070'][i % 5]})`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: 12,
                        }}>
                          <span style={{ fontSize: 24 }}>📖</span>
                        </div>

                        <h3 style={{ fontSize: 14, fontWeight: 600, color: C.ink, margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {project.name}
                        </h3>
                        <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>
                          {project.genre} · {project.chapterCount || 0} 章 · {(project.totalWords || 0).toLocaleString()} 字
                        </p>

                        {/* 进入按钮 */}
                        <div style={{
                          marginTop: 12,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          padding: '8px 0',
                          background: 'rgba(196,149,106,.08)',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 500,
                          color: C.pri,
                        }}>
                          <span>🎧</span>
                          生成有声书
                          <span style={{ fontSize: 10 }}>→</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ═══ 音色管理 Tab ═══ */}
            {activeTab === 'voices' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div>
                    <h2 style={{ fontSize: 15, fontWeight: 600, color: C.ink, margin: '0 0 4px' }}>音色管理</h2>
                    <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>管理有声书使用的音色，支持自定义设计和克隆</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setShowVoiceDesign(true)}
                      style={{
                        padding: '8px 16px',
                        background: C.card,
                        border: `1px solid ${C.line}`,
                        borderRadius: 6,
                        fontSize: 12,
                        color: C.ink,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <span>✨</span> 设计音色
                    </button>
                    <button
                      onClick={() => setShowVoiceClone(true)}
                      style={{
                        padding: '8px 16px',
                        background: C.pri,
                        border: 'none',
                        borderRadius: 6,
                        fontSize: 12,
                        color: '#fff',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <span>🎤</span> 克隆声音
                    </button>
                  </div>
                </div>

                {/* 预置音色列表 */}
                <h3 style={{ fontSize: 13, fontWeight: 600, color: C.ink, margin: '0 0 12px' }}>预置音色</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
                  {VOICE_PRESETS.map(voice => (
                    <div
                      key={voice.id}
                      style={{
                        padding: 16,
                        background: C.card,
                        border: `1px solid ${C.line}`,
                        borderRadius: C.radius,
                        cursor: 'pointer',
                        transition: 'all .15s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = C.pri
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = C.line
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <div style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: voice.gender === 'male' ? 'rgba(58,82,121,.1)' : 'rgba(181,69,74,.08)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 16,
                        }}>
                          {voice.icon}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{voice.name}</div>
                          <div style={{ fontSize: 11, color: C.muted }}>{voice.desc}</div>
                        </div>
                      </div>
                      <button
                        style={{
                          width: '100%',
                          padding: '6px 0',
                          background: 'rgba(196,149,106,.08)',
                          border: 'none',
                          borderRadius: 4,
                          fontSize: 11,
                          color: C.pri,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        ▶ 试听
                      </button>
                    </div>
                  ))}
                </div>

                {/* 自定义音色 */}
                <h3 style={{ fontSize: 13, fontWeight: 600, color: C.ink, margin: '0 0 12px' }}>我的自定义音色</h3>
                <div style={{
                  padding: 40,
                  background: C.card,
                  border: `1px dashed ${C.line}`,
                  borderRadius: C.radius,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🎙️</div>
                  <p style={{ fontSize: 13, color: C.muted, margin: '0 0 12px' }}>还没有自定义音色</p>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <button
                      onClick={() => setShowVoiceDesign(true)}
                      style={{
                        padding: '8px 16px',
                        background: 'rgba(196,149,106,.08)',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: 12,
                        color: C.pri,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      ✨ 设计新音色
                    </button>
                    <button
                      onClick={() => setShowVoiceClone(true)}
                      style={{
                        padding: '8px 16px',
                        background: 'rgba(196,149,106,.08)',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: 12,
                        color: C.pri,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      🎤 克隆我的声音
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ 生成设置 Tab ═══ */}
            {activeTab === 'settings' && (
              <div style={{ maxWidth: 480 }}>
                <h2 style={{ fontSize: 15, fontWeight: 600, color: C.ink, margin: '0 0 4px' }}>生成设置</h2>
                <p style={{ fontSize: 12, color: C.muted, margin: '0 0 20px' }}>调整有声书生成的默认参数</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* 默认旁白音色 */}
                  <FieldGroup label="默认旁白音色">
                    <select style={selectStyle}>
                      {VOICE_PRESETS.map(v => (
                        <option key={v.id} value={v.id}>{v.name} - {v.desc}</option>
                      ))}
                    </select>
                  </FieldGroup>

                  {/* 语速 */}
                  <FieldGroup label="默认语速">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <input type="range" min="0.5" max="2.0" step="0.1" defaultValue="1.0" style={{ flex: 1 }} />
                      <span style={{ fontSize: 12, color: C.ink, minWidth: 32, textAlign: 'right' }}>1.0x</span>
                    </div>
                  </FieldGroup>

                  {/* 对话间隔 */}
                  <FieldGroup label="对话间隔">
                    <select style={selectStyle} defaultValue="500">
                      <option value="300">0.3 秒（紧凑）</option>
                      <option value="500">0.5 秒（正常）</option>
                      <option value="800">0.8 秒（舒缓）</option>
                      <option value="1000">1.0 秒（缓慢）</option>
                    </select>
                  </FieldGroup>

                  {/* 段落间隔 */}
                  <FieldGroup label="段落间隔">
                    <select style={selectStyle} defaultValue="300">
                      <option value="200">0.2 秒</option>
                      <option value="300">0.3 秒（正常）</option>
                      <option value="500">0.5 秒</option>
                    </select>
                  </FieldGroup>

                  {/* 章节间隔 */}
                  <FieldGroup label="章节间隔">
                    <select style={selectStyle} defaultValue="2000">
                      <option value="1000">1 秒</option>
                      <option value="2000">2 秒（正常）</option>
                      <option value="3000">3 秒</option>
                    </select>
                  </FieldGroup>

                  {/* 导出格式 */}
                  <FieldGroup label="导出格式">
                    <select style={selectStyle} defaultValue="mp3">
                      <option value="mp3">MP3（通用）</option>
                      <option value="m4a">M4A（Apple 生态）</option>
                      <option value="wav">WAV（无损）</option>
                    </select>
                  </FieldGroup>

                  {/* 音频质量 */}
                  <FieldGroup label="音频质量">
                    <select style={selectStyle} defaultValue="medium">
                      <option value="low">标准（64kbps，文件小）</option>
                      <option value="medium">高质量（128kbps，推荐）</option>
                      <option value="high">超高（320kbps，文件大）</option>
                    </select>
                  </FieldGroup>

                  {/* 保存按钮 */}
                  <button
                    style={{
                      padding: '10px 24px',
                      background: C.pri,
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 500,
                      color: '#fff',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      alignSelf: 'flex-start',
                      marginTop: 8,
                    }}
                  >
                    保存设置
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ═══ 设计音色弹窗 ═══ */}
      {showVoiceDesign && (
        <div style={overlayStyle} onClick={() => setShowVoiceDesign(false)}>
          <div style={dialogStyle} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: C.ink, margin: 0 }}>✨ 设计新音色</h2>
              <button onClick={() => setShowVoiceDesign(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: C.muted }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <FieldGroup label="音色名称">
                <input type="text" placeholder="例：林远-磁性男声" style={inputStyle} />
              </FieldGroup>

              <FieldGroup label="音色描述">
                <textarea
                  placeholder="描述你想要的声音特征：年轻男性，低沉磁性，适合旁白和对话..."
                  style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                />
              </FieldGroup>

              <FieldGroup label="性别">
                <div style={{ display: 'flex', gap: 12 }}>
                  {['男', '女', '中性'].map(g => (
                    <label key={g} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.ink, cursor: 'pointer' }}>
                      <input type="radio" name="gender" value={g} defaultChecked={g === '男'} />
                      {g}
                    </label>
                  ))}
                </div>
              </FieldGroup>

              <FieldGroup label="年龄段">
                <select style={selectStyle}>
                  <option>少年（10-18岁）</option>
                  <option selected>青年（18-35岁）</option>
                  <option>中年（35-55岁）</option>
                  <option>老年（55岁以上）</option>
                </select>
              </FieldGroup>

              <FieldGroup label="参考音频（可选）">
                <div style={{
                  padding: 16,
                  border: `1px dashed ${C.line}`,
                  borderRadius: 6,
                  textAlign: 'center',
                }}>
                  <p style={{ fontSize: 12, color: C.muted, margin: '0 0 8px' }}>上传一段参考音频，AI 会参考该声音的特征</p>
                  <button style={{
                    padding: '6px 16px',
                    background: 'rgba(196,149,106,.08)',
                    border: 'none',
                    borderRadius: 4,
                    fontSize: 12,
                    color: C.pri,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}>
                    选择音频文件
                  </button>
                  <p style={{ fontSize: 10, color: C.muted, margin: '8px 0 0' }}>支持 MP3/WAV，建议 10-30 秒</p>
                </div>
              </FieldGroup>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 24 }}>
              <button
                onClick={() => setShowVoiceDesign(false)}
                style={{
                  padding: '8px 20px',
                  background: 'none',
                  border: `1px solid ${C.line}`,
                  borderRadius: 6,
                  fontSize: 13,
                  color: C.muted,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                取消
              </button>
              <button
                style={{
                  padding: '8px 20px',
                  background: C.pri,
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#fff',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                生成预览
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ 克隆声音弹窗 ═══ */}
      {showVoiceClone && (
        <div style={overlayStyle} onClick={() => setShowVoiceClone(false)}>
          <div style={dialogStyle} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: C.ink, margin: 0 }}>🎤 克隆声音</h2>
              <button onClick={() => setShowVoiceClone(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: C.muted }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <FieldGroup label="上传样本音频">
                <div style={{
                  padding: 32,
                  border: `2px dashed ${C.line}`,
                  borderRadius: 8,
                  textAlign: 'center',
                  background: 'rgba(196,149,106,.02)',
                }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🎙️</div>
                  <p style={{ fontSize: 13, color: C.ink, margin: '0 0 4px' }}>拖拽音频文件到此处，或点击上传</p>
                  <p style={{ fontSize: 11, color: C.muted, margin: '0 0 12px' }}>支持 MP3 / WAV / M4A</p>
                  <button style={{
                    padding: '8px 20px',
                    background: C.pri,
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 12,
                    color: '#fff',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}>
                    选择文件
                  </button>
                </div>
              </FieldGroup>

              <div style={{
                padding: 12,
                background: 'rgba(58,82,121,.06)',
                borderRadius: 6,
                fontSize: 12,
                color: C.indigo,
              }}>
                <strong>样本要求：</strong>
                <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                  <li>时长：10秒 - 5分钟</li>
                  <li>内容：清晰的说话声，无背景噪音</li>
                  <li>建议：朗读一段文字，保持自然语速</li>
                </ul>
              </div>

              <FieldGroup label="克隆名称">
                <input type="text" placeholder="例：我的声音" style={inputStyle} />
              </FieldGroup>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 24 }}>
              <button
                onClick={() => setShowVoiceClone(false)}
                style={{
                  padding: '8px 20px',
                  background: 'none',
                  border: `1px solid ${C.line}`,
                  borderRadius: 6,
                  fontSize: 13,
                  color: C.muted,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                取消
              </button>
              <button
                style={{
                  padding: '8px 20px',
                  background: C.pri,
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#fff',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                开始克隆
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── 子组件 ── */

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: C.ink, marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}

/* ── 样式常量 ── */

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: `1px solid ${C.line}`,
  borderRadius: 6,
  fontSize: 13,
  color: C.ink,
  background: C.card,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: `1px solid ${C.line}`,
  borderRadius: 6,
  fontSize: 13,
  color: C.ink,
  background: C.card,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
}

const dialogStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 480,
  maxHeight: '80vh',
  overflow: 'auto',
  background: C.card,
  borderRadius: 12,
  padding: 24,
  boxShadow: '0 8px 32px rgba(0,0,0,.12)',
}
