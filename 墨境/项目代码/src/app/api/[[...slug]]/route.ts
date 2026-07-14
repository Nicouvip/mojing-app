/**
 * 全局 API 404 处理
 *
 * 所有不存在的 API 路由（如 /api/nonexistent）统一返回 JSON 格式的 404，
 * 而非 Next.js 默认的 HTML 404 页面，确保前端可以统一处理 API 错误。
 */
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ error: 'API 不存在' }, { status: 404 })
}

export async function POST() {
  return NextResponse.json({ error: 'API 不存在' }, { status: 404 })
}

export async function PUT() {
  return NextResponse.json({ error: 'API 不存在' }, { status: 404 })
}

export async function PATCH() {
  return NextResponse.json({ error: 'API 不存在' }, { status: 404 })
}

export async function DELETE() {
  return NextResponse.json({ error: 'API 不存在' }, { status: 404 })
}
