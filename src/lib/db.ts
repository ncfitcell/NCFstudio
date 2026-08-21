import type { Bindings } from './types'

export type DbAdapter = {
  prepare: (sql: string) => BoundStatement
}

type BoundStatement = {
  bind: (...args: any[]) => BoundStatement
  first: () => Promise<any | null>
  all: () => Promise<{ results: any[] }>
  run: () => Promise<{ meta: { last_row_id: number } }>
}

/** Safely inline a JS value into a SQL literal string */
function sqlLiteral(val: any): string {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'number') return Number.isFinite(val) ? String(val) : 'NULL'
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
  if (val instanceof Date) return "'" + val.toISOString() + "'"
  return "'" + String(val).replace(/'/g, "''") + "'"
}

async function execSql(
  url: string,
  serviceKey: string,
  sql: string,
  params: any[]
): Promise<any[]> {
  let fullSql = sql
  if (params && params.length > 0) {
    // 1. Replace $N placeholders first (in reverse order so $10 is replaced before $1)
    for (let idx = params.length; idx >= 1; idx--) {
      const re = new RegExp('\\$' + idx + '(?![0-9])', 'g')
      if (re.test(fullSql)) {
        fullSql = fullSql.replace(re, sqlLiteral(params[idx - 1]))
      }
    }
    // 2. Replace ? placeholders
    let qIdx = 0
    fullSql = fullSql.replace(/\?/g, () => sqlLiteral(params[qIdx++]))
  }

  const res = await fetch(`${url}/rest/v1/rpc/exec_raw_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ sql: fullSql }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`DB error (${res.status}): ${err}`)
  }

  const raw = await res.json() as any

  if (Array.isArray(raw)) {
    if (raw.length > 0 && Array.isArray(raw[0])) return raw[0]
    if (raw.length > 0 && typeof raw[0] === 'object' && raw[0] !== null) return raw
    return []
  }

  return []
}

export function getDb(env?: Bindings): DbAdapter {
  const SUPABASE_URL =
    env?.SUPABASE_URL ||
    (typeof process !== 'undefined' ? process.env?.SUPABASE_URL : '') ||
    ''
  const SUPABASE_SERVICE_KEY =
    env?.SUPABASE_SERVICE_KEY ||
    (typeof process !== 'undefined' ? process.env?.SUPABASE_SERVICE_KEY : '') ||
    ''

  function makeStatement(sql: string, params: any[] = []): BoundStatement {
    return {
      bind: (...args: any[]) => makeStatement(sql, args),

      async first() {
        if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
          throw new Error('Database configuration error: SUPABASE_URL or SUPABASE_SERVICE_KEY is missing.')
        }
        const rows = await execSql(SUPABASE_URL, SUPABASE_SERVICE_KEY, sql, params)
        return rows[0] ?? null
      },

      async all() {
        if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
          throw new Error('Database configuration error: SUPABASE_URL or SUPABASE_SERVICE_KEY is missing.')
        }
        const rows = await execSql(SUPABASE_URL, SUPABASE_SERVICE_KEY, sql, params)
        return { results: rows }
      },

      async run() {
        if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
          throw new Error('Database configuration error: SUPABASE_URL or SUPABASE_SERVICE_KEY is missing.')
        }
        const rows = await execSql(SUPABASE_URL, SUPABASE_SERVICE_KEY, sql, params)
        const lastId = rows.length > 0 && rows[0]?.id != null ? Number(rows[0].id) : 0
        return { meta: { last_row_id: lastId } }
      },
    }
  }

  return {
    prepare: (sql: string) => makeStatement(sql),
  }
}
