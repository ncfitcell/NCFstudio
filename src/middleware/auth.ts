import { Context, Next } from 'hono'
import { getCookie } from 'hono/cookie'
import { verifyJwt } from '../lib/auth'
import { getDb } from '../lib/db'
import type { Bindings, Variables } from '../lib/types'

const DEV_SECRET = 'ncfvs-dev-secret-change-in-production-please'

export function getJwtSecret(env: Bindings): string {
  return env.JWT_SECRET || DEV_SECRET
}

export async function authMiddleware(c: Context<{ Bindings: Bindings; Variables: Variables }>, next: Next) {
  const authHeader = c.req.header('Authorization')
  let token: string | undefined
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7)
  } else {
    token = getCookie(c, 'ncfvs_token')
  }

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const payload = await verifyJwt(token, getJwtSecret(c.env))
  if (!payload) {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }

  const db = getDb(c.env)
  const userRow = await db.prepare(
    `SELECT id, username, name, email, title, bio, skills, avatar_color, is_admin, active FROM users WHERE id = ?`
  ).bind(payload.sub).first()

  if (!userRow || (userRow as any).active === 0) {
    return c.json({ error: 'Account inactive or not found' }, 401)
  }

  const roleRows = await db.prepare(
    `SELECT r.key FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = ?`
  ).bind(payload.sub).all()

  const roles = (roleRows.results || []).map((r: any) => r.key)

  c.set('user', { ...(userRow as any), roles })
  await next()
}

export async function adminOnly(c: Context<{ Bindings: Bindings; Variables: Variables }>, next: Next) {
  const user = c.get('user')
  if (!user || user.is_admin !== 1) {
    return c.json({ error: 'Admin access required' }, 403)
  }
  await next()
}
