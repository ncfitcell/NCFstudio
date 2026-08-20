const KANBAN_COLUMNS = [
  { key: 'backlog', label: 'Backlog', color: 'border-slate-500' },
  { key: 'todo', label: 'To Do', color: 'border-blue-500' },
  { key: 'in_progress', label: 'In Progress', color: 'border-teal' },
  { key: 'review', label: 'Review', color: 'border-amber' },
  { key: 'done', label: 'Done', color: 'border-emerald-500' }
]

let ventureUsersCache = null
async function getUsersCached() {
  if (!ventureUsersCache) {
    const data = await API.getUsersLite()
    ventureUsersCache = data.users || []
  }
  return ventureUsersCache
}

async function renderKanbanView(container, meta) {
  const [data, users] = await Promise.all([API.getTasks(meta.channel.key), getUsersCached()])
  const tasks = data.tasks || []
  const canWrite = data.canWrite

  container.innerHTML = `
    <div class="p-4 md:p-6 fade-in h-full flex flex-col">
      <div class="flex items-center justify-between mb-4">
        <div class="text-xs text-slate-500">${tasks.length} task${tasks.length !== 1 ? 's' : ''}</div>
        ${canWrite ? `<button id="new-task-btn" class="bg-teal hover:bg-teal-dark text-navy-deep text-sm font-bold px-4 py-1.5 rounded-lg transition"><i class="fa-solid fa-plus mr-1"></i> New Task</button>` : ''}
      </div>
      <div class="flex-1 overflow-x-auto">
        <div class="flex gap-3 min-w-max h-full pb-4">
          ${KANBAN_COLUMNS.map(col => `
            <div class="w-72 shrink-0 flex flex-col">
              <div class="flex items-center gap-2 mb-2 px-1">
                <span class="w-2 h-2 rounded-full ${col.color.replace('border-', 'bg-')}"></span>
                <span class="text-xs font-bold text-slate-300 uppercase tracking-wide">${col.label}</span>
                <span class="text-[10px] text-slate-600 bg-white/5 rounded-full px-1.5">${tasks.filter(t => t.status === col.key).length}</span>
              </div>
              <div class="kanban-col flex-1 bg-navy-slate/50 border-2 border-dashed border-white/5 rounded-xl p-2 space-y-2 transition" data-status="${col.key}">
                ${tasks.filter(t => t.status === col.key).map(t => kanbanCard(t, canWrite)).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `

  if (canWrite) {
    qs('#new-task-btn').addEventListener('click', () => openTaskModal(meta, users))
    bindKanbanDragDrop(container, meta)
  }

  qsa('.kanban-card', container).forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.task-delete-btn')) return
      const task = tasks.find(t => String(t.id) === card.dataset.id)
      if (canWrite) openTaskModal(meta, users, task)
    })
  })

  qsa('.task-delete-btn', container).forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation()
      if (!confirm('Delete this task?')) return
      try {
        await API.deleteTask(meta.channel.key, btn.dataset.id)
        renderMainContent(meta.channel.key)
      } catch (err) { toast(apiErrorMessage(err), 'error') }
    })
  })
}

function kanbanCard(t, canWrite) {
  return `
    <div class="kanban-card bg-navy border border-white/10 rounded-lg p-3 hover:border-teal/40 transition group" draggable="${canWrite}" data-id="${t.id}">
      <div class="flex items-start justify-between gap-2">
        <div class="text-sm font-medium text-white leading-snug">${escapeHtml(t.title)}</div>
        ${canWrite ? `<button class="task-delete-btn opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 text-xs shrink-0"><i class="fa-solid fa-trash"></i></button>` : ''}
      </div>
      ${t.description ? `<div class="text-xs text-slate-500 mt-1 line-clamp-2">${escapeHtml(t.description)}</div>` : ''}
      <div class="flex items-center justify-between mt-2.5">
        ${priorityBadge(t.priority)}
        ${t.assignee_name ? avatar(t.assignee_name, t.assignee_color, 5) : '<span class="text-slate-700 text-xs"><i class="fa-solid fa-user-slash"></i></span>'}
      </div>
      ${t.due_date ? `<div class="text-[10px] text-slate-600 mt-1.5"><i class="fa-regular fa-clock mr-1"></i>${formatDate(t.due_date)}</div>` : ''}
    </div>
  `
}

function bindKanbanDragDrop(container, meta) {
  let draggedId = null
  qsa('.kanban-card', container).forEach(card => {
    card.addEventListener('dragstart', () => { draggedId = card.dataset.id; card.classList.add('dragging') })
    card.addEventListener('dragend', () => card.classList.remove('dragging'))
  })
  qsa('.kanban-col', container).forEach(col => {
    col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('drag-over') })
    col.addEventListener('dragleave', () => col.classList.remove('drag-over'))
    col.addEventListener('drop', async (e) => {
      e.preventDefault()
      col.classList.remove('drag-over')
      if (!draggedId) return
      try {
        await API.updateTask(meta.channel.key, draggedId, { status: col.dataset.status })
        renderMainContent(meta.channel.key)
      } catch (err) { toast(apiErrorMessage(err), 'error') }
    })
  })
}

function openTaskModal(meta, users, task) {
  const isEdit = !!task
  const modal = el(`
    <div class="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4">
      <div class="bg-navy-slate border border-white/10 rounded-2xl w-full max-w-lg p-6 fade-in max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-white">${isEdit ? 'Edit Task' : 'New Task'}</h3>
          <button class="modal-close-btn text-slate-500 hover:text-white"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-slate-400 mb-1">Title</label>
            <input id="task-title" value="${task ? escapeHtml(task.title) : ''}" class="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal/50" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 mb-1">Description</label>
            <textarea id="task-description" rows="3" class="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:ring-1 focus:ring-teal/50">${task ? escapeHtml(task.description || '') : ''}</textarea>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-400 mb-1">Status</label>
              <select id="task-status" class="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal/50">
                ${KANBAN_COLUMNS.map(c => `<option value="${c.key}" ${task && task.status === c.key ? 'selected' : ''}>${c.label}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-400 mb-1">Priority</label>
              <select id="task-priority" class="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal/50">
                ${['low', 'medium', 'high', 'urgent'].map(p => `<option value="${p}" ${task && task.priority === p ? 'selected' : ''}>${p[0].toUpperCase() + p.slice(1)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-400 mb-1">Assignee</label>
              <select id="task-assignee" class="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal/50">
                <option value="">Unassigned</option>
                ${users.map(u => `<option value="${u.id}" ${task && task.assignee_id === u.id ? 'selected' : ''}>${escapeHtml(u.name)}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-400 mb-1">Due Date</label>
              <input id="task-due" type="date" value="${task && task.due_date ? task.due_date : ''}" class="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal/50" />
            </div>
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-5">
          <button class="modal-close-btn px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
          <button id="task-save-btn" class="bg-teal hover:bg-teal-dark text-navy-deep text-sm font-bold px-5 py-2 rounded-lg transition">${isEdit ? 'Save Changes' : 'Create Task'}</button>
        </div>
      </div>
    </div>
  `)
  document.body.appendChild(modal)
  qsa('.modal-close-btn', modal).forEach(b => b.addEventListener('click', () => modal.remove()))
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove() })

  qs('#task-save-btn', modal).addEventListener('click', async () => {
    const title = qs('#task-title', modal).value.trim()
    if (!title) return toast('Title is required', 'error')
    const payload = {
      title,
      description: qs('#task-description', modal).value.trim(),
      status: qs('#task-status', modal).value,
      priority: qs('#task-priority', modal).value,
      assigneeId: qs('#task-assignee', modal).value ? Number(qs('#task-assignee', modal).value) : null,
      dueDate: qs('#task-due', modal).value || null
    }
    try {
      if (isEdit) await API.updateTask(meta.channel.key, task.id, payload)
      else await API.createTask(meta.channel.key, payload)
      modal.remove()
      renderMainContent(meta.channel.key)
    } catch (err) { toast(apiErrorMessage(err), 'error') }
  })
}
