export interface Project {
  id: string
  name: string
  genre: string
  description: string
  createdAt: number
  updatedAt: number
  deletedAt?: number | null
  chapterCount: number
  totalWords: number
}

export interface Chapter {
  id: string
  projectId: string
  title: string
  content: string
  order: number
  wordCount: number
  createdAt: number
  updatedAt: number
  deletedAt?: number | null
  status: 'draft' | 'writing' | 'review' | 'completed'
}
