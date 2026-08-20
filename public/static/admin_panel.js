let ADMIN_ROLES_CACHE = null

async function renderAdminPanel(container) {
  const [usersData, rolesData] = await Promise.all([API.getAllUsers(), API.getRolesCatalogue()])
  ADMIN_ROLES_CACHE = rolesData.roles || []
  const users = usersData.users || []

  const headerEl = qs('#header-channel-info')
  if (headerEl) headerEl.innerHTML = `<div class="flex items-center gap-2"><span class="text-lg">🛡️</span><div class="text-sm font-bold text-white">Admin Panel</div></div>`

  container.innerHTML = `
    <div class="max-w-6xl mx-auto p-4 md:p-6 fade-in">
      <div class="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div>
          <h2 class="text-lg font-bold text-white">User Management</h2>
          <p class="text-xs text-slate-500">Create users, assign multiple roles, and manage account status.</p>
        </div>
        <button id="new-user-btn" class="bg-teal hover:bg-teal-dark text-navy-deep text-sm font-bold px-4 py-2 rounded-lg transition"><i class="fa-solid fa-user-plus mr-1.5"></i>Create User</button>
      </div>

      <div class="bg-navy-slate border border-white/5 rounded-xl overflow-hidden overflow-x-auto">
        <table class="w-full text-sm min-w-[800px]">
          <thead>
            <tr class="border-b border-white/5 text-left text-xs text-slate-500 uppercase">
              <th class="px-4 py-3">User</th>
              <th class="px-4 py-3">Username</th>
              <th class="px-4 py-3">Roles</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody id="users-tbody"></tbody>
        </table>
      </div>

      <div class="mt-8 flex items-center justify-between mb-3">
        <div>
          <h2 class="text-lg font-bold text-white">Portfolio Hubs</h2>
          <p class="text-xs text-slate-500">Manage dynamic venture workspaces and their team members.</p>
        </div>
        <button id="new-venture-btn-admin" class="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-sm font-semibold px-4 py-2 rounded-lg transition"><i class="fa-solid fa-building mr-1.5"></i>New Portfolio Hub</button>
      </div>
      <div id="ventures-admin-list" class="grid sm:grid-cols-2 gap-3"></div>
    </div>
  `

  function renderUsersTable() {
    qs('#users-tbody').innerHTML = users.map(u => `
      <tr class="border-b border-white/5 hover:bg-white/[0.02] transition">
        <td class="px-4 py-3">
          <div class="flex items-center gap-2.5">
            ${avatar(u.name, u.avatar_color, 7)}
            <div class="min-w-0">
              <div class="font-semibold text-white text-sm truncate">${escapeHtml(u.name)}</div>
              <div class="text-[11px] text-slate-500 truncate">${escapeHtml(u.title || '')}</div>
            </div>
          </div>
        </td>
        <td class="px-4 py-3 text-slate-400 font-mono text-xs">${escapeHtml(u.username)}${u.is_admin ? ' <span class="badge bg-amber/15 text-amber border border-amber/30 ml-1">ADMIN</span>' : ''}</td>
        <td class="px-4 py-3"><div class="flex flex-wrap gap-1 max-w-[220px]">${u.roles.map(roleBadge).join('') || '<span class="text-slate-600 text-xs">No roles assigned</span>'}</div></td>
        <td class="px-4 py-3">${u.active ? '<span class="badge bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">ACTIVE</span>' : '<span class="badge bg-red-500/15 text-red-400 border border-red-500/30">INACTIVE</span>'}</td>
        <td class="px-4 py-3">
          <div class="flex items-center justify-end gap-1.5">
            <button data-id="${u.id}" class="edit-user-btn text-slate-400 hover:text-teal-light p-1.5 rounded hover:bg-white/5" title="Edit"><i class="fa-solid fa-pen text-xs"></i></button>
            <button data-id="${u.id}" class="reset-pw-btn text-slate-400 hover:text-amber p-1.5 rounded hover:bg-white/5" title="Reset Password"><i class="fa-solid fa-key text-xs"></i></button>
            <button data-id="${u.id}" class="toggle-active-btn text-slate-400 hover:text-white p-1.5 rounded hover:bg-white/5" title="${u.active ? 'Deactivate' : 'Activate'}"><i class="fa-solid ${u.active ? 'fa-toggle-on text-emerald-400' : 'fa-toggle-off'} text-xs"></i></button>
            <button data-id="${u.id}" class="delete-user-btn text-slate-400 hover:text-red-400 p-1.5 rounded hover:bg-white/5" title="Delete"><i class="fa-solid fa-trash text-xs"></i></button>
          </div>
        </td>
      </tr>
    `).join('')

    qsa('.edit-user-btn').forEach(btn => btn.addEventListener('click', () => openUserModal(users.find(u => u.id === Number(btn.dataset.id)), refresh)))
    qsa('.reset-pw-btn').forEach(btn => btn.addEventListener('click', () => openResetPasswordModal(Number(btn.dataset.id))))
    qsa('.toggle-active-btn').forEach(btn => btn.addEventListener('click', async () => {
      try {
        await API.toggleUserActive(btn.dataset.id)
        toast('User status updated', 'success')
        refresh()
      } catch (err) { toast(apiErrorMessage(err), 'error') }
    }))
    qsa('.delete-user-btn').forEach(btn => btn.addEventListener('click', async () => {
      if (!confirm('Permanently delete this user? This cannot be undone.')) return
      try {
        await API.deleteUser(btn.dataset.id)
        toast('User deleted', 'success')
        refresh()
      } catch (err) { toast(apiErrorMessage(err), 'error') }
    }))
  }

  async function renderVenturesAdminList() {
    const vData = await API.getVentures()
    const ventures = vData.ventures || []
    const listEl = qs('#ventures-admin-list')
    if (ventures.length === 0) { listEl.innerHTML = `<div class="col-span-full">${emptyState('fa-building', 'No portfolio hubs yet', 'Create your first venture workspace.')}</div>`; return }
    listEl.innerHTML = ventures.map(v => `
      <div class="bg-navy-slate border border-white/5 rounded-xl p-4">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-lg bg-teal/10 flex items-center justify-center text-lg">${v.logo_emoji || '🚀'}</div>
          <div class="min-w-0 flex-1">
            <div class="font-bold text-white text-sm truncate">${escapeHtml(v.name)}</div>
            <div class="text-[11px] text-slate-500 truncate">/${escapeHtml(v.slug)} · ${escapeHtml(v.stage)}</div>
          </div>
          <button data-slug="${v.slug}" class="manage-members-btn text-teal-light hover:text-teal text-xs font-semibold px-2 py-1 rounded hover:bg-white/5">Members</button>
          <button data-slug="${v.slug}" class="delete-venture-btn text-slate-500 hover:text-red-400 text-xs p-1"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
    `).join('')

    qsa('.manage-members-btn', listEl).forEach(btn => btn.addEventListener('click', () => openVentureMembersModal(ventures.find(v => v.slug === btn.dataset.slug))))
    qsa('.delete-venture-btn', listEl).forEach(btn => btn.addEventListener('click', async () => {
      if (!confirm('Delete this portfolio hub and all its data?')) return
      try {
        await API.deleteVenture(btn.dataset.slug)
        toast('Portfolio hub deleted', 'success')
        renderVenturesAdminList()
        const nav = await API.nav(); AppState.nav = nav; renderSidebarNav()
      } catch (err) { toast(apiErrorMessage(err), 'error') }
    }))
  }

  async function refresh() {
    const fresh = await API.getAllUsers()
    users.length = 0
    users.push(...(fresh.users || []))
    renderUsersTable()
  }

  renderUsersTable()
  renderVenturesAdminList()

  qs('#new-user-btn').addEventListener('click', () => openUserModal(null, refresh))
  qs('#new-venture-btn-admin').addEventListener('click', () => openCreateVentureModal(renderVenturesAdminList))
}

