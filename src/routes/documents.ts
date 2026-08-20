import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { checkChannelAccess } from '../lib/access'
import { getDb } from '../lib/db'
import type { Bindings, Variables } from '../lib/types'

const documents = new Hono<{ Bindings: Bindings; Variables: Variables }>()
documents.use('*', authMiddleware)

documents.get('/:channelKey', async (c) => {
  const user = c.get('user')
  const channelKey = c.req.param('channelKey')
  const db = getDb(c.env)
  const access = await checkChannelAccess(db, user, channelKey, 'read')
  if (!access.allowed) return c.json({ error: access.reason || 'Forbidden' }, 403)

  const rows = await db.prepare(
    `SELECT d.*, u.name as uploader_name, u.avatar_color as uploader_color
     FROM documents d LEFT JOIN users u ON u.id = d.uploaded_by
     WHERE d.channel_key = ? ORDER BY d.created_at DESC`
  ).bind(channelKey).all()

  const writeAccess = await checkChannelAccess(db, user, channelKey, 'write')
  return c.json({ documents: rows.results || [], canWrite: writeAccess.allowed })
})

documents.post('/:channelKey', async (c) => {
  const user = c.get('user')
  const channelKey = c.req.param('channelKey')
  const db = getDb(c.env)
  const access = await checkChannelAccess(db, user, channelKey, 'write')
  if (!access.allowed) return c.json({ error: access.reason || 'Forbidden' }, 403)

  const body = await c.req.json().catch(() => null)
  if (!body || !body.title) return c.json({ error: 'Title is required' }, 400)

  const result = await db.prepare(
    `INSERT INTO documents (channel_key, title, description, doc_type, url, version, status, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
  ).bind(
    channelKey,
    body.title,
    body.description || null,
    body.docType || 'file',
    body.url || null,
    body.version || 'v1.0',
    body.status || 'active',
    user.id
  ).run()

  return c.json({ success: true, id: result.meta.last_row_id })
})

documents.put('/:channelKey/:id', async (c) => {
  const user = c.get('user')
  const channelKey = c.req.param('channelKey')
  const id = Number(c.req.param('id'))
  const db = getDb(c.env)
  const access = await checkChannelAccess(db, user, channelKey, 'write')
  if (!access.allowed) return c.json({ error: access.reason || 'Forbidden' }, 403)

  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: 'Invalid body' }, 400)

  await db.prepare(
    `UPDATE documents SET status = COALESCE(?, status), version = COALESCE(?, version) WHERE id = ?`
  ).bind(body.status || null, body.version || null, id).run()

  return c.json({ success: true })
})

documents.delete('/:channelKey/:id', async (c) => {
  const user = c.get('user')
  const channelKey = c.req.param('channelKey')
  const id = Number(c.req.param('id'))
  const db = getDb(c.env)
  const access = await checkChannelAccess(db, user, channelKey, 'write')
  if (!access.allowed) return c.json({ error: access.reason || 'Forbidden' }, 403)
  await db.prepare(`DELETE FROM documents WHERE id = ?`).bind(id).run()
  return c.json({ success: true })
})

export default documents
