const ROADMAP_STATUS_COLORS = { planned: 'border-slate-500 bg-slate-500/10', in_progress: 'border-teal bg-teal/10', done: 'border-emerald-500 bg-emerald-500/10' }

async function renderRoadmapView(container, meta) {
  const data = await API.getRoadmap()
  const items = data.items || []
  const u = AppState.user
  const canManage = u.is_admin === 1 || (u.roles || []).includes('leadership')

  const quarters = [...new Set(items.map(i => i.quarter))]

  container.innerHTML = `
    <div class="max-w-5xl mx-auto p-4 md:p-6 fade-in">
      <div class="flex items-center justify-between mb-5">
        <div class="text-xs text-slate-500">Studio milestones &amp; strategic timeline</div>
        ${canManage ? `<button id="new-roadmap-btn" class="bg-teal hover:bg-teal-dark text-navy-deep text-sm font-bold px-4 py-1.5 rounded-lg transition"><i class="fa-solid fa-plus mr-1"></i> Add Milestone</button>` : ''}
      </div>

      <div class="relative pl-6 border-l-2 border-white/10 space-y-6">
        ${items.length === 0 ? emptyState('fa-map', 'No roadmap items yet', 'Add the first studio milestone.') : quarters.map(q => `
          <div>
            <div class="text-xs font-bold text-teal-light uppercase tracking-wide mb-3 -ml-6 pl-6 relative">
              <span class="absolute -left-[9px] top-1 w-3 h-3 rounded-full bg-teal ring-4 ring-navy"></span>
              ${escapeHtml(q)}
            </div>
            <div class="grid sm:grid-cols-2 gap-3">
              ${items.filter(i => i.quarter === q).map(i => `
                <div class="border rounded-xl p-4 ${ROADMAP_STATUS_COLORS[i.status] || ROADMAP_STATUS_COLORS.planned}">
                  <div class="flex items-start justify-between gap-2">
                    <div class="font-bold text-white text-sm">${escapeHtml(i.title)}</div>
                    ${canManage ? `<button data-id="${i.id}" class="roadmap-delete-btn text-slate-600 hover:text-red-400 text-xs shrink-0"><i class="fa-solid fa-trash"></i></button>` : ''}
                  </div>
                  ${i.description ? `<div class="text-xs text-slate-400 mt-1.5">${escapeHtml(i.description)}</div>` : ''}
                  <div class="mt-2.5">
                    ${canManage ? `
                    <select data-id="${i.id}" class="roadmap-status-select bg-navy border border-white/10 rounded-lg text-[11px] text-slate-300 px-1.5 py-1 focus:outline-none">
                      <option value="planned" ${i.status === 'planned' ? 'selected' : ''}>Planned</option>
                      <option value="in_progress" ${i.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                      <option value="done" ${i.status === 'done' ? 'selected' : ''}>Done</option>
                    </select>
                    ` : statusBadge(i.status)}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `

  qs('#new-roadmap-btn')?.addEventListener('click', () => openRoadmapModal(meta))

  qsa('.roadmap-status-select', container).forEach(sel => {
    sel.addEventListener('change', async () => {
      try {
        await API.updateRoadmapItem(sel.dataset.id, { status: sel.value })
        toast('Updated', 'success')
      } catch (err) { toast(apiErrorMessage(err), 'error') }
    })
  })

  qsa('.roadmap-delete-btn', container).forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this milestone?')) return
      try {
        await API.deleteRoadmapItem(btn.dataset.id)
        renderMainContent(meta.channel.key)
      } catch (err) { toast(apiErrorMessage(err), 'error') }
    })
  })
}

function openRoadmapModal(meta) {
  const modal = el(`
    <div class="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4">
      <div class="bg-navy-slate border border-white/10 rounded-2xl w-full max-w-lg p-6 fade-in">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-white">Add Roadmap Milestone</h3>
          <button class="modal-close-btn text-slate-500 hover:text-white"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-slate-400 mb-1">Title</label>
            <input id="rm-title" class="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal/50" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 mb-1">Quarter</label>
            <input id="rm-quarter" placeholder="e.g. Q1 2027" class="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal/50" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 mb-1">Description</label>
            <textarea id="rm-description" rows="2" class="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:ring-1 focus:ring-teal/50"></textarea>
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-5">
          <button class="modal-close-btn px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
          <button id="rm-save-btn" class="bg-teal hover:bg-teal-dark text-navy-deep text-sm font-bold px-5 py-2 rounded-lg transition">Add</button>
        </div>
      </div>
    </div>
  `)
  document.body.appendChild(modal)
  qsa('.modal-close-btn', modal).forEach(b => b.addEventListener('click', () => modal.remove()))
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove() })

  qs('#rm-save-btn', modal).addEventListener('click', async () => {
    const title = qs('#rm-title', modal).value.trim()
    const quarter = qs('#rm-quarter', modal).value.trim()
    if (!title || !quarter) return toast('Title and quarter are required', 'error')
    try {
      await API.createRoadmapItem({ title, quarter, description: qs('#rm-description', modal).value.trim() })
      modal.remove()
      renderMainContent(meta.channel.key)
    } catch (err) { toast(apiErrorMessage(err), 'error') }
  })
}