function openUserModal(user, onSaved) {
  const isEdit = !!user
  const modal = el(`
    <div class="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div class="bg-navy-slate border border-white/10 rounded-2xl w-full max-w-lg p-6 fade-in my-8">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-white">${isEdit ? 'Edit User' : 'Create New User'}</h3>
          <button class="modal-close-btn text-slate-500 hover:text-white"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-400 mb-1">Full Name</label>
              <input id="u-name" value="${user ? escapeHtml(user.name) : ''}" class="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal/50" />
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-400 mb-1">Username ${isEdit ? '(locked)' : ''}</label>
              <input id="u-username" ${isEdit ? 'disabled' : ''} value="${user ? escapeHtml(user.username) : ''}" class="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal/50 ${isEdit ? 'opacity-50' : ''}" />
            </div>
          </div>
          ${!isEdit ? `
          <div>
            <label class="block text-xs font-medium text-slate-400 mb-1">Password</label>
            <input id="u-password" type="text" placeholder="Set an initial password" class="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal/50" />
          </div>` : ''}
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-400 mb-1">Email</label>
              <input id="u-email" value="${user ? escapeHtml(user.email || '') : ''}" class="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal/50" />
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-400 mb-1">Title</label>
              <input id="u-title" value="${user ? escapeHtml(user.title || '') : ''}" class="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal/50" />
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 mb-2">Assign Roles (multi-select)</label>
            <div class="grid grid-cols-2 gap-2">
              ${ADMIN_ROLES_CACHE.map(r => `
                <label class="flex items-center gap-2 text-xs text-slate-300 bg-navy border border-white/10 rounded-lg px-2.5 py-2 cursor-pointer hover:border-teal/30 transition">
                  <input type="checkbox" class="role-checkbox accent-teal" value="${r.key}" ${user && user.roles.some(ur => ur.key === r.key) ? 'checked' : ''} />
                  ${escapeHtml(r.label)}
                </label>
              `).join('')}
            </div>
          </div>
          <label class="flex items-center gap-2 text-xs text-slate-300 pt-1">
            <input type="checkbox" id="u-is-admin" class="accent-amber" ${user && user.is_admin ? 'checked' : ''} />
            Grant full Admin privileges (bypasses all role restrictions)
          </label>
        </div>
        <div class="flex justify-end gap-2 mt-5">
          <button class="modal-close-btn px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
          <button id="u-save-btn" class="bg-teal hover:bg-teal-dark text-navy-deep text-sm font-bold px-5 py-2 rounded-lg transition">${isEdit ? 'Save Changes' : 'Create User'}</button>
        </div>
      </div>
    </div>
  `)
  document.body.appendChild(modal)
  qsa('.modal-close-btn', modal).forEach(b => b.addEventListener('click', () => modal.remove()))
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove() })

  qs('#u-save-btn', modal).addEventListener('click', async () => {
    const name = qs('#u-name', modal).value.trim()
    const username = qs('#u-username', modal).value.trim()
    if (!name || !username) return toast('Name and username are required', 'error')
    const roles = qsa('.role-checkbox:checked', modal).map(cb => cb.value)
    const payload = {
      name, username,
      email: qs('#u-email', modal).value.trim(),
      title: qs('#u-title', modal).value.trim(),
      roles,
      isAdmin: qs('#u-is-admin', modal).checked
    }
    if (!isEdit) {
      const password = qs('#u-password', modal).value
      if (!password || password.length < 4) return toast('Password must be at least 4 characters', 'error')
      payload.password = password
    }
    try {
      if (isEdit) await API.updateUser(user.id, payload)
      else await API.createUser(payload)
      modal.remove()
      toast(isEdit ? 'User updated' : 'User created', 'success')
      if (onSaved) onSaved()
    } catch (err) { toast(apiErrorMessage(err), 'error') }
  })
}

