import { findChannel, hasAccess as staticHasAccess, canPost as staticCanPost, Channel } from './channels'
import type { AuthUser } from './types'
import type { DbAdapter } from './db'

export interface ResolvedChannel {
  channel: Channel
  isVenture: boolean
  ventureSlug?: string
  ventureId?: number
}

// Parses "venture:<slug>:<suffix>" dynamic channel keys
export function parseVentureChannel(key: string): { slug: string; suffix: string } | null {
  if (!key.startsWith('venture:')) return null
  const parts = key.split(':')
  if (parts.length !== 3) return null
  return { slug: parts[1], suffix: parts[2] }
}

const VENTURE_SUB_META: Record<string, { name: string; icon: string; type: Channel['type'] }> = {
  announcements: { name: 'announcements', icon: '📢', type: 'announcement' },
  general: { name: 'general', icon: '💬', type: 'discussion' },
  'dev-and-product': { name: 'dev-and-product', icon: '🧑‍💻', type: 'kanban' },
  'growth-marketing': { name: 'growth-marketing', icon: '📈', type: 'discussion' }
}

export async function checkChannelAccess(
  db: DbAdapter,
  user: AuthUser,
  channelKey: string,
  mode: 'read' | 'write' = 'read'
): Promise<{ allowed: boolean; reason?: string }> {
  if (user.is_admin === 1) return { allowed: true }

  const roles = user.roles as any[]

  const ventureRef = parseVentureChannel(channelKey)
  if (ventureRef) {
    // Leadership & Core always have access to all portfolio hubs
    if (roles.includes('leadership') || roles.includes('core')) return { allowed: true }

    const venture = await db.prepare(`SELECT id FROM ventures WHERE slug = ?`).bind(ventureRef.slug).first()
    if (!venture) return { allowed: false, reason: 'Venture not found' }

    const membership = await db.prepare(
      `SELECT 1 FROM venture_members WHERE venture_id = ? AND user_id = ?`
    ).bind((venture as any).id, user.id).first()

    if (!membership) return { allowed: false, reason: 'Not a member of this venture workspace' }
    return { allowed: true }
  }

  const found = findChannel(channelKey)
  if (!found) return { allowed: false, reason: 'Channel not found' }

  const readOk = staticHasAccess(roles, false, found.channel.roles)
  if (!readOk) return { allowed: false, reason: 'Insufficient role permissions' }

  if (mode === 'write') {
    const writeOk = staticCanPost(roles, false, found.channel)
    if (!writeOk) return { allowed: false, reason: 'You do not have posting rights in this channel' }
  }

  return { allowed: true }
}

export function ventureSubChannelMeta(suffix: string) {
  return VENTURE_SUB_META[suffix] || { name: suffix, icon: '📁', type: 'discussion' as Channel['type'] }
}
