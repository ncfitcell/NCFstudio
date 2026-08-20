const DOC_TYPE_ICONS = { file: 'fa-file-lines', link: 'fa-link', template: 'fa-file-shield', request: 'fa-hand' }

async function renderDocumentView(container, meta) {
  const data = await API.getDocuments(meta.channel.key)
  const docs = data.documents || []
  const canWrite = data.canWrite

  container.innerHTML = `
    <div class="max-w-4xl mx-auto p-4 md:p-6 fade-in">
      <div class="flex items-center justify-between mb-4">
        <div class="text-xs text-slate-500">${docs.length} document${docs.length !== 1 ? 's' : ''} in this vault</div>
        ${canWrite ? `<button id="new-doc-btn" class="bg-teal hover:bg-teal-dark text-navy-deep text-sm font-bold px-4 py-1.5 rounded-lg transition"><i class="fa-solid fa-plus mr-1"></i> Add Document</button>` : ''}
      </div>
      <div class="space-y-2">
        ${docs.length === 0 ? emptyState('fa-folder-open', 'Vault is empty', 'No documents have been added to this channel yet.') : docs.map(docCard).join('')}
      </div>
    </div>
  `

  qs('#new-doc-btn')?.addEventListener('click', () => openDocModal(meta))

  qsa('.doc-delete-btn', container).forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this document?')) return
      try {
        await API.deleteDocument(meta.channel.key, btn.dataset.id)
        renderMainContent(meta.channel.key)
      } catch (err) { toast(apiErrorMessage(err), 'error') }
    })
  })

  qsa('.doc-status-select', container).forEach(sel => {
    sel.addEventListener('change', async () => {
      try {
        await API.updateDocument(meta.channel.key, sel.dataset.id, { status: sel.value })
        toast('Status updated', 'success')
      } catch (err) { toast(apiErrorMessage(err), 'error') }
    })
  })
}

function docCard(d) {
  const u = AppState.user
  const canManage = u.is_admin === 1 || d.uploaded_by === u.id
  return `
    <div class="bg-navy-slate border border-white/5 rounded-xl p-4 flex items-start gap-3 hover:border-teal/20 transition">
      <div class="w-10 h-10 rounded-lg bg-teal/10 flex items-center justify-center shrink-0">
        <i class="fa-solid ${DOC_TYPE_ICONS[d.doc_type] || 'fa-file'} text-teal"></i>
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="font-semibold text-white text-sm">${escapeHtml(d.title)}</span>
          <span class="badge bg-white/5 text-slate-400 border border-white/10">${escapeHtml(d.version)}</span>
        </div>
        ${d.description ? `<div class="text-xs text-slate-500 mt-1">${escapeHtml(d.description)}</div>` : ''}
        <div class="flex items-center gap-2 mt-2 flex-wrap">
          ${statusBadge(d.status)}
          <span class="text-[11px] text-slate-600">by ${escapeHtml(d.uploader_name || 'Unknown')} · ${timeAgo(d.created_at)}</span>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        ${d.url ? `<a href="${escapeHtml(d.url)}" target="_blank" rel="noopener" class="text-teal hover:text-teal-light text-xs font-semibold px-2 py-1 rounded-lg hover:bg-white/5"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>` : ''}
        ${canManage ? `
        <select class="doc-status-select bg-navy border border-white/10 rounded-lg text-[11px] text-slate-300 px-1.5 py-1 focus:outline-none" data-id="${d.id}">
          ${['active', 'in_review', 'pending_request', 'archived'].map(s => `<option value="${s}" ${d.status === s ? 'selected' : ''}>${s.replace('_', ' ')}</option>`).join('')}
        </select>
        <button class="doc-delete-btn text-slate-600 hover:text-red-400 text-xs" data-id="${d.id}"><i class="fa-solid fa-trash"></i></button>
        ` : ''}
      </div>
    </div>
  `
}

function openDocModal(meta) {
  const modal = el(`
    <div class="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4">
      <div class="bg-navy-slate border border-white/10 rounded-2xl w-full max-w-lg p-6 fade-in">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-white">Add Document</h3>
          <button class="modal-close-btn text-slate-500 hover:text-white"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-slate-400 mb-1">Title</label>
            <input id="doc-title" class="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal/50" placeholder="e.g. NDA Template v2" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 mb-1">Description</label>
            <textarea id="doc-description" rows="2" class="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:ring-1 focus:ring-teal/50"></textarea>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-400 mb-1">Type</label>
              <select id="doc-type" class="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal/50">
                <option value="file">File</option>
                <option value="link">Link</option>
                <option value="template">Template</option>
                <option value="request">Request</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-400 mb-1">Version</label>
              <input id="doc-version" value="v1.0" class="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal/50" />
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 mb-1">URL (optional)</label>
            <input id="doc-url" class="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal/50" placeholder="https://..." />
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-5">
          <button class="modal-close-btn px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
          <button id="doc-save-btn" class="bg-teal hover:bg-teal-dark text-navy-deep text-sm font-bold px-5 py-2 rounded-lg transition">Add</button>
        </div>
      </div>
    </div>
  `)
  document.body.appendChild(modal)
  qsa('.modal-close-btn', modal).forEach(b => b.addEventListener('click', () => modal.remove()))
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove() })

  qs('#doc-save-btn', modal).addEventListener('click', async () => {
    const title = qs('#doc-title', modal).value.trim()
    if (!title) return toast('Title is required', 'error')
    try {
      await API.createDocument(meta.channel.key, {
        title,
        description: qs('#doc-description', modal).value.trim(),
        docType: qs('#doc-type', modal).value,
        version: qs('#doc-version', modal).value.trim() || 'v1.0',
        url: qs('#doc-url', modal).value.trim()
      })
      modal.remove()
      renderMainContent(meta.channel.key)
    } catch (err) { toast(apiErrorMessage(err), 'error') }
  })
}
