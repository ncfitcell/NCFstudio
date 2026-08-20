import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { getDb } from '../lib/db'
import type { Bindings, Variables } from '../lib/types'

const ventures = new Hono<{ Bindings: Bindings; Variables: Variables }>()
ventures.use('*', authMiddleware)

function canManageVentures(user: any) {
  const roles = user.roles as any[]
  return user.is_admin === 1 || roles.includes('leadership') || roles.includes('core')
}

function slugify(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
}

ventures.get('/', async (c) => {
  const db = getDb(c.env)
  const rows = await db.prepare(`SELECT * FROM ventures ORDER BY created_at DESC`).all()
  return c.json({ ventures: rows.results || [] })
})

ventures.get('/dealflow', async (c) => {
  const db = getDb(c.env)
  const rows = await db.prepare(`SELECT * FROM ventures WHERE is_dealflow = 1 ORDER BY created_at DESC`).all()
  return c.json({ ventures: rows.results || [] })
})

ventures.get('/:slug/members', async (c) => {
  const slug = c.req.param('slug')
  const db = getDb(c.env)
  const venture = await db.prepare(`SELECT id FROM ventures WHERE slug = ?`).bind(slug).first()
  if (!venture) return c.json({ error: 'Venture not found' }, 404)
  const rows = await db.prepare(
    `SELECT u.id, u.name, u.title, u.avatar_color, vm.role_in_venture
     FROM venture_members vm JOIN users u ON u.id = vm.user_id WHERE vm.venture_id = ?`
  ).bind((venture as any).id).all()
  return c.json({ members: rows.results || [] })
})

