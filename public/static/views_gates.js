async function renderGateView(container, meta) {
  const [data, venturesData] = await Promise.all([API.getGates(meta.channel.key), API.getVentures()])
  const gates = data.gates || []
  const canWrite = data.canWrite
  const canVote = data.canVote
  const ventures = venturesData.ventures || []

  container.innerHTML = `
    <div class="max-w-3xl mx-auto p-4 md:p-6 fade-in">
      <div class="bg-gradient-to-br from-purple-900/20 to-navy-slate border border-purple-500/20 rounded-xl p-4 mb-5 flex items-start gap-3">
        <i class="fa-solid fa-gavel text-purple-300 mt-0.5"></i>
        <div>
          <div class="font-bold text-white text-sm">${escapeHtml(meta.channel.name)}</div>
          <div class="text-xs text-slate-400 mt-0.5">${escapeHtml(meta.channel.description)}</div>
          ${canVote ? `<div class="text-[11px] text-purple-300 mt-1"><i class="fa-solid fa-check-circle mr-1"></i>You are eligible to cast a formal Investment Committee vote.</div>` : `<div class="text-[11px] text-slate-500 mt-1"><i class="fa-solid fa-eye mr-1"></i>You have read-only visibility into this gate.</div>`}
        </div>
      </div>

      ${canWrite ? `<button id="new-gate-btn" class="mb-5 bg-teal hover:bg-teal-dark text-navy-deep text-sm font-bold px-4 py-1.5 rounded-lg transition"><i class="fa-solid fa-plus mr-1"></i> Submit for Gate Review</button>` : ''}

      <div class="space-y-4">
        ${gates.length === 0 ? emptyState('fa-gavel', 'No items pending review', 'Nothing has been submitted to this stage gate yet.') : gates.map(g => gateCard(g, canVote)).join('')}
      </div>
    </div>
  `

  qs('#new-gate-btn')?.addEventListener('click', () => openGateModal(meta, ventures))

  qsa('.vote-btn', container).forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await API.voteGate(meta.channel.key, btn.dataset.id, btn.dataset.vote)
        toast('Vote recorded', 'success')
        renderMainContent(meta.channel.key)
      } catch (err) { toast(apiErrorMessage(err), 'error') }
    })
  })

  qsa('.resolve-btn', container).forEach(btn => {
    btn.addEventListener('click', async () => {
      const status = btn.dataset.status
      if (!confirm(`Mark this gate as ${status.toUpperCase()}? This action finalizes the committee decision.`)) return
      try {
        await API.resolveGate(meta.channel.key, btn.dataset.id, status)
        toast(`Gate ${status}`, 'success')
        renderMainContent(meta.channel.key)
      } catch (err) { toast(apiErrorMessage(err), 'error') }
    })
  })
}