function openResetPasswordModal(userId) {
  const modal = el(`
    <div class="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4">
      <div class="bg-navy-slate border border-white/10 rounded-2xl w-full max-w-sm p-6 fade-in">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-white">Reset Password</h3>
          <button class="modal-close-btn text-slate-500 hover:text-white"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <label class="block text-xs font-medium text-slate-400 mb-1">New Password</label>
        <input id="reset-pw-input" type="text" class="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal/50" />
        <div class="flex justify-end gap-2 mt-5">
          <button class="modal-close-btn px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
          <button id="reset-pw-save-btn" class="bg-teal hover:bg-teal-dark text-navy-deep text-sm font-bold px-5 py-2 rounded-lg transition">Reset</button>
        </div>
      </div>
    </div>
  `)
  document.body.appendChild(modal)
  qsa('.modal-close-btn', modal).forEach(b => b.addEventListener('click', () => modal.remove()))
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove() })

  qs('#reset-pw-save-btn', modal).addEventListener('click', async () => {
    const password = qs('#reset-pw-input', modal).value
    if (!password || password.length < 4) return toast('Password must be at least 4 characters', 'error')
    try {
      await API.resetUserPassword(userId, password)
      modal.remove()
      toast('Password reset successfully', 'success')
    } catch (err) { toast(apiErrorMessage(err), 'error') }
  })
}

