async function renderDirectoryView(container, meta) {
  const data = await API.getProfiles()
  const profiles = data.profiles || []

  container.innerHTML = `
    <div class="max-w-5xl mx-auto p-4 md:p-6 fade-in">
      <div class="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div class="relative flex-1 max-w-sm">
          <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
          <input id="dir-search" placeholder="Search by name, skill, or role..." class="w-full bg-navy-slate border border-white/10 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-teal/50" />
        </div>
        <button id="edit-my-profile-btn" class="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-semibold px-3 py-2 rounded-lg transition"><i class="fa-solid fa-pen mr-1"></i> Edit My Profile</button>
      </div>
      <div id="dir-grid" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3"></div>
    </div>
  `

  function renderGrid(list) {
    const grid = qs('#dir-grid')
    if (list.length === 0) { grid.innerHTML = `<div class="col-span-full">${emptyState('fa-user-group', 'No profiles found', 'Try a different search term.')}</div>`; return }
    grid.innerHTML = list.map(p => `
      <div class="bg-navy-slate border border-white/5 rounded-xl p-4 hover:border-teal/20 transition">
        <div class="flex items-center gap-3">
          ${avatar(p.name, p.avatar_color, 10)}
          <div class="min-w-0">
            <div class="font-bold text-white text-sm truncate">${escapeHtml(p.name)}</div>
            <div class="text-xs text-slate-500 truncate">${escapeHtml(p.title || '')}</div>
          </div>
        </div>
        ${p.bio ? `<div class="text-xs text-slate-400 mt-2.5 line-clamp-3">${escapeHtml(p.bio)}</div>` : ''}
        ${p.skills ? `<div class="flex flex-wrap gap-1 mt-2.5">${p.skills.split(',').map(s => s.trim()).filter(Boolean).slice(0, 5).map(s => `<span class="badge bg-white/5 text-slate-400 border border-white/10">${escapeHtml(s)}</span>`).join('')}</div>` : ''}
        <div class="flex flex-wrap gap-1 mt-2.5">${(p.roles || []).map(roleBadge).join('')}</div>
      </div>
    `).join('')
  }

  renderGrid(profiles)

  qs('#dir-search').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim()
    if (!term) return renderGrid(profiles)
    const filtered = profiles.filter(p =>
      p.name.toLowerCase().includes(term) ||
      (p.title || '').toLowerCase().includes(term) ||
      (p.skills || '').toLowerCase().includes(term) ||
      (p.roles || []).some(r => r.label.toLowerCase().includes(term))
    )
    renderGrid(filtered)
  })

  qs('#edit-my-profile-btn').addEventListener('click', () => openProfileEditModal(() => renderMainContent(meta.channel.key)))
}

function openProfileEditModal(onSaved) {
  const u = AppState.user
  const modal = el(`
    <div class="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4">
      <div class="bg-navy-slate border border-white/10 rounded-2xl w-full max-w-lg p-6 fade-in">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-white">Edit My Profile</h3>
          <button class="modal-close-btn text-slate-500 hover:text-white"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-slate-400 mb-1">Title / Role</label>
            <input id="profile-title" value="${escapeHtml(u.title || '')}" placeholder="e.g. Founder & CEO, Venture Alpha" class="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal/50" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 mb-1">Bio / Introduction</label>
            <textarea id="profile-bio" rows="4" placeholder="Tell the studio about yourself..." class="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:ring-1 focus:ring-teal/50">${escapeHtml(u.bio || '')}</textarea>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 mb-1">Skills (comma separated)</label>
            <input id="profile-skills" value="${escapeHtml(u.skills || '')}" placeholder="e.g. Product, Growth, Fundraising" class="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal/50" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 mb-1">Avatar Color</label>
            <input id="profile-color" type="color" value="${u.avatar_color || '#00B4D8'}" class="w-16 h-9 bg-navy border border-white/10 rounded-lg" />
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-5">
          <button class="modal-close-btn px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
          <button id="profile-save-btn" class="bg-teal hover:bg-teal-dark text-navy-deep text-sm font-bold px-5 py-2 rounded-lg transition">Save</button>
        </div>
      </div>
    </div>
  `)
  document.body.appendChild(modal)
  qsa('.modal-close-btn', modal).forEach(b => b.addEventListener('click', () => modal.remove()))
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove() })

  qs('#profile-save-btn', modal).addEventListener('click', async () => {
    try {
      await API.updateProfile({
        title: qs('#profile-title', modal).value.trim(),
        bio: qs('#profile-bio', modal).value.trim(),
        skills: qs('#profile-skills', modal).value.trim(),
        avatarColor: qs('#profile-color', modal).value
      })
      const me = await API.me()
      AppState.user = me.user
      modal.remove()
      toast('Profile updated', 'success')
      renderShell()
      if (onSaved) onSaved()
    } catch (err) { toast(apiErrorMessage(err), 'error') }
  })
}

async function renderProfileView(container) {
  const u = AppState.user
  container.innerHTML = `
    <div class="max-w-2xl mx-auto p-4 md:p-6 fade-in">
      <div class="bg-navy-slate border border-white/5 rounded-2xl p-6">
        <div class="flex items-center gap-4">
          ${avatar(u.name, u.avatar_color, 14)}
          <div>
            <div class="text-xl font-extrabold text-white">${escapeHtml(u.name)}</div>
            <div class="text-sm text-slate-500">${escapeHtml(u.title || u.username)}</div>
          </div>
        </div>
        <div class="flex flex-wrap gap-1.5 mt-4">
          ${u.is_admin === 1 ? '<span class="badge bg-amber/15 text-amber border border-amber/30">ADMIN</span>' : ''}
        </div>
        ${u.bio ? `<div class="text-sm text-slate-400 mt-4 whitespace-pre-wrap">${escapeHtml(u.bio)}</div>` : ''}
        ${u.skills ? `<div class="flex flex-wrap gap-1.5 mt-4">${u.skills.split(',').map(s => s.trim()).filter(Boolean).map(s => `<span class="badge bg-teal/10 text-teal-light border border-teal/20">${escapeHtml(s)}</span>`).join('')}</div>` : ''}
        <button id="profile-edit-btn" class="mt-6 bg-teal hover:bg-teal-dark text-navy-deep text-sm font-bold px-4 py-2 rounded-lg transition"><i class="fa-solid fa-pen mr-1.5"></i>Edit Profile</button>
      </div>
    </div>
  `
  qs('#profile-edit-btn').addEventListener('click', () => openProfileEditModal(() => renderMainContent('__profile')))
}
