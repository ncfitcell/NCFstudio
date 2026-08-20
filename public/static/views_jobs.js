async function renderJobsView(container, meta) {
  const [jobsData, venturesData] = await Promise.all([API.getJobs(), API.getVentures()])
  const jobs = jobsData.jobs || []
  const ventures = venturesData.ventures || []
  const u = AppState.user
  const roles = u.roles || []
  const canPost = u.is_admin === 1 || roles.includes('leadership') || roles.includes('core') || roles.includes('eir')
  const openJobs = jobs.filter(j => j.status === 'open')

  container.innerHTML = `
    <div class="max-w-4xl mx-auto p-4 md:p-6 fade-in">
      <div class="flex items-center justify-between mb-4">
        <div class="text-xs text-slate-500">${openJobs.length} open role${openJobs.length !== 1 ? 's' : ''} across the studio</div>
        ${canPost ? `<button id="new-job-btn" class="bg-teal hover:bg-teal-dark text-navy-deep text-sm font-bold px-4 py-1.5 rounded-lg transition"><i class="fa-solid fa-plus mr-1"></i> Post a Role</button>` : ''}
      </div>
      <div class="space-y-3">
        ${jobs.length === 0 ? emptyState('fa-briefcase', 'No open roles yet', 'Check back soon for opportunities across our portfolio.') : jobs.map(jobCard).join('')}
      </div>
    </div>
  `

  qs('#new-job-btn')?.addEventListener('click', () => openJobModal(meta, ventures))

  qsa('.job-close-btn', container).forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await API.updateJob(btn.dataset.id, { status: 'closed' })
        renderMainContent(meta.channel.key)
      } catch (err) { toast(apiErrorMessage(err), 'error') }
    })
  })
  qsa('.job-delete-btn', container).forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this job posting?')) return
      try {
        await API.deleteJob(btn.dataset.id)
        renderMainContent(meta.channel.key)
      } catch (err) { toast(apiErrorMessage(err), 'error') }
    })
  })
}

function jobCard(j) {
  const u = AppState.user
  const canManage = u.is_admin === 1 || j.created_by === u.id
  return `
    <div class="bg-navy-slate border border-white/5 rounded-xl p-4 ${j.status === 'closed' ? 'opacity-50' : ''}">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-bold text-white text-sm">${escapeHtml(j.title)}</span>
            ${statusBadge(j.status)}
            <span class="badge bg-white/5 text-slate-400 border border-white/10">${escapeHtml(j.job_type.replace('-', ' '))}</span>
          </div>
          <div class="text-xs text-slate-500 mt-1">
            ${j.venture_name ? `${j.venture_emoji || ''} ${escapeHtml(j.venture_name)} · ` : 'Studio-wide · '}${escapeHtml(j.location)}
          </div>
          ${j.description ? `<div class="text-sm text-slate-400 mt-2 line-clamp-3">${escapeHtml(j.description)}</div>` : ''}
        </div>
        ${canManage ? `
        <div class="flex items-center gap-2 shrink-0">
          ${j.status === 'open' ? `<button data-id="${j.id}" class="job-close-btn text-[11px] text-slate-500 hover:text-amber border border-white/10 rounded-lg px-2 py-1">Close</button>` : ''}
          <button data-id="${j.id}" class="job-delete-btn text-slate-600 hover:text-red-400 text-xs"><i class="fa-solid fa-trash"></i></button>
        </div>` : ''}
      </div>
    </div>
  `
}

function openJobModal(meta, ventures) {
  const modal = el(`
    <div class="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4">
      <div class="bg-navy-slate border border-white/10 rounded-2xl w-full max-w-lg p-6 fade-in">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-white">Post an Open Role</h3>
          <button class="modal-close-btn text-slate-500 hover:text-white"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-slate-400 mb-1">Job Title</label>
            <input id="job-title" class="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal/50" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 mb-1">Venture (optional)</label>
            <select id="job-venture" class="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal/50">
              <option value="">Studio-wide</option>
              ${ventures.map(v => `<option value="${v.id}">${v.logo_emoji || ''} ${escapeHtml(v.name)}</option>`).join('')}
            </select>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-400 mb-1">Type</label>
              <select id="job-type" class="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal/50">
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="internship">Internship</option>
                <option value="advisory">Advisory</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-400 mb-1">Location</label>
              <input id="job-location" value="Remote" class="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal/50" />
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 mb-1">Description</label>
            <textarea id="job-description" rows="3" class="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:ring-1 focus:ring-teal/50"></textarea>
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-5">
          <button class="modal-close-btn px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
          <button id="job-save-btn" class="bg-teal hover:bg-teal-dark text-navy-deep text-sm font-bold px-5 py-2 rounded-lg transition">Post Role</button>
        </div>
      </div>
    </div>
  `)
  document.body.appendChild(modal)
  qsa('.modal-close-btn', modal).forEach(b => b.addEventListener('click', () => modal.remove()))
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove() })

  qs('#job-save-btn', modal).addEventListener('click', async () => {
    const title = qs('#job-title', modal).value.trim()
    if (!title) return toast('Title is required', 'error')
    try {
      await API.createJob({
        title,
        ventureId: qs('#job-venture', modal).value ? Number(qs('#job-venture', modal).value) : null,
        jobType: qs('#job-type', modal).value,
        location: qs('#job-location', modal).value.trim(),
        description: qs('#job-description', modal).value.trim()
      })
      modal.remove()
      renderMainContent(meta.channel.key)
    } catch (err) { toast(apiErrorMessage(err), 'error') }
  })
}