async function openVentureMembersModal(venture) {
  const [membersData, usersData] = await Promise.all([API.getVentureMembers(venture.slug), API.getUsersLite()])
  const members = membersData.members || []
  const allUsers = usersData.users || []
  const memberIds = new Set(members.map(m => m.id))
  const available = allUsers.filter(u => !memberIds.has(u.id))

  const modal = el(`
    <div class="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div class="bg-navy-slate border border-white/10 rounded-2xl w-full max-w-md p-6 fade-in my-8">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-white">${venture.logo_emoji || '🚀'} ${escapeHtml(venture.name)} — Team</h3>
          <button class="modal-close-btn text-slate-500 hover:text-white"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="space-y-2 mb-4" id="members-list">
          ${members.length === 0 ? '<div class="text-xs text-slate-500 py-2">No team members assigned yet.</div>' : members.map(m => `
            <div class="flex items-center gap-2 bg-navy rounded-lg px-3 py-2">
              ${avatar(m.name, m.avatar_color, 6)}
              <span class="text-sm text-white flex-1">${escapeHtml(m.name)}</span>
              <button data-user-id="${m.id}" class="remove-member-btn text-slate-500 hover:text-red-400 text-xs"><i class="fa-solid fa-xmark"></i></button>
            </div>
          `).join('')}
        </div>
        <div class="flex gap-2">
          <select id="add-member-select" class="flex-1 bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal/50">
            <option value="">Select a user to add...</option>
            ${available.map(u => `<option value="${u.id}">${escapeHtml(u.name)}</option>`).join('')}
          </select>
          <button id="add-member-btn" class="bg-teal hover:bg-teal-dark text-navy-deep text-sm font-bold px-4 py-2 rounded-lg transition">Add</button>
        </div>
      </div>
    </div>
  `)
  document.body.appendChild(modal)
  qsa('.modal-close-btn', modal).forEach(b => b.addEventListener('click', () => modal.remove()))
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove() })

  qs('#add-member-btn', modal).addEventListener('click', async () => {
    const userId = qs('#add-member-select', modal).value
    if (!userId) return
    try {
      await API.addVentureMember(venture.slug, Number(userId))
      modal.remove()
      toast('Member added', 'success')
      openVentureMembersModal(venture)
    } catch (err) { toast(apiErrorMessage(err), 'error') }
  })

  qsa('.remove-member-btn', modal).forEach(btn => btn.addEventListener('click', async () => {
    try {
      await API.removeVentureMember(venture.slug, btn.dataset.userId)
      modal.remove()
      toast('Member removed', 'success')
      openVentureMembersModal(venture)
    } catch (err) { toast(apiErrorMessage(err), 'error') }
  }))
}

async function openCreateVentureModal(onSaved) {
  const usersData = await API.getUsersLite()
  const allUsers = usersData.users || []

  const modal = el(`
    <div class="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div class="bg-navy-slate border border-white/10 rounded-2xl w-full max-w-lg p-6 fade-in my-8">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-white">Create Portfolio Hub</h3>
          <button class="modal-close-btn text-slate-500 hover:text-white"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="space-y-3">
          <div class="grid grid-cols-[1fr_80px] gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-400 mb-1">Venture Name</label>
              <input id="v-name" placeholder="e.g. Venture Alpha" class="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal/50" />
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-400 mb-1">Emoji</label>
              <input id="v-emoji" value="🚀" class="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white text-center focus:outline-none focus:ring-1 focus:ring-teal/50" />
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 mb-1">Tagline</label>
            <input id="v-tagline" class="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal/50" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 mb-1">Description</label>
            <textarea id="v-description" rows="2" class="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:ring-1 focus:ring-teal/50"></textarea>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-400 mb-1">Stage</label>
              <select id="v-stage" class="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal/50">
                <option value="ideation">Ideation</option>
                <option value="mvp">MVP / Build</option>
                <option value="scale">Scale / Fundraise</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-400 mb-1">Sector</label>
              <input id="v-sector" class="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal/50" />
            </div>
          </div>
          <label class="flex items-center gap-2 text-xs text-slate-300">
            <input type="checkbox" id="v-dealflow" class="accent-teal" /> List in Investor Dealflow board
          </label>
          <div>
            <label class="block text-xs font-medium text-slate-400 mb-2">Assign Team Members</label>
            <div class="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
              ${allUsers.map(u => `
                <label class="flex items-center gap-2 text-xs text-slate-300 bg-navy border border-white/10 rounded-lg px-2.5 py-1.5 cursor-pointer">
                  <input type="checkbox" class="member-checkbox accent-teal" value="${u.id}" /> ${escapeHtml(u.name)}
                </label>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-5">
          <button class="modal-close-btn px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
          <button id="v-save-btn" class="bg-teal hover:bg-teal-dark text-navy-deep text-sm font-bold px-5 py-2 rounded-lg transition">Create</button>
        </div>
      </div>
    </div>
  `)
  document.body.appendChild(modal)
  qsa('.modal-close-btn', modal).forEach(b => b.addEventListener('click', () => modal.remove()))
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove() })

  qs('#v-save-btn', modal).addEventListener('click', async () => {
    const name = qs('#v-name', modal).value.trim()
    if (!name) return toast('Venture name is required', 'error')
    const memberIds = qsa('.member-checkbox:checked', modal).map(cb => Number(cb.value))
    try {
      await API.createVenture({
        name,
        logoEmoji: qs('#v-emoji', modal).value.trim() || '🚀',
        tagline: qs('#v-tagline', modal).value.trim(),
        description: qs('#v-description', modal).value.trim(),
        stage: qs('#v-stage', modal).value,
        sector: qs('#v-sector', modal).value.trim(),
        isDealflow: qs('#v-dealflow', modal).checked,
        memberIds
      })
      modal.remove()
      toast('Portfolio hub created', 'success')
      const nav = await API.nav(); AppState.nav = nav; renderSidebarNav()
      if (onSaved) onSaved()
    } catch (err) { toast(apiErrorMessage(err), 'error') }
  })
}