ventures.post('/', async (c) => {
  const user = c.get('user')
  if (!canManageVentures(user)) return c.json({ error: 'Only Studio Leadership/Core/Admin can create portfolio hubs' }, 403)

  const body = await c.req.json().catch(() => null)
  if (!body || !body.name) return c.json({ error: 'Name is required' }, 400)

  const slug = slugify(body.name)
  const db = getDb(c.env)
  const existing = await db.prepare(`SELECT id FROM ventures WHERE slug = ?`).bind(slug).first()
  if (existing) return c.json({ error: 'A venture with this name already exists' }, 409)

  const result = await db.prepare(
    `INSERT INTO ventures (slug, name, tagline, description, logo_emoji, stage, sector, is_dealflow, ask_amount, valuation, traction_summary, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
  ).bind(
    slug, body.name, body.tagline || null, body.description || null, body.logoEmoji || '🚀',
    body.stage || 'ideation', body.sector || null, body.isDealflow ? 1 : 0,
    body.askAmount || null, body.valuation || null, body.tractionSummary || null, user.id
  ).run()

  const ventureId = result.meta.last_row_id as number

  const memberIds: number[] = Array.isArray(body.memberIds) ? body.memberIds : []
  for (const uid of memberIds) {
    await db.prepare(`INSERT INTO venture_members (venture_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING`).bind(ventureId, uid).run()
  }

  return c.json({ success: true, id: ventureId, slug })
})

ventures.put('/:slug', async (c) => {
  const user = c.get('user')
  if (!canManageVentures(user)) return c.json({ error: 'Only Studio Leadership/Core/Admin can edit portfolio hubs' }, 403)
  const slug = c.req.param('slug')
  const body = await c.req.json().catch(() => null)
  if (!body) return c.json({ error: 'Invalid body' }, 400)

  const db = getDb(c.env)
  await db.prepare(
    `UPDATE ventures SET tagline = COALESCE(?, tagline), description = COALESCE(?, description),
     stage = COALESCE(?, stage), sector = COALESCE(?, sector), status = COALESCE(?, status),
     is_dealflow = COALESCE(?, is_dealflow), ask_amount = COALESCE(?, ask_amount),
     valuation = COALESCE(?, valuation), traction_summary = COALESCE(?, traction_summary)
     WHERE slug = ?`
  ).bind(
    body.tagline ?? null, body.description ?? null, body.stage ?? null, body.sector ?? null,
    body.status ?? null, body.isDealflow !== undefined ? (body.isDealflow ? 1 : 0) : null,
    body.askAmount ?? null, body.valuation ?? null, body.tractionSummary ?? null, slug
  ).run()

  return c.json({ success: true })
})

ventures.post('/:slug/members', async (c) => {
  const user = c.get('user')
  if (!canManageVentures(user)) return c.json({ error: 'Only Studio Leadership/Core/Admin can manage members' }, 403)
  const slug = c.req.param('slug')
  const db = getDb(c.env)
  const venture = await db.prepare(`SELECT id FROM ventures WHERE slug = ?`).bind(slug).first()
  if (!venture) return c.json({ error: 'Venture not found' }, 404)

  const body = await c.req.json().catch(() => null)
  if (!body || !body.userId) return c.json({ error: 'userId is required' }, 400)

  await db.prepare(
    `INSERT INTO venture_members (venture_id, user_id, role_in_venture) VALUES (?, ?, ?) ON CONFLICT DO NOTHING`
  ).bind((venture as any).id, body.userId, body.roleInVenture || 'member').run()

  return c.json({ success: true })
})

ventures.delete('/:slug/members/:userId', async (c) => {
  const user = c.get('user')
  if (!canManageVentures(user)) return c.json({ error: 'Only Studio Leadership/Core/Admin can manage members' }, 403)
  const slug = c.req.param('slug')
  const userId = Number(c.req.param('userId'))
  const db = getDb(c.env)
  const venture = await db.prepare(`SELECT id FROM ventures WHERE slug = ?`).bind(slug).first()
  if (!venture) return c.json({ error: 'Venture not found' }, 404)
  await db.prepare(`DELETE FROM venture_members WHERE venture_id = ? AND user_id = ?`).bind((venture as any).id, userId).run()
  return c.json({ success: true })
})

ventures.delete('/:slug', async (c) => {
  const user = c.get('user')
  if (!canManageVentures(user)) return c.json({ error: 'Only Studio Leadership/Core/Admin can delete portfolio hubs' }, 403)
  const slug = c.req.param('slug')
  const db = getDb(c.env)
  await db.prepare(`DELETE FROM ventures WHERE slug = ?`).bind(slug).run()
  return c.json({ success: true })
})

ventures.get('/:slug/metrics', async (c) => {
  const slug = c.req.param('slug')
  const db = getDb(c.env)
  const venture = await db.prepare(`SELECT id FROM ventures WHERE slug = ?`).bind(slug).first()
  if (!venture) return c.json({ error: 'Venture not found' }, 404)
  const rows = await db.prepare(`SELECT * FROM metrics WHERE venture_id = ? ORDER BY month DESC`).bind((venture as any).id).all()
  return c.json({ metrics: rows.results || [] })
})

ventures.post('/:slug/metrics', async (c) => {
  const user = c.get('user')
  if (!canManageVentures(user) && !(user.roles as any[]).includes('eir')) {
    return c.json({ error: 'Insufficient permissions' }, 403)
  }
  const slug = c.req.param('slug')
  const db = getDb(c.env)
  const venture = await db.prepare(`SELECT id FROM ventures WHERE slug = ?`).bind(slug).first()
  if (!venture) return c.json({ error: 'Venture not found' }, 404)

  const body = await c.req.json().catch(() => null)
  if (!body || !body.month) return c.json({ error: 'Month is required (YYYY-MM)' }, 400)

  await db.prepare(
    `INSERT INTO metrics (venture_id, month, mrr, burn_rate, runway_months, growth_rate, headcount, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(venture_id, month) DO UPDATE SET mrr = EXCLUDED.mrr, burn_rate = EXCLUDED.burn_rate,
     runway_months = EXCLUDED.runway_months, growth_rate = EXCLUDED.growth_rate, headcount = EXCLUDED.headcount, notes = EXCLUDED.notes`
  ).bind(
    (venture as any).id, body.month, body.mrr || 0, body.burnRate || 0, body.runwayMonths || 0,
    body.growthRate || 0, body.headcount || 0, body.notes || null, user.id
  ).run()

  return c.json({ success: true })
})

ventures.get('/dashboard/summary', async (c) => {
  const db = getDb(c.env)
  const rows = await db.prepare(`
    SELECT v.id, v.name, v.logo_emoji, v.stage, v.sector, m.month, m.mrr, m.burn_rate, m.runway_months, m.growth_rate, m.headcount
    FROM ventures v
    LEFT JOIN metrics m ON m.venture_id = v.id AND m.month = (
      SELECT MAX(month) FROM metrics WHERE venture_id = v.id
    )
    ORDER BY v.name ASC
  `).all()
  return c.json({ summary: rows.results || [] })
})

export default ventures
