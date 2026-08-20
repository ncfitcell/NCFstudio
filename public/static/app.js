// Global application state
const AppState = {
  user: null,
  nav: null, // { categories, ventures }
  currentChannel: null, // channel key string, or special views like '__admin', '__profile'
  currentChannelMeta: null,
  collapsedCategories: JSON.parse(localStorage.getItem('ncfvs_collapsed') || '{}'),
  sidebarOpen: false // mobile
}

function saveCollapsedState() {
  localStorage.setItem('ncfvs_collapsed', JSON.stringify(AppState.collapsedCategories))
}

async function bootApp() {
  try {
    if (!AppState.user) {
      const meData = await API.me()
      AppState.user = meData.user
    }
    const navData = await API.nav()
    AppState.nav = navData
    renderShell()
    // Pick first available channel
    const firstChannel = findFirstChannel()
    navigateTo(firstChannel || '__welcome')
  } catch (err) {
    renderLogin()
  }
}

function findFirstChannel() {
  if (AppState.nav.categories.length > 0 && AppState.nav.categories[0].channels.length > 0) {
    return AppState.nav.categories[0].channels[0].key
  }
  return null
}

function isAdmin() {
  const u = AppState.user
  return u && u.is_admin === 1
}

function isAdminOrLeadership() {
  const u = AppState.user
  return u && (u.is_admin === 1 || (u.roles || []).includes('leadership'))
}

function findChannelMeta(key) {
  if (!AppState.nav) return null
  for (const cat of AppState.nav.categories) {
    for (const ch of cat.channels) {
      if (ch.key === key) return { channel: ch, category: cat }
    }
  }
  for (const v of AppState.nav.ventures) {
    for (const ch of v.channels) {
      if (ch.key === key) return { channel: ch, category: { name: v.name, icon: v.logo_emoji }, venture: v }
    }
  }
  return null
}

function navigateTo(channelKey) {
  AppState.currentChannel = channelKey
  AppState.sidebarOpen = false
  renderShell()
  renderMainContent(channelKey)
}

function renderShell() {
  const root = document.getElementById('root')
  const u = AppState.user

  root.innerHTML = `
    <div class="h-screen flex overflow-hidden bg-navy">
      <!-- Mobile overlay -->
      <div id="mobile-overlay" class="fixed inset-0 bg-black/60 z-30 md:hidden ${AppState.sidebarOpen ? '' : 'hidden'}"></div>

      <!-- Sidebar -->
      <aside id="sidebar" class="fixed md:static z-40 md:z-auto h-full w-72 bg-navy-deep border-r border-white/5 flex flex-col transition-transform duration-200 ${AppState.sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}">
        <div class="h-16 flex items-center gap-2.5 px-4 border-b border-white/5 shrink-0">
          <div class="w-9 h-9 rounded-lg gradient-purple flex items-center justify-center shrink-0">
            <i class="fa-solid fa-rocket text-white text-sm"></i>
          </div>
          <div class="min-w-0">
            <div class="text-sm font-bold text-white leading-tight truncate">NCF Venture Studio</div>
            <div class="text-[11px] text-slate-500 leading-tight">Operations Hub</div>
          </div>
          <button id="sidebar-close-btn" class="ml-auto md:hidden text-slate-400 hover:text-white p-1">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="px-3 pt-3">
          <div class="relative">
            <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
            <input id="channel-search" placeholder="Search channels..." class="w-full bg-navy border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-teal/50" />
          </div>
        </div>

        <nav id="sidebar-nav" class="flex-1 overflow-y-auto sidebar-scroll px-2 py-3 space-y-1"></nav>

        <div class="border-t border-white/5 p-3 shrink-0">
          <button id="sidebar-profile-btn" class="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/5 transition text-left">
            ${avatar(u.name, u.avatar_color, 8)}
            <div class="min-w-0 flex-1">
              <div class="text-xs font-semibold text-white truncate">${escapeHtml(u.name)}</div>
              <div class="text-[10px] text-slate-500 truncate">${escapeHtml(u.title || u.username)}</div>
            </div>
            <i class="fa-solid fa-gear text-slate-500 text-xs"></i>
          </button>
        </div>
      </aside>

      <!-- Main -->
      <div class="flex-1 flex flex-col min-w-0">
        <!-- Header -->
        <header class="h-16 bg-navy-slate border-b border-white/5 flex items-center gap-3 px-4 md:px-6 shrink-0">
          <button id="sidebar-open-btn" class="md:hidden text-slate-300 hover:text-white p-1">
            <i class="fa-solid fa-bars"></i>
          </button>

          <div id="header-channel-info" class="min-w-0 flex-1"></div>

          <div class="hidden md:flex items-center gap-1.5 bg-navy border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-500 w-64">
            <i class="fa-solid fa-magnifying-glass"></i>
            <span>Search this workspace...</span>
          </div>

          <div class="flex items-center gap-2">
            <div class="hidden lg:flex items-center gap-1 flex-wrap max-w-xs justify-end">
              ${(AppState.nav.userRoleBadges || getUserRoleBadges())}
            </div>
            ${isAdmin() ? `
            <button id="admin-panel-btn" class="flex items-center gap-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-xs font-semibold px-3 py-1.5 rounded-lg transition">
              <i class="fa-solid fa-shield-halved"></i><span class="hidden sm:inline">Admin Panel</span>
            </button>` : ''}
            <button id="logout-btn" class="text-slate-400 hover:text-red-400 p-2 rounded-lg hover:bg-white/5 transition" title="Sign out">
              <i class="fa-solid fa-right-from-bracket"></i>
            </button>
          </div>
        </header>

        <!-- Content -->
        <main id="main-content" class="flex-1 overflow-y-auto bg-navy"></main>
      </div>
    </div>
  `

  renderSidebarNav()
  bindShellEvents()
}

