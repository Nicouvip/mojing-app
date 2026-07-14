import { execFile } from 'child_process'
import { readdir, stat } from 'fs/promises'
import { join } from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

const BACKUP_DIR = join(process.cwd(), '..', 'backups', 'auto')
const PYTHON_SCRIPT = join(process.cwd(), '..', 'mojing-docs', 'auto-backup.py')

export async function GET() {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  try {
    const dir = BACKUP_DIR
    const files: { name: string; size: number; mtime: number }[] = []
    try {
      const entries = await readdir(dir)
      for (const name of entries) {
        if (name.endsWith('.tar.gz')) {
          const full = join(dir, name)
          const info = await stat(full)
          files.push({ name, size: info.size, mtime: info.mtimeMs })
        }
      }
      files.sort((a, b) => b.mtime - a.mtime)
    } catch (e) {
      console.error('[backup] 读取备份目录失败:', e)
    }
    return NextResponse.json({ backups: files })
  } catch (err) {
    console.error('[backup] 列出备份失败:', err)
    return NextResponse.json({ error: '获取备份列表失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  try {
    const body = await request.json().catch(() => ({}))
    const mode = body.mode
    const args: string[] = []

    if (mode === 'app') {
      args.push('--app-only')
    } else if (mode === 'docs') {
      args.push('--docs-only')
    }

    const result = await new Promise<string>((resolve, reject) => {
      execFile('python', [PYTHON_SCRIPT, ...args], { timeout: 120_000 }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message))
        } else {
          resolve(stdout)
        }
      })
    })

    return NextResponse.json({ success: true, output: result })
  } catch (err) {
    console.error('[backup] 执行备份失败:', err)
    return NextResponse.json({ error: '备份执行失败' }, { status: 500 })
  }
}
