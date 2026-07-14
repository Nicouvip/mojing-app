'use client'

import { useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import type { Chapter, Project } from '@/lib/db/types'
import { toPlainText } from '@/lib/utils/utils'
import { updateChapterContent, getChapters } from '@/lib/db/store'
import { calcBodyDensity } from '@/lib/ai/compliance'

export interface EditorActions {
  handleSave: () => void
  handleContentChange: (newContent: string) => void
  handleTxtImport: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
}

interface UseEditorActionsProps {
  activeChapter: Chapter | null
  content: string
  projectId: string
  setSaveStatus: (status: 'saved' | 'saving' | 'unsaved' | 'error') => void
  setBodyDensity: (d: number) => void
  setContent: (c: string) => void
  setChapters: (c: Chapter[]) => void
}

export function useEditorActions({
  activeChapter,
  content,
  projectId,
  setSaveStatus,
  setBodyDensity,
  setContent,
  setChapters,
}: UseEditorActionsProps): EditorActions {

  const handleSave = useCallback(() => {
    if (!activeChapter) return
    setSaveStatus('saving')
    try {
      updateChapterContent(activeChapter.id, content)
      setBodyDensity(calcBodyDensity(toPlainText(content)))
      setChapters(getChapters(projectId))
      setSaveStatus('saved')
    } catch (err) {
      console.error('保存失败:', err)
      setSaveStatus('error')
    }
  }, [activeChapter, content, projectId, setSaveStatus, setBodyDensity, setContent, setChapters])

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent)
    setSaveStatus('unsaved')
    setBodyDensity(calcBodyDensity(toPlainText(newContent)))
  }, [setContent, setSaveStatus, setBodyDensity])

  const handleTxtImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const html = text
        .split('\n\n')
        .map(p => `<p>${p.replace(/\n/g, '<br/>').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`)
        .join('')
      setContent(html)
      setSaveStatus('unsaved')
    } catch (err) {
      console.error('导入文件失败:', err)
    }
    e.target.value = ''
  }, [setContent, setSaveStatus])

  return { handleSave, handleContentChange, handleTxtImport }
}