function getUserRoleBadges() {
  const u = AppState.user
  const labels = { leadership: 'Leadership', core: 'Core Team', eir: 'EIR/Founder', academic: 'Academic', investor: 'Investor', mentor: 'Mentor', portfolio_team: 'Portfolio Team', corporate: 'Corporate', talent: 'Talent Pool' }
  if (u.is_admin === 1) return `<span class="badge bg-amber/15 text-amber border border-amber/30">ADMIN</span>`
  return (u.roles || []).slice(0, 2).map(r => `<span class="badge ${ROLE_COLORS[r] || 'bg-slate-500/15 text-slate-300'}">${escapeHtml(labels[r] || r)}</span>`).join('')
}

function renderSidebarNav() {
  const navEl = qs('#sidebar-nav')
  const { categories, ventures } = AppState.nav
  let html = ''

  for (const cat of categories) {
    const collapsed = AppState.collapsedCategories[cat.key]
    html += renderCategoryBlock(cat.key, cat.name, cat.icon, cat.channels, collapsed)
  }

  if (ventures && ventures.length > 0) {
    html += `<div class="pt-2 pb-1 px-2 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Portfolio Hubs</div>`
    for (const v of ventures) {
      const collapsed = AppState.collapsedCategories['venture:' + v.slug]
      html += renderCategoryBlock('venture:' + v.slug, v.name, v.logo_emoji || '🚀', v.channels, collapsed, v)
    }
    if (isAdminOrLeadership()) {
      html += `<button id="create-venture-btn" class="w-full mt-1 flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-500 hover:text-teal-light hover:bg-white/5 transition border border-dashed border-white/10">
        <i class="fa-solid fa-plus"></i> New Portfolio Hub
      </button>`
    }
  } else if (isAdminOrLeadership()) {
    html += `<div class="pt-2 pb-1 px-2 text-[10px] font-bold text-slate-600 uppercase tracking-wider">Portfolio Hubs</div>`
    html += `<button id="create-venture-btn" class="w-full mt-1 flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-500 hover:text-teal-light hover:bg-white/5 transition border border-dashed border-white/10">
      <i class="fa-solid fa-plus"></i> New Portfolio Hub
    </button>`
  }

  navEl.innerHTML = html

  qsa('.category-toggle', navEl).forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key
      AppState.collapsedCategories[key] = !AppState.collapsedCategories[key]
      saveCollapsedState()
      renderSidebarNav()
    })
  })

  qsa('.channel-link', navEl).forEach(link => {
    link.addEventListener('click', () => navigateTo(link.dataset.key))
  })

  const createVentureBtn = qs('#create-venture-btn', navEl)
  if (createVentureBtn) createVentureBtn.addEventListener('click', openCreateVentureModal)

  highlightActiveChannel()
}

function renderCategoryBlock(key, name, icon, channels, collapsed, venture) {
  const chevron = collapsed ? 'fa-chevron-right' : 'fa-chevron-down'
  const items = channels.map(ch => `
    <button data-key="${ch.key}" class="channel-link w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] text-slate-400 hover:text-slate-200 hover:bg-white/5 transition text-left group">
      <span class="w-4 text-center text-[11px] opacity-70">${ch.icon || '#'}</span>
      <span class="truncate flex-1">${escapeHtml(ch.name)}</span>
    </button>
  `).join('')

  return `
    <div class="mb-0.5">
      <button data-key="${key}" class="category-toggle w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-bold text-slate-500 hover:text-slate-300 uppercase tracking-wide transition">
        <i class="fa-solid ${chevron} text-[9px] w-2.5"></i>
        <span class="truncate">${icon} ${escapeHtml(name)}</span>
      </button>
      ${collapsed ? '' : `<div class="space-y-0.5 mt-0.5">${items}</div>`}
    </div>
  `
}

function highlightActiveChannel() {
  qsa('.channel-link').forEach(l => l.classList.toggle('active', l.dataset.key === AppState.currentChannel))
}

