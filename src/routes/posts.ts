import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { checkChannelAccess } from '../lib/access'
import { getDb } from '../lib/db'
import type { Bindings, Variables } from '../lib/types'

const posts = new Hono<{ Bindings: Bindings; Variables: Variables }>()

posts.use('*', authMiddleware)

posts.get('/:channelKey', async (c) => {
  const user = c.get('user')
  const channelKey = c.req.param('channelKey')
  const db = getDb(c.env)
  const access = await checkChannelAccess(db, user, channelKey, 'read')
  if (!access.allowed) return c.json({ error: access.reason || 'Forbidden' }, 403)

  const rows = await db.prepare(
    `SELECT p.*, u.name as author_name, u.title as author_title, u.avatar_color as author_color
     FROM posts p LEFT JOIN users u ON u.id = p.author_id
     WHERE p.channel_key = ? ORDER BY p.pinned DESC, p.created_at DESC`
  ).bind(channelKey).all()

  const postIds = (rows.results || []).map((p: any) => p.id)
  let commentsByPost: Record<number, any[]> = {}
  if (postIds.length > 0) {
    const placeholders = postIds.map(() => '?').join(',')
    const commentRows = await db.prepare(
      `SELECT cm.*, u.name as author_name, u.avatar_color as author_color
       FROM comments cm LEFT JOIN users u ON u.id = cm.author_id
       WHERE cm.post_id IN (${placeholders}) ORDER BY cm.created_at ASC`
    ).bind(...postIds).all()
    for (const cm of (commentRows.results || []) as any[]) {
      if (!commentsByPost[cm.post_id]) commentsByPost[cm.post_id] = []
      commentsByPost[cm.post_id].push(cm)
    }
  }

  const result = (rows.results || []).map((p: any) => ({ ...p, comments: commentsByPost[p.id] || [] }))
  return c.json({ posts: result, canWrite: access.allowed && (await checkChannelAccess(db, user, channelKey, 'write')).allowed })
})

posts.post('/:channelKey', async (c) => {
  const user = c.get('user')
  const channelKey = c.req.param('channelKey')
  const db = getDb(c.env)
  const access = await checkChannelAccess(db, user, channelKey, 'write')
  if (!access.allowed) return c.json({ error: access.reason || 'Forbidden' }, 403)

  const body = await c.req.json().catch(() => null)
  if (!body || !body.content) return c.json({ error: 'Content is required' }, 400)

  const result = await db.prepare(
    `INSERT INTO posts (channel_key, author_id, title, content, meta, pinned) VALUES (?, ?, ?, ?, ?, ?) RETURNING id`
  ).bind(
    channelKey,
    user.id,
    body.title || null,
    body.content,
    body.meta ? JSON.stringify(body.meta) : null,
    body.pinned ? 1 : 0
  ).run()

  return c.json({ success: true, id: result.meta.last_row_id })
})

posts.delete('/:channelKey/:id', async (c) => {
  const user = c.get('user')
  const channelKey = c.req.param('channelKey')
  const id = Number(c.req.param('id'))
  const db = getDb(c.env)
  const post = await db.prepare(`SELECT author_id FROM posts WHERE id = ?`).bind(id).first()
  if (!post) return c.json({ error: 'Not found' }, 404)
  if (user.is_admin !== 1 && (post as any).author_id !== user.id) {
    return c.json({ error: 'You can only delete your own posts' }, 403)
  }
  await db.prepare(`DELETE FROM posts WHERE id = ?`).bind(id).run()
  return c.json({ success: true })
})

posts.post('/:channelKey/:id/comments', async (c) => {
  const user = c.get('user')
  const channelKey = c.req.param('channelKey')
  const postId = Number(c.req.param('id'))
  const db = getDb(c.env)
  const access = await checkChannelAccess(db, user, channelKey, 'read')
  if (!access.allowed) return c.json({ error: access.reason || 'Forbidden' }, 403)

  const body = await c.req.json().catch(() => null)
  if (!body || !body.content) return c.json({ error: 'Content is required' }, 400)

  const result = await db.prepare(
    `INSERT INTO comments (post_id, author_id, content) VALUES (?, ?, ?) RETURNING id`
  ).bind(postId, user.id, body.content).run()

  return c.json({ success: true, id: result.meta.last_row_id })
})

export default posts
