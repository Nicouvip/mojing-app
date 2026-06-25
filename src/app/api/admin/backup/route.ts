import { exec } from 'child_process'
import { readdir, stat } from 'fs/promises'
import { join } from 'path'
import { NextRequest, NextResponse } from 'next/server'

const BACKUP_DIR = join(process.cwd(), '..', 'backups', 'auto')
const PYTHON_SCRIPT = join(process.cwd(), '..', 'mojing-docs', 'auto-backup.py')

export async function GET() {
  try {
    const dir = BACKUP_DIR
    let files: { name: string; size: number; mtime: number }[] = []
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
    } catch {
      // 备份目录不存在
    }
    return NextResponse.json({ backups: files })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const flag = body.mode === 'app' ? '--app-only' : body.mode === 'docs' ? '--docs-only' : ''

    const cmd = `python "${PYTHON_SCRIPT}" ${flag}`
    
    const result = await new Promise<string>((resolve, reject) => {
      exec(cmd, { timeout: 120_000 }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message))
        } else {
          resolve(stdout)
        }
      })
    })

    return NextResponse.json({ success: true, output: result })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
