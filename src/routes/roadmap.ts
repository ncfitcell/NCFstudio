import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { getDb } from '../lib/db'
import type { Bindings, Variables } from '../lib/types'

const roadmap = new Hono<{ Bindings: Bindings; Variables: Variables }>()
roadmap.use('*', authMiddleware)

roadmap.get('/', async (c) => {
  const db = getDb(c.env)
  const rows = await db.prepare(`SELECT * FROM roadmap_items ORDER BY order_index ASC, id ASC`).all()
  return c.json({ items: rows.results || [] })
})

roadmap.post('/', async (c) => {
  const user = c.get('user')
  if (user.is_admin !== 1 && !(user.roles as any[]).includes('leadership')) {
    return c.json({ error: 'Only Studio Leadership or Admin can edit the roadmap' }, 403)
  }
  const body = await c.req.json().catch(() => null)
  if (!body || !body.title || !body.quarter) return c.json({ error: 'Title and quarter are required' }, 400)

  const db = getDb(c.env)
  const maxOrder = await db.prepare(`SELECT MAX(order_index) as m FROM roadmap_items`).first()
  const nextOrder = ((maxOrder as any)?.m || 0) + 1

  const result = await db.prepare(
    `INSERT INTO roadmap_items (title, description, quarter, status, order_index) VALUES (?, ?, ?, ?, ?) RETURNING id`
  ).bind(body.title, body.description || null, body.quarter, body.status || 'planned', nextOrder).run()

  return c.json({ success: true, id: result.meta.last_row_id })
})

roadmap.put('/:id', async (c) => {
  const user = c.get('user')
  if (user.is_admin !== 1 && !(user.roles as any[]).includes('leadership')) {
    return c.json({ error: 'Only Studio Leadership or Admin can edit the roadmap' }, 403)
  }
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: 'Invalid body' }, 400)

  const db = getDb(c.env)
  await db.prepare(
    `UPDATE roadmap_items SET title = COALESCE(?, title), description = COALESCE(?, description), quarter = COALESCE(?, quarter), status = COALESCE(?, status) WHERE id = ?`
  ).bind(body.title || null, body.description || null, body.quarter || null, body.status || null, id).run()

  return c.json({ success: true })
})

roadmap.delete('/:id', async (c) => {
  const user = c.get('user')
  if (user.is_admin !== 1 && !(user.roles as any[]).includes('leadership')) {
    return c.json({ error: 'Only Studio Leadership or Admin can edit the roadmap' }, 403)
  }
  const id = Number(c.req.param('id'))
  const db = getDb(c.env)
  await db.prepare(`DELETE FROM roadmap_items WHERE id = ?`).bind(id).run()
  return c.json({ success: true })
})

export default roadmap