function bindShellEvents() {
  qs('#sidebar-open-btn')?.addEventListener('click', () => { AppState.sidebarOpen = true; renderShell(); renderMainContent(AppState.currentChannel) })
  qs('#sidebar-close-btn')?.addEventListener('click', () => { AppState.sidebarOpen = false; renderShell(); renderMainContent(AppState.currentChannel) })
  qs('#mobile-overlay')?.addEventListener('click', () => { AppState.sidebarOpen = false; renderShell(); renderMainContent(AppState.currentChannel) })
  qs('#logout-btn')?.addEventListener('click', async () => {
    try { await API.logout() } catch {}
    AppState.user = null
    AppState.nav = null
    renderLogin()
  })
  qs('#sidebar-profile-btn')?.addEventListener('click', () => navigateTo('__profile'))
  qs('#admin-panel-btn')?.addEventListener('click', () => navigateTo('__admin'))

  const searchInput = qs('#channel-search')
  searchInput?.addEventListener('input', () => {
    const term = searchInput.value.toLowerCase().trim()
    qsa('.channel-link').forEach(link => {
      const text = link.textContent.toLowerCase()
      link.parentElement && (link.style.display = !term || text.includes(term) ? '' : 'none')
    })
  })
}

async function renderMainContent(channelKey) {
  const container = qs('#main-content')
  container.innerHTML = `<div class="h-full flex items-center justify-center"><div class="spinner"></div></div>`

  if (channelKey === '__profile') return renderProfileView(container)
  if (channelKey === '__admin') {
    if (!isAdmin()) {
      container.innerHTML = `<div class="h-full flex items-center justify-center text-slate-500">Access restricted to Administrators.</div>`
      return
    }
    return renderAdminPanel(container)
  }
  if (channelKey === '__welcome') return renderWelcomeView(container)

  const meta = findChannelMeta(channelKey)
  if (!meta) {
    container.innerHTML = `<div class="h-full flex items-center justify-center text-slate-500">Channel not found or access denied.</div>`
    return
  }
  AppState.currentChannelMeta = meta

  renderHeaderChannelInfo(meta)

  const type = meta.channel.type
  try {
    switch (type) {
      case 'rules': return renderRulesView(container, meta)
      case 'announcement': return renderDiscussionView(container, meta, true)
      case 'discussion': return renderDiscussionView(container, meta, false)
      case 'kanban': return renderKanbanView(container, meta)
      case 'document': return renderDocumentView(container, meta)
      case 'gate': return renderGateView(container, meta)
      case 'directory': return renderDirectoryView(container, meta)
      case 'jobs': return renderJobsView(container, meta)
      case 'events': return renderEventsView(container, meta)
      case 'roadmap': return renderRoadmapView(container, meta)
      case 'dealflow': return renderDealflowView(container, meta)
      case 'dashboard': return renderDashboardView(container, meta)
      default: container.innerHTML = `<div class="p-8 text-slate-500">Unsupported channel type.</div>`
    }
  } catch (err) {
    container.innerHTML = `<div class="p-8 text-red-400">${escapeHtml(apiErrorMessage(err))}</div>`
  }
}

function renderHeaderChannelInfo(meta) {
  const headerEl = qs('#header-channel-info')
  if (!headerEl) return
  headerEl.innerHTML = `
    <div class="flex items-center gap-2 min-w-0">
      <span class="text-lg">${meta.channel.icon}</span>
      <div class="min-w-0">
        <div class="text-sm font-bold text-white truncate">${escapeHtml(meta.channel.name)}</div>
        <div class="text-[11px] text-slate-500 truncate hidden sm:block">${escapeHtml(meta.channel.description || '')}</div>
      </div>
    </div>
  `
}

function renderWelcomeView(container) {
  const u = AppState.user
  container.innerHTML = `
    <div class="p-6 md:p-10 max-w-4xl mx-auto fade-in">
      <div class="mb-2 text-3xl">👋</div>
      <h1 class="text-2xl font-extrabold text-white mb-2">Welcome, ${escapeHtml(u.name.split(' ')[0])}</h1>
      <p class="text-slate-400 mb-8">Select a channel from the sidebar to get started, or explore the sections below.</p>
      <div class="grid sm:grid-cols-2 gap-4">
        ${AppState.nav.categories.map(cat => `
          <div class="bg-navy-slate border border-white/5 rounded-xl p-4">
            <div class="font-bold text-white text-sm mb-2">${cat.icon} ${escapeHtml(cat.name)}</div>
            <div class="flex flex-wrap gap-1.5">
              ${cat.channels.slice(0, 5).map(ch => `<span class="badge bg-white/5 text-slate-400 border border-white/10">${ch.icon} ${escapeHtml(ch.name)}</span>`).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `
}

document.addEventListener('DOMContentLoaded', () => {
  bootApp()
})
