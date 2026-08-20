import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { checkChannelAccess } from '../lib/access'
import { getDb } from '../lib/db'
import type { Bindings, Variables } from '../lib/types'

const tasks = new Hono<{ Bindings: Bindings; Variables: Variables }>()
tasks.use('*', authMiddleware)

tasks.get('/:channelKey', async (c) => {
  const user = c.get('user')
  const channelKey = c.req.param('channelKey')
  const db = getDb(c.env)
  const access = await checkChannelAccess(db, user, channelKey, 'read')
  if (!access.allowed) return c.json({ error: access.reason || 'Forbidden' }, 403)

  const rows = await db.prepare(
    `SELECT t.*, u.name as assignee_name, u.avatar_color as assignee_color, c.name as creator_name
     FROM tasks t
     LEFT JOIN users u ON u.id = t.assignee_id
     LEFT JOIN users c ON c.id = t.created_by
     WHERE t.channel_key = ? ORDER BY t.created_at DESC`
  ).bind(channelKey).all()

  const writeAccess = await checkChannelAccess(db, user, channelKey, 'write')
  return c.json({ tasks: rows.results || [], canWrite: writeAccess.allowed })
})

tasks.post('/:channelKey', async (c) => {
  const user = c.get('user')
  const channelKey = c.req.param('channelKey')
  const db = getDb(c.env)
  const access = await checkChannelAccess(db, user, channelKey, 'write')
  if (!access.allowed) return c.json({ error: access.reason || 'Forbidden' }, 403)

  const body = await c.req.json().catch(() => null)
  if (!body || !body.title) return c.json({ error: 'Title is required' }, 400)

  const result = await db.prepare(
    `INSERT INTO tasks (channel_key, title, description, status, priority, assignee_id, created_by, due_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
  ).bind(
    channelKey,
    body.title,
    body.description || null,
    body.status || 'backlog',
    body.priority || 'medium',
    body.assigneeId || null,
    user.id,
    body.dueDate || null
  ).run()

  return c.json({ success: true, id: result.meta.last_row_id })
})

tasks.put('/:channelKey/:id', async (c) => {
  const user = c.get('user')
  const channelKey = c.req.param('channelKey')
  const id = Number(c.req.param('id'))
  const db = getDb(c.env)
  const access = await checkChannelAccess(db, user, channelKey, 'write')
  if (!access.allowed) return c.json({ error: access.reason || 'Forbidden' }, 403)

  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: 'Invalid body' }, 400)

  const fields: string[] = []
  const values: any[] = []
  for (const [key, col] of [
    ['title', 'title'], ['description', 'description'], ['status', 'status'],
    ['priority', 'priority'], ['assigneeId', 'assignee_id'], ['dueDate', 'due_date']
  ]) {
    if (body[key] !== undefined) {
      fields.push(`${col} = ?`)
      values.push(body[key])
    }
  }
  if (fields.length === 0) return c.json({ error: 'No fields to update' }, 400)
  fields.push('updated_at = NOW()')
  values.push(id)

  await db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run()
  return c.json({ success: true })
})

tasks.delete('/:channelKey/:id', async (c) => {
  const user = c.get('user')
  const channelKey = c.req.param('channelKey')
  const id = Number(c.req.param('id'))
  const db = getDb(c.env)
  const access = await checkChannelAccess(db, user, channelKey, 'write')
  if (!access.allowed) return c.json({ error: access.reason || 'Forbidden' }, 403)
  await db.prepare(`DELETE FROM tasks WHERE id = ?`).bind(id).run()
  return c.json({ success: true })
})

export default tasks
