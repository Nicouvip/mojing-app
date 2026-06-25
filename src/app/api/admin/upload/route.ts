import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: '未提供文件' }, { status: 400 })

    // 只允许图片
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: '仅支持图片' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // 确保目录存在
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadDir, { recursive: true })

    // 生成唯一文件名
    const ext = file.name.split('.').pop() || 'png'
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`
    const filepath = path.join(uploadDir, filename)
    await writeFile(filepath, buffer)

    return NextResponse.json({ url: `/uploads/${filename}`, name: file.name })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '上传失败' }, { status: 500 })
  }
}
