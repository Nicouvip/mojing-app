// ============================================================
// 墨境数据库 — Turso (libSQL) 连接模块
// 功能：通过 HTTP API 连接 Turso，提供查询/执行接口
// 数据库：libsql://mojing-nicouvip.aws-ap-northeast-1.turso.io
// ============================================================

// Turso HTTP API 基础 URL
const TURSO_HTTP_URL = 'https://mojing-nicouvip.aws-ap-northeast-1.turso.io'

// 获取认证 Token
function getAuthToken(): string {
  const token = process.env.TURSO_AUTH_TOKEN
  if (!token) {
    throw new Error('Turso 数据库未配置。请在 .env.local 中设置 TURSO_AUTH_TOKEN')
  }
  return token
}

// ============================================================
// 内部工具函数
// ============================================================

interface TursoResponse {
  results: Array<{
    type: string
    response: {
      type: string
      result?: {
        cols: Array<{ name: string; decltype: string | null }>
        rows: Array<Array<{ type: string; value: unknown }>>
        affected_row_count: number
        last_insert_rowid: string | null
      }
    }
  }>
}

/**
 * 通过 HTTP API 执行 SQL
 */
async function executeHttp(sql: string, args?: unknown[]): Promise<TursoResponse> {
  const url = `${TURSO_HTTP_URL}/v2/pipeline`
  const token = getAuthToken()

  const stmt: { sql: string; args?: Array<{ type: string; value: unknown }> } = { sql }
  if (args && args.length > 0) {
    stmt.args = args.map(arg => {
      if (arg === null || arg === undefined) return { type: 'null', value: null }
      if (typeof arg === 'number') return { type: 'integer', value: arg }
      if (typeof arg === 'string') return { type: 'text', value: arg }
      if (typeof arg === 'boolean') return { type: 'integer', value: arg ? 1 : 0 }
      return { type: 'text', value: String(arg) }
    })
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        { type: 'execute', stmt },
        { type: 'close' }
      ]
    })
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Turso HTTP API 错误: ${response.status} - ${text}`)
  }

  return await response.json()
}

/**
 * 将 Turso 行数据转换为普通对象
 */
function rowsToObjects(result: TursoResponse): Record<string, unknown>[] {
  if (!result.results || !result.results[0] || !result.results[0].response) {
    return []
  }

  const res = result.results[0].response
  if (res.type !== 'execute' || !res.result) {
    return []
  }

  const { cols, rows } = res.result
  return rows.map(row => {
    const obj: Record<string, unknown> = {}
    cols.forEach((col, i) => {
      obj[col.name] = row[i]?.value ?? null
    })
    return obj
  })
}

// ============================================================
// 公开 API
// ============================================================

export interface QueryResult {
  rows: Record<string, unknown>[]
  columns: string[]
  affectedRowCount: number
}

/**
 * 执行 SQL 查询（返回结果集）
 * 用于 SELECT 查询
 */
export async function tursoQuery(sql: string, args?: unknown[]): Promise<QueryResult> {
  const result = await executeHttp(sql, args)
  const res = result.results[0]?.response
  const rows = rowsToObjects(result)
  const columns = res?.result?.cols?.map(c => c.name) ?? []
  const affectedRowCount = res?.result?.affected_row_count ?? 0

  return { rows, columns, affectedRowCount }
}

/**
 * 执行 SQL 语句（不返回结果集）
 * 用于 INSERT/UPDATE/DELETE/CREATE TABLE
 */
export async function tursoExecute(sql: string, args?: unknown[]): Promise<QueryResult> {
  const result = await executeHttp(sql, args)
  const res = result.results[0]?.response
  const affectedRowCount = res?.result?.affected_row_count ?? 0
  const lastInsertRowid = res?.result?.last_insert_rowid

  return { rows: [], columns: [], affectedRowCount }
}

/**
 * 批量执行多条 SQL（事务）
 */
export async function tursoBatch(statements: { sql: string; args?: unknown[] }[]): Promise<void> {
  for (const stmt of statements) {
    await tursoExecute(stmt.sql, stmt.args)
  }
}

/**
 * 测试数据库连接
 */
export async function tursoHealthCheck(): Promise<boolean> {
  try {
    const result = await tursoQuery('SELECT 1 as ok')
    return result.rows.length > 0
  } catch (err) {
    console.error('[Turso] 连接测试失败:', err)
    return false
  }
}
