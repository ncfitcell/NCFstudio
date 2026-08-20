import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { getDb } from '../lib/db'
import type { Bindings, Variables } from '../lib/types'

const directory = new Hono<{ Bindings: Bindings; Variables: Variables }>()
directory.use('*', authMiddleware)

directory.get('/users', async (c) => {
  const db = getDb(c.env)
  const rows = await db.prepare(
    `SELECT id, name, title, avatar_color FROM users WHERE active = 1 ORDER BY name ASC`
  ).all()
  return c.json({ users: rows.results || [] })
})

directory.get('/profiles', async (c) => {
  const db = getDb(c.env)
  const rows = await db.prepare(
    `SELECT id, name, title, bio, skills, avatar_color FROM users WHERE active = 1 ORDER BY name ASC`
  ).all()

  const roleRows = await db.prepare(
    `SELECT ur.user_id, r.key, r.label FROM user_roles ur JOIN roles r ON r.id = ur.role_id`
  ).all()

  const rolesByUser: Record<number, { key: string; label: string }[]> = {}
  for (const row of (roleRows.results || []) as any[]) {
    if (!rolesByUser[row.user_id]) rolesByUser[row.user_id] = []
    rolesByUser[row.user_id].push({ key: row.key, label: row.label })
  }

  const result = (rows.results || []).map((u: any) => ({ ...u, roles: rolesByUser[u.id] || [] }))
  return c.json({ profiles: result })
})

directory.put('/profile', async (c) => {
  const user = c.get('user')
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: 'Invalid body' }, 400)

  const db = getDb(c.env)
  await db.prepare(
    `UPDATE users SET title = COALESCE(?, title), bio = COALESCE(?, bio), skills = COALESCE(?, skills), avatar_color = COALESCE(?, avatar_color), updated_at = NOW() WHERE id = ?`
  ).bind(body.title ?? null, body.bio ?? null, body.skills ?? null, body.avatarColor ?? null, user.id).run()

  return c.json({ success: true })
})

export default directory
