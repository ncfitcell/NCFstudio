import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { checkChannelAccess } from '../lib/access'
import { getDb } from '../lib/db'
import type { Bindings, Variables } from '../lib/types'

const events = new Hono<{ Bindings: Bindings; Variables: Variables }>()
events.use('*', authMiddleware)

events.get('/:channelKey', async (c) => {
  const user = c.get('user')
  const channelKey = c.req.param('channelKey')
  const db = getDb(c.env)
  const access = await checkChannelAccess(db, user, channelKey, 'read')
  if (!access.allowed) return c.json({ error: access.reason || 'Forbidden' }, 403)

  const rows = await db.prepare(
    `SELECT e.*, u.name as creator_name FROM events e LEFT JOIN users u ON u.id = e.created_by
     WHERE e.channel_key = ? ORDER BY e.event_date ASC`
  ).bind(channelKey).all()

  const eventIds = (rows.results || []).map((e: any) => e.id)
  let rsvpsByEvent: Record<number, any[]> = {}
  if (eventIds.length > 0) {
    const placeholders = eventIds.map(() => '?').join(',')
    const rsvpRows = await db.prepare(
      `SELECT r.*, u.name as user_name FROM event_rsvps r LEFT JOIN users u ON u.id = r.user_id WHERE r.event_id IN (${placeholders})`
    ).bind(...eventIds).all()
    for (const r of (rsvpRows.results || []) as any[]) {
      if (!rsvpsByEvent[r.event_id]) rsvpsByEvent[r.event_id] = []
      rsvpsByEvent[r.event_id].push(r)
    }
  }

  const result = (rows.results || []).map((e: any) => {
    const rsvps = rsvpsByEvent[e.id] || []
    return {
      ...e,
      rsvps,
      goingCount: rsvps.filter((r) => r.status === 'going').length,
      myRsvp: rsvps.find((r) => r.user_id === user.id)?.status || null
    }
  })

  const writeAccess = await checkChannelAccess(db, user, channelKey, 'write')
  return c.json({ events: result, canWrite: writeAccess.allowed })
})

events.post('/:channelKey', async (c) => {
  const user = c.get('user')
  const channelKey = c.req.param('channelKey')
  const db = getDb(c.env)
  const access = await checkChannelAccess(db, user, channelKey, 'write')
  if (!access.allowed) return c.json({ error: access.reason || 'Forbidden' }, 403)

  const body = await c.req.json().catch(() => null)
  if (!body || !body.title || !body.eventDate) return c.json({ error: 'Title and event date are required' }, 400)

  const result = await db.prepare(
    `INSERT INTO events (channel_key, title, description, location, event_date, event_type, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`
  ).bind(
    channelKey, body.title, body.description || null, body.location || null,
    body.eventDate, body.eventType || 'event', user.id
  ).run()

  return c.json({ success: true, id: result.meta.last_row_id })
})

events.post('/:channelKey/:id/rsvp', async (c) => {
  const user = c.get('user')
  const channelKey = c.req.param('channelKey')
  const id = Number(c.req.param('id'))
  const db = getDb(c.env)
  const access = await checkChannelAccess(db, user, channelKey, 'read')
  if (!access.allowed) return c.json({ error: access.reason || 'Forbidden' }, 403)

  const body = await c.req.json().catch(() => null)
  if (!body || !['going', 'interested', 'declined'].includes(body.status)) {
    return c.json({ error: 'Invalid status' }, 400)
  }

  await db.prepare(
    `INSERT INTO event_rsvps (event_id, user_id, status) VALUES (?, ?, ?)
     ON CONFLICT(event_id, user_id) DO UPDATE SET status = EXCLUDED.status`
  ).bind(id, user.id, body.status).run()

  return c.json({ success: true })
})

events.delete('/:channelKey/:id', async (c) => {
  const user = c.get('user')
  const channelKey = c.req.param('channelKey')
  const id = Number(c.req.param('id'))
  const db = getDb(c.env)
  const access = await checkChannelAccess(db, user, channelKey, 'write')
  if (!access.allowed) return c.json({ error: access.reason || 'Forbidden' }, 403)
  await db.prepare(`DELETE FROM events WHERE id = ?`).bind(id).run()
  return c.json({ success: true })
})

export default events
