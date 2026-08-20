// Shared UI helper functions

function escapeHtml(str) {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function nl2br(str) {
  return escapeHtml(str).replace(/\n/g, '<br>')
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const d = dayjs(dateStr + (dateStr.includes('Z') ? '' : 'Z'))
  const now = dayjs()
  const diffMin = now.diff(d, 'minute')
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = now.diff(d, 'hour')
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = now.diff(d, 'day')
  if (diffDay < 7) return `${diffDay}d ago`
  return d.format('MMM D, YYYY')
}

function formatDate(dateStr, fmt) {
  if (!dateStr) return ''
  return dayjs(dateStr).format(fmt || 'MMM D, YYYY')
}

function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function avatar(name, color, size) {
  size = size || 8
  const bg = color || '#00B4D8'
  return `<div class="rounded-full flex items-center justify-center font-bold text-white shrink-0" style="width:${size * 4}px;height:${size * 4}px;background:${bg};font-size:${size * 1.3}px">${escapeHtml(initials(name))}</div>`
}

const ROLE_COLORS = {
  leadership: 'bg-amber/15 text-amber border border-amber/30',
  core: 'bg-teal/15 text-teal-light border border-teal/30',
  eir: 'bg-purple-500/15 text-purple-300 border border-purple-500/30',
  academic: 'bg-blue-500/15 text-blue-300 border border-blue-500/30',
  investor: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  mentor: 'bg-pink-500/15 text-pink-300 border border-pink-500/30',
  portfolio_team: 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30',
  corporate: 'bg-orange-500/15 text-orange-300 border border-orange-500/30',
  talent: 'bg-slate-500/15 text-slate-300 border border-slate-500/30'
}

function roleBadge(role) {
  const cls = ROLE_COLORS[role.key] || 'bg-slate-500/15 text-slate-300 border border-slate-500/30'
  return `<span class="badge ${cls}">${escapeHtml(role.label)}</span>`
}

const PRIORITY_COLORS = {
  low: 'bg-slate-500/15 text-slate-300',
  medium: 'bg-teal/15 text-teal-light',
  high: 'bg-amber/15 text-amber',
  urgent: 'bg-red-500/15 text-red-400'
}

function priorityBadge(p) {
  return `<span class="badge ${PRIORITY_COLORS[p] || PRIORITY_COLORS.medium}">${escapeHtml((p || 'medium').toUpperCase())}</span>`
}

const STATUS_COLORS = {
  active: 'bg-emerald-500/15 text-emerald-300',
  in_review: 'bg-amber/15 text-amber',
  archived: 'bg-slate-500/15 text-slate-400',
  pending_request: 'bg-purple-500/15 text-purple-300',
  open: 'bg-emerald-500/15 text-emerald-300',
  approved: 'bg-emerald-500/15 text-emerald-300',
  rejected: 'bg-red-500/15 text-red-400',
  closed: 'bg-slate-500/15 text-slate-400'
}

function statusBadge(s) {
  const label = (s || '').replace(/_/g, ' ')
  return `<span class="badge ${STATUS_COLORS[s] || 'bg-slate-500/15 text-slate-300'}">${escapeHtml(label.toUpperCase())}</span>`
}

function toast(message, type) {
  type = type || 'info'
  const colors = {
    info: 'bg-navy-light border-teal/40 text-teal-light',
    success: 'bg-navy-light border-emerald-500/40 text-emerald-300',
    error: 'bg-navy-light border-red-500/40 text-red-400'
  }
  const icons = { info: 'fa-circle-info', success: 'fa-circle-check', error: 'fa-circle-exclamation' }
  const el = document.createElement('div')
  el.className = `fade-in fixed bottom-5 right-5 z-[9999] px-4 py-3 rounded-lg border shadow-glow flex items-center gap-2 text-sm font-medium ${colors[type]}`
  el.innerHTML = `<i class="fa-solid ${icons[type]}"></i><span>${escapeHtml(message)}</span>`
  document.body.appendChild(el)
  setTimeout(() => {
    el.style.transition = 'opacity 0.3s'
    el.style.opacity = '0'
    setTimeout(() => el.remove(), 300)
  }, 3000)
}

function apiErrorMessage(err) {
  return (err && err.response && err.response.data && err.response.data.error) || 'Something went wrong. Please try again.'
}

function el(html) {
  const div = document.createElement('div')
  div.innerHTML = html.trim()
  return div.firstElementChild
}

function qs(sel, root) { return (root || document).querySelector(sel) }
function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)) }
