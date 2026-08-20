const EVENT_TYPE_ICONS = { event: 'fa-calendar-day', hackathon: 'fa-laptop-code', workshop: 'fa-chalkboard-user', deadline: 'fa-hourglass-half' }
const EVENT_TYPE_COLORS = { event: 'bg-teal/15 text-teal-light', hackathon: 'bg-purple-500/15 text-purple-300', workshop: 'bg-amber/15 text-amber', deadline: 'bg-red-500/15 text-red-400' }

async function renderEventsView(container, meta) {
  const data = await API.getEvents(meta.channel.key)
  const events = data.events || []
  const canWrite = data.canWrite
  const now = dayjs()
  const upcoming = events.filter(e => dayjs(e.event_date).isAfter(now.subtract(1, 'day')))
  const past = events.filter(e => dayjs(e.event_date).isBefore(now.subtract(1, 'day')))

  container.innerHTML = `
    <div class="max-w-3xl mx-auto p-4 md:p-6 fade-in">
      <div class="flex items-center justify-between mb-4">
        <div class="text-xs text-slate-500">${upcoming.length} upcoming event${upcoming.length !== 1 ? 's' : ''}</div>
        ${canWrite ? `<button id="new-event-btn" class="bg-teal hover:bg-teal-dark text-navy-deep text-sm font-bold px-4 py-1.5 rounded-lg transition"><i class="fa-solid fa-plus mr-1"></i> New Event</button>` : ''}
      </div>

      <div class="space-y-3">
        ${upcoming.length === 0 ? emptyState('fa-calendar-xmark', 'No upcoming events', 'Check back later or add a new event.') : upcoming.map(e => eventCard(e, meta)).join('')}
      </div>

      ${past.length > 0 ? `
      <div class="mt-8">
        <div class="text-xs font-bold text-slate-600 uppercase mb-2">Past Events</div>
        <div class="space-y-3 opacity-60">${past.map(e => eventCard(e, meta)).join('')}</div>
      </div>` : ''}
    </div>
  `

  qs('#new-event-btn')?.addEventListener('click', () => openEventModal(meta))

  qsa('.rsvp-btn', container).forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await API.rsvpEvent(meta.channel.key, btn.dataset.id, btn.dataset.status)
        renderMainContent(meta.channel.key)
      } catch (err) { toast(apiErrorMessage(err), 'error') }
    })
  })

  qsa('.event-delete-btn', container).forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this event?')) return
      try {
        await API.deleteEvent(meta.channel.key, btn.dataset.id)
        renderMainContent(meta.channel.key)
      } catch (err) { toast(apiErrorMessage(err), 'error') }
    })
  })
}

function eventCard(e, meta) {
  const u = AppState.user
  const canManage = u.is_admin === 1 || e.created_by === u.id
  const d = dayjs(e.event_date)
  return `
    <div class="bg-navy-slate border border-white/5 rounded-xl p-4 flex gap-4">
      <div class="w-14 shrink-0 text-center bg-navy rounded-lg border border-white/10 py-2">
        <div class="text-[10px] font-bold text-teal-light uppercase">${d.format('MMM')}</div>
        <div class="text-xl font-extrabold text-white leading-none mt-0.5">${d.format('D')}</div>
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="font-semibold text-white text-sm">${escapeHtml(e.title)}</span>
          <span class="badge ${EVENT_TYPE_COLORS[e.event_type] || EVENT_TYPE_COLORS.event}"><i class="fa-solid ${EVENT_TYPE_ICONS[e.event_type] || 'fa-calendar'} mr-1"></i>${escapeHtml(e.event_type)}</span>
        </div>
        <div class="text-xs text-slate-500 mt-1">${d.format('dddd, MMM D, YYYY · h:mm A')} ${e.location ? `· ${escapeHtml(e.location)}` : ''}</div>
        ${e.description ? `<div class="text-sm text-slate-400 mt-2">${escapeHtml(e.description)}</div>` : ''}
        <div class="flex items-center gap-2 mt-3">
          <button data-id="${e.id}" data-status="going" class="rsvp-btn text-xs font-semibold px-2.5 py-1 rounded-lg border transition ${e.myRsvp === 'going' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'border-white/10 text-slate-400 hover:text-emerald-300'}">Going</button>
          <button data-id="${e.id}" data-status="interested" class="rsvp-btn text-xs font-semibold px-2.5 py-1 rounded-lg border transition ${e.myRsvp === 'interested' ? 'bg-amber/20 border-amber/50 text-amber' : 'border-white/10 text-slate-400 hover:text-amber'}">Interested</button>
          <button data-id="${e.id}" data-status="declined" class="rsvp-btn text-xs font-semibold px-2.5 py-1 rounded-lg border transition ${e.myRsvp === 'declined' ? 'bg-red-500/20 border-red-500/50 text-red-300' : 'border-white/10 text-slate-400 hover:text-red-300'}">Can't Go</button>
          <span class="text-[11px] text-slate-600 ml-2"><i class="fa-solid fa-users mr-1"></i>${e.goingCount} going</span>
          ${canManage ? `<button data-id="${e.id}" class="event-delete-btn ml-auto text-slate-600 hover:text-red-400 text-xs"><i class="fa-solid fa-trash"></i></button>` : ''}
        </div>
      </div>
    </div>
  `
}

function openEventModal(meta) {
  const modal = el(`
    <div class="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4">
      <div class="bg-navy-slate border border-white/10 rounded-2xl w-full max-w-lg p-6 fade-in">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-white">New Event</h3>
          <button class="modal-close-btn text-slate-500 hover:text-white"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-slate-400 mb-1">Title</label>
            <input id="event-title" class="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal/50" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-slate-400 mb-1">Date &amp; Time</label>
              <input id="event-date" type="datetime-local" class="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal/50" />
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-400 mb-1">Type</label>
              <select id="event-type" class="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal/50">
                <option value="event">Event</option>
                <option value="hackathon">Hackathon</option>
                <option value="workshop">Workshop</option>
                <option value="deadline">Deadline</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 mb-1">Location</label>
            <input id="event-location" placeholder="Virtual / Studio HQ / etc." class="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal/50" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-400 mb-1">Description</label>
            <textarea id="event-description" rows="2" class="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:ring-1 focus:ring-teal/50"></textarea>
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-5">
          <button class="modal-close-btn px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
          <button id="event-save-btn" class="bg-teal hover:bg-teal-dark text-navy-deep text-sm font-bold px-5 py-2 rounded-lg transition">Create</button>
        </div>
      </div>
    </div>
  `)
  document.body.appendChild(modal)
  qsa('.modal-close-btn', modal).forEach(b => b.addEventListener('click', () => modal.remove()))
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove() })

  qs('#event-save-btn', modal).addEventListener('click', async () => {
    const title = qs('#event-title', modal).value.trim()
    const eventDate = qs('#event-date', modal).value
    if (!title || !eventDate) return toast('Title and date are required', 'error')
    try {
      await API.createEvent(meta.channel.key, {
        title,
        eventDate,
        eventType: qs('#event-type', modal).value,
        location: qs('#event-location', modal).value.trim(),
        description: qs('#event-description', modal).value.trim()
      })
      modal.remove()
      renderMainContent(meta.channel.key)
    } catch (err) { toast(apiErrorMessage(err), 'error') }
  })
}
