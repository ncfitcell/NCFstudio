import { Hono } from 'hono'
import { authMiddleware } from '../middleware/auth'
import { checkChannelAccess } from '../lib/access'
import { CATEGORIES, PORTFOLIO_SUBCHANNELS, ventureChannelKey } from '../lib/channels'
import { getDb } from '../lib/db'
import type { Bindings, Variables } from '../lib/types'

const channels = new Hono<{ Bindings: Bindings; Variables: Variables }>()

channels.use('*', authMiddleware)

channels.get('/nav', async (c) => {
  const user = c.get('user')
  const roles = user.roles as any[]
  const isAdmin = user.is_admin === 1
  const db = getDb(c.env)

  const staticNav = CATEGORIES.map((cat) => {
    const visibleChannels = cat.channels.filter((ch) => {
      if (isAdmin) return true
      if (ch.roles === 'public') return true
      return ch.roles.some((r) => roles.includes(r))
    })
    return { ...cat, channels: visibleChannels }
  }).filter((cat) => cat.channels.length > 0)

  let ventureRows
  if (isAdmin || roles.includes('leadership') || roles.includes('core')) {
    ventureRows = await db.prepare(`SELECT * FROM ventures ORDER BY created_at DESC`).all()
  } else {
    ventureRows = await db.prepare(
      `SELECT v.* FROM ventures v JOIN venture_members vm ON vm.venture_id = v.id WHERE vm.user_id = ? ORDER BY v.created_at DESC`
    ).bind(user.id).all()
  }

  const ventures = (ventureRows.results || []).map((v: any) => ({
    ...v,
    channels: PORTFOLIO_SUBCHANNELS.map((sc) => ({
      key: ventureChannelKey(v.slug, sc.suffix),
      name: sc.name,
      icon: sc.icon,
      type: sc.type,
      description: `${sc.name} for ${v.name}`
    }))
  }))

  return c.json({ categories: staticNav, ventures })
})

channels.get('/access/:key', async (c) => {
  const user = c.get('user')
  const key = c.req.param('key')
  const db = getDb(c.env)
  const result = await checkChannelAccess(db, user, key, 'read')
  const writeResult = await checkChannelAccess(db, user, key, 'write')
  return c.json({ ...result, canWrite: writeResult.allowed })
})

export default channels
