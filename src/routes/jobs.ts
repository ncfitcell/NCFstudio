import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { getDb } from '../lib/db'
import type { Bindings, Variables } from '../lib/types'

const jobs = new Hono<{ Bindings: Bindings; Variables: Variables }>()
jobs.use('*', authMiddleware)

jobs.get('/', async (c) => {
  const db = getDb(c.env)
  const rows = await db.prepare(
    `SELECT j.*, v.name as venture_name, v.logo_emoji as venture_emoji, u.name as creator_name
     FROM jobs j LEFT JOIN ventures v ON v.id = j.venture_id LEFT JOIN users u ON u.id = j.created_by
     ORDER BY j.created_at DESC`
  ).all()
  return c.json({ jobs: rows.results || [] })
})

jobs.post('/', async (c) => {
  const user = c.get('user')
  const roles = user.roles as any[]
  const canPost = user.is_admin === 1 || roles.includes('leadership') || roles.includes('core') || roles.includes('eir')
  if (!canPost) return c.json({ error: 'Only Leadership, Core Team, or EIRs can post open roles' }, 403)

  const body = await c.req.json().catch(() => null)
  if (!body || !body.title) return c.json({ error: 'Title is required' }, 400)

  const db = getDb(c.env)
  const result = await db.prepare(
    `INSERT INTO jobs (venture_id, title, description, job_type, location, created_by) VALUES (?, ?, ?, ?, ?, ?) RETURNING id`
  ).bind(body.ventureId || null, body.title, body.description || null, body.jobType || 'full-time', body.location || 'Remote', user.id).run()

  return c.json({ success: true, id: result.meta.last_row_id })
})

jobs.put('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: 'Invalid body' }, 400)
  const db = getDb(c.env)
  await db.prepare(`UPDATE jobs SET status = COALESCE(?, status) WHERE id = ?`).bind(body.status || null, id).run()
  return c.json({ success: true })
})

jobs.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const db = getDb(c.env)
  await db.prepare(`DELETE FROM jobs WHERE id = ?`).bind(id).run()
  return c.json({ success: true })
})

export default jobs
