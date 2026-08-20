import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { checkChannelAccess } from '../lib/access'
import { findChannel } from '../lib/channels'
import { getDb } from '../lib/db'
import type { Bindings, Variables } from '../lib/types'

const gates = new Hono<{ Bindings: Bindings; Variables: Variables }>()
gates.use('*', authMiddleware)

gates.get('/:channelKey', async (c) => {
  const user = c.get('user')
  const channelKey = c.req.param('channelKey')
  const db = getDb(c.env)
  const access = await checkChannelAccess(db, user, channelKey, 'read')
  if (!access.allowed) return c.json({ error: access.reason || 'Forbidden' }, 403)

  const rows = await db.prepare(
    `SELECT g.*, v.name as venture_name, v.logo_emoji as venture_emoji, u.name as creator_name
     FROM gates g LEFT JOIN ventures v ON v.id = g.venture_id LEFT JOIN users u ON u.id = g.created_by
     WHERE g.channel_key = ? ORDER BY g.created_at DESC`
  ).bind(channelKey).all()

  const gateIds = (rows.results || []).map((g: any) => g.id)
  let votesByGate: Record<number, any[]> = {}
  if (gateIds.length > 0) {
    const placeholders = gateIds.map(() => '?').join(',')
    const voteRows = await db.prepare(
      `SELECT gv.*, u.name as voter_name, u.avatar_color as voter_color
       FROM gate_votes gv LEFT JOIN users u ON u.id = gv.user_id
       WHERE gv.gate_id IN (${placeholders})`
    ).bind(...gateIds).all()
    for (const v of (voteRows.results || []) as any[]) {
      if (!votesByGate[v.gate_id]) votesByGate[v.gate_id] = []
      votesByGate[v.gate_id].push(v)
    }
  }

  const found = findChannel(channelKey)
  const approverRoles = found?.channel.gateApprovers || ['leadership']
  const canVote = user.is_admin === 1 || (user.roles as any[]).some((r) => approverRoles.includes(r))

  const result = (rows.results || []).map((g: any) => {
    const votes = votesByGate[g.id] || []
    const approve = votes.filter((v) => v.vote === 'approve').length
    const reject = votes.filter((v) => v.vote === 'reject').length
    const abstain = votes.filter((v) => v.vote === 'abstain').length
    const myVote = votes.find((v) => v.user_id === user.id)
    return { ...g, votes, tally: { approve, reject, abstain }, myVote: myVote || null }
  })

  const writeAccess = await checkChannelAccess(db, user, channelKey, 'write')
  return c.json({ gates: result, canWrite: writeAccess.allowed, canVote })
})

gates.post('/:channelKey', async (c) => {
  const user = c.get('user')
  const channelKey = c.req.param('channelKey')
  const db = getDb(c.env)
  const access = await checkChannelAccess(db, user, channelKey, 'write')
  if (!access.allowed) return c.json({ error: access.reason || 'Forbidden' }, 403)

  const body = await c.req.json().catch(() => null)
  if (!body || !body.title) return c.json({ error: 'Title is required' }, 400)

  const result = await db.prepare(
    `INSERT INTO gates (channel_key, venture_id, title, description, status, created_by) VALUES (?, ?, ?, ?, 'open', ?) RETURNING id`
  ).bind(channelKey, body.ventureId || null, body.title, body.description || null, user.id).run()

  return c.json({ success: true, id: result.meta.last_row_id })
})

gates.post('/:channelKey/:id/vote', async (c) => {
  const user = c.get('user')
  const channelKey = c.req.param('channelKey')
  const id = Number(c.req.param('id'))
  const db = getDb(c.env)
  const access = await checkChannelAccess(db, user, channelKey, 'read')
  if (!access.allowed) return c.json({ error: access.reason || 'Forbidden' }, 403)

  const found = findChannel(channelKey)
  const approverRoles = found?.channel.gateApprovers || ['leadership']
  const canVote = user.is_admin === 1 || (user.roles as any[]).some((r) => approverRoles.includes(r))
  if (!canVote) return c.json({ error: 'Only Investment Committee members can cast a formal vote' }, 403)

  const body = await c.req.json().catch(() => null)
  if (!body || !['approve', 'reject', 'abstain'].includes(body.vote)) {
    return c.json({ error: 'Vote must be approve, reject, or abstain' }, 400)
  }

  await db.prepare(
    `INSERT INTO gate_votes (gate_id, user_id, vote, comment) VALUES (?, ?, ?, ?)
     ON CONFLICT(gate_id, user_id) DO UPDATE SET vote = EXCLUDED.vote, comment = EXCLUDED.comment`
  ).bind(id, user.id, body.vote, body.comment || null).run()

  return c.json({ success: true })
})

gates.post('/:channelKey/:id/resolve', async (c) => {
  const user = c.get('user')
  const channelKey = c.req.param('channelKey')
  const id = Number(c.req.param('id'))
  const found = findChannel(channelKey)
  const approverRoles = found?.channel.gateApprovers || ['leadership']
  const canResolve = user.is_admin === 1 || (user.roles as any[]).some((r) => approverRoles.includes(r))
  if (!canResolve) return c.json({ error: 'Only Investment Committee members can resolve a gate' }, 403)

  const body = await c.req.json().catch(() => null)
  if (!body || !['approved', 'rejected'].includes(body.status)) {
    return c.json({ error: 'Status must be approved or rejected' }, 400)
  }

  const db = getDb(c.env)
  await db.prepare(
    `UPDATE gates SET status = ?, resolved_at = NOW() WHERE id = ?`
  ).bind(body.status, id).run()

  return c.json({ success: true })
})

export default gates