function gateCard(g, canVote) {
  const total = g.tally.approve + g.tally.reject + g.tally.abstain
  const approvePct = total > 0 ? Math.round((g.tally.approve / total) * 100) : 0
  const rejectPct = total > 0 ? Math.round((g.tally.reject / total) * 100) : 0

  return `
    <div class="bg-navy-slate border border-white/5 rounded-xl p-5">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            ${g.venture_name ? `<span class="text-lg">${g.venture_emoji || '🚀'}</span>` : ''}
            <span class="font-bold text-white">${escapeHtml(g.title)}</span>
            ${statusBadge(g.status)}
          </div>
          ${g.venture_name ? `<div class="text-xs text-teal-light mt-0.5">${escapeHtml(g.venture_name)}</div>` : ''}
          ${g.description ? `<div class="text-sm text-slate-400 mt-2">${escapeHtml(g.description)}</div>` : ''}
        </div>
      </div>

      <div class="mt-4">
        <div class="flex h-2 rounded-full overflow-hidden bg-white/5">
          <div class="bg-emerald-500" style="width:${approvePct}%"></div>
          <div class="bg-red-500" style="width:${rejectPct}%"></div>
        </div>
        <div class="flex items-center gap-4 mt-2 text-xs">
          <span class="text-emerald-400"><i class="fa-solid fa-check mr-1"></i>${g.tally.approve} Approve</span>
          <span class="text-red-400"><i class="fa-solid fa-xmark mr-1"></i>${g.tally.reject} Reject</span>
          <span class="text-slate-500"><i class="fa-solid fa-minus mr-1"></i>${g.tally.abstain} Abstain</span>
        </div>
      </div>

      ${canVote && g.status === 'open' ? `
      <div class="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
        <span class="text-xs text-slate-500 mr-1">Your vote:</span>
        <button data-id="${g.id}" data-vote="approve" class="vote-btn text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${g.myVote && g.myVote.vote === 'approve' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'border-white/10 text-slate-400 hover:border-emerald-500/40 hover:text-emerald-300'}">Approve</button>
        <button data-id="${g.id}" data-vote="reject" class="vote-btn text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${g.myVote && g.myVote.vote === 'reject' ? 'bg-red-500/20 border-red-500/50 text-red-300' : 'border-white/10 text-slate-400 hover:border-red-500/40 hover:text-red-300'}">Reject</button>
        <button data-id="${g.id}" data-vote="abstain" class="vote-btn text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${g.myVote && g.myVote.vote === 'abstain' ? 'bg-slate-500/20 border-slate-500/50 text-slate-300' : 'border-white/10 text-slate-400 hover:border-slate-400'}">Abstain</button>

        <div class="ml-auto flex items-center gap-2">
          <button data-id="${g.id}" data-status="approved" class="resolve-btn text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 transition"><i class="fa-solid fa-flag-checkered mr-1"></i>Finalize Approve</button>
          <button data-id="${g.id}" data-status="rejected" class="resolve-btn text-xs font-bold px-3 py-1.5 rounded-lg bg-red-600/20 text-red-300 hover:bg-red-600/30 transition">Finalize Reject</button>
        </div>
      </div>` : ''}

      ${g.votes && g.votes.length > 0 ? `
      <div class="flex items-center -space-x-2 mt-3">
        ${g.votes.slice(0, 8).map(v => `<div title="${escapeHtml(v.voter_name)}: ${v.vote}">${avatar(v.voter_name, v.voter_color, 6)}</div>`).join('')}
      </div>` : ''}
    </div>
  `
}

function openGateModal(meta, ventures) {
  const modal = el(`
    <div class="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4">
      <div class="bg-navy-slate border border-white/10 rounded-2xl w-full max-w-lg p-6 fade-in">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-white">Submit for Gate Review</h3>
          <button class="modal-close-btn text-slate-500 hover:text-white"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-slate-400 mb-1">Title</label>
            <input id="gate-title" class="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal/50" placeholder="e.g. Venture Alpha — Stage 1 Advancement" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 mb-1">Related Venture (optional)</label>
            <select id="gate-venture" class="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal/50">
              <option value="">None</option>
              ${ventures.map(v => `<option value="${v.id}">${v.logo_emoji || ''} ${escapeHtml(v.name)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 mb-1">Description / Rationale</label>
            <textarea id="gate-description" rows="4" class="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:ring-1 focus:ring-teal/50" placeholder="Summarize why this should advance..."></textarea>
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-5">
          <button class="modal-close-btn px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
          <button id="gate-save-btn" class="bg-teal hover:bg-teal-dark text-navy-deep text-sm font-bold px-5 py-2 rounded-lg transition">Submit</button>
        </div>
      </div>
    </div>
  `)
  document.body.appendChild(modal)
  qsa('.modal-close-btn', modal).forEach(b => b.addEventListener('click', () => modal.remove()))
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove() })

  qs('#gate-save-btn', modal).addEventListener('click', async () => {
    const title = qs('#gate-title', modal).value.trim()
    if (!title) return toast('Title is required', 'error')
    try {
      await API.createGate(meta.channel.key, {
        title,
        ventureId: qs('#gate-venture', modal).value ? Number(qs('#gate-venture', modal).value) : null,
        description: qs('#gate-description', modal).value.trim()
      })
      modal.remove()
      renderMainContent(meta.channel.key)
    } catch (err) { toast(apiErrorMessage(err), 'error') }
  })
}
