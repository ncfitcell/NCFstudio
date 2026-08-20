import { Hono } from 'hono'
import { hashPassword } from '../lib/auth'
import { authMiddleware, adminOnly } from '../middleware/auth'
import { ALL_ROLES } from '../lib/channels'
import { getDb } from '../lib/db'
import type { Bindings, Variables } from '../lib/types'

const admin = new Hono<{ Bindings: Bindings; Variables: Variables }>()

admin.use('*', authMiddleware, adminOnly)

admin.get('/roles', async (c) => {
  const db = getDb(c.env)
  const rows = await db.prepare(`SELECT * FROM roles ORDER BY id`).all()
  return c.json({ roles: rows.results })
})

admin.get('/users', async (c) => {
  const db = getDb(c.env)
  const users = await db.prepare(
    `SELECT id, username, name, email, title, bio, avatar_color, is_admin, active, created_at FROM users ORDER BY id`
  ).all()

  const userRoleRows = await db.prepare(
    `SELECT ur.user_id, r.key, r.label FROM user_roles ur JOIN roles r ON r.id = ur.role_id`
  ).all()

  const rolesByUser: Record<number, { key: string; label: string }[]> = {}
  for (const row of (userRoleRows.results || []) as any[]) {
    if (!rolesByUser[row.user_id]) rolesByUser[row.user_id] = []
    rolesByUser[row.user_id].push({ key: row.key, label: row.label })
  }

  const result = (users.results || []).map((u: any) => ({
    ...u,
    roles: rolesByUser[u.id] || []
  }))

  return c.json({ users: result })
})

admin.post('/users', async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body || !body.username || !body.password || !body.name) {
    return c.json({ error: 'username, password, and name are required' }, 400)
  }

  const db = getDb(c.env)
  const username = String(body.username).trim().toLowerCase()
  const existing = await db.prepare(`SELECT id FROM users WHERE username = ?`).bind(username).first()
  if (existing) {
    return c.json({ error: 'Username already exists' }, 409)
  }

  const passwordHash = await hashPassword(body.password)
  const isAdmin = body.isAdmin ? 1 : 0

  const result = await db.prepare(
    `INSERT INTO users (username, password_hash, name, email, title, bio, skills, avatar_color, is_admin, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1) RETURNING id`
  ).bind(
    username,
    passwordHash,
    body.name,
    body.email || null,
    body.title || null,
    body.bio || null,
    body.skills || null,
    body.avatarColor || '#00B4D8',
    isAdmin
  ).run()

  const userId = result.meta.last_row_id as number

  const roleKeys: string[] = Array.isArray(body.roles) ? body.roles.filter((r: string) => ALL_ROLES.includes(r as any)) : []
  for (const key of roleKeys) {
    const role = await db.prepare(`SELECT id FROM roles WHERE key = ?`).bind(key).first()
    if (role) {
      await db.prepare(`INSERT INTO user_roles (user_id, role_id) VALUES (?, ?) ON CONFLICT DO NOTHING`)
        .bind(userId, (role as any).id).run()
    }
  }

  return c.json({ success: true, userId })
})

admin.put('/users/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: 'Invalid body' }, 400)

  const db = getDb(c.env)
  await db.prepare(
    `UPDATE users SET name = ?, email = ?, title = ?, bio = ?, skills = ?, avatar_color = ?, is_admin = ?, updated_at = NOW() WHERE id = ?`
  ).bind(
    body.name,
    body.email || null,
    body.title || null,
    body.bio || null,
    body.skills || null,
    body.avatarColor || '#00B4D8',
    body.isAdmin ? 1 : 0,
    id
  ).run()

  if (Array.isArray(body.roles)) {
    await db.prepare(`DELETE FROM user_roles WHERE user_id = ?`).bind(id).run()
    const roleKeys: string[] = body.roles.filter((r: string) => ALL_ROLES.includes(r as any))
    for (const key of roleKeys) {
      const role = await db.prepare(`SELECT id FROM roles WHERE key = ?`).bind(key).first()
      if (role) {
        await db.prepare(`INSERT INTO user_roles (user_id, role_id) VALUES (?, ?) ON CONFLICT DO NOTHING`)
          .bind(id, (role as any).id).run()
      }
    }
  }

  return c.json({ success: true })
})

admin.post('/users/:id/toggle-active', async (c) => {
  const id = Number(c.req.param('id'))
  const currentUser = c.get('user')
  if (id === currentUser.id) {
    return c.json({ error: 'You cannot deactivate your own account' }, 400)
  }
  const db = getDb(c.env)
  const user = await db.prepare(`SELECT active FROM users WHERE id = ?`).bind(id).first()
  if (!user) return c.json({ error: 'User not found' }, 404)
  const newActive = (user as any).active === 1 ? 0 : 1
  await db.prepare(`UPDATE users SET active = ? WHERE id = ?`).bind(newActive, id).run()
  return c.json({ success: true, active: newActive })
})

admin.post('/users/:id/reset-password', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => null)
  if (!body || !body.password || body.password.length < 4) {
    return c.json({ error: 'Password must be at least 4 characters' }, 400)
  }
  const passwordHash = await hashPassword(body.password)
  const db = getDb(c.env)
  await db.prepare(`UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?`)
    .bind(passwordHash, id).run()
  return c.json({ success: true })
})

admin.delete('/users/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const currentUser = c.get('user')
  if (id === currentUser.id) {
    return c.json({ error: 'You cannot delete your own account' }, 400)
  }
  const db = getDb(c.env)
  await db.prepare(`DELETE FROM users WHERE id = ?`).bind(id).run()
  return c.json({ success: true })
})

export default admin
