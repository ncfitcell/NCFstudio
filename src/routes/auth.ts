import { Hono } from 'hono'
import { setCookie, deleteCookie } from 'hono/cookie'
import { verifyPassword, signJwt } from '../lib/auth'
import { getJwtSecret, authMiddleware } from '../middleware/auth'
import { getDb } from '../lib/db'
import type { Bindings, Variables } from '../lib/types'

const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>()

auth.post('/login', async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body || !body.username || !body.password) {
    return c.json({ error: 'Username and password are required' }, 400)
  }

  const db = getDb(c.env)
  const user = await db.prepare(
    `SELECT * FROM users WHERE username = ?`
  ).bind(body.username.trim().toLowerCase()).first()

  if (!user) {
    return c.json({ error: 'Invalid username or password' }, 401)
  }

  if ((user as any).active === 0) {
    return c.json({ error: 'This account has been deactivated. Contact an administrator.' }, 403)
  }

  const valid = await verifyPassword(body.password, (user as any).password_hash)
  if (!valid) {
    return c.json({ error: 'Invalid username or password' }, 401)
  }

  const roleRows = await db.prepare(
    `SELECT r.key FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = ?`
  ).bind((user as any).id).all()
  const roles = (roleRows.results || []).map((r: any) => r.key)

  const token = await signJwt(
    { sub: (user as any).id, username: (user as any).username, isAdmin: (user as any).is_admin === 1, roles },
    getJwtSecret(c.env)
  )

  setCookie(c, 'ncfvs_token', token, {
    httpOnly: true,
    secure: c.req.url.startsWith('https'),
    sameSite: 'Lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  })

  const { password_hash, ...safeUser } = user as any

  return c.json({ token, user: { ...safeUser, roles } })
})

auth.post('/logout', async (c) => {
  deleteCookie(c, 'ncfvs_token', { path: '/' })
  return c.json({ success: true })
})

auth.get('/me', authMiddleware, async (c) => {
  const user = c.get('user')
  return c.json({ user })
})

export default auth
