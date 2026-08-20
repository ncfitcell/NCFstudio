async function renderDiscussionView(container, meta, isAnnouncement) {
  const data = await API.getPosts(meta.channel.key)
  const posts = data.posts || []
  const canWrite = data.canWrite

  container.innerHTML = `
    <div class="max-w-3xl mx-auto p-4 md:p-6 fade-in">
      ${canWrite ? `
      <div class="bg-navy-slate border border-white/5 rounded-xl p-4 mb-5">
        ${isAnnouncement ? `<input id="post-title" placeholder="Announcement title (optional)" class="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 mb-2 focus:outline-none focus:ring-1 focus:ring-teal/50" />` : ''}
        <textarea id="post-content" rows="3" placeholder="${isAnnouncement ? 'Write an announcement to the studio...' : 'Share something with the community...'}"
          class="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 resize-none focus:outline-none focus:ring-1 focus:ring-teal/50"></textarea>
        <div class="flex justify-between items-center mt-2">
          <label class="flex items-center gap-1.5 text-xs text-slate-500">
            <input type="checkbox" id="post-pinned" class="accent-teal" /> Pin this post
          </label>
          <button id="post-submit" class="bg-teal hover:bg-teal-dark text-navy-deep text-sm font-bold px-4 py-1.5 rounded-lg transition">
            <i class="fa-solid fa-paper-plane mr-1"></i> ${isAnnouncement ? 'Publish' : 'Post'}
          </button>
        </div>
      </div>` : `
      <div class="bg-navy-slate/50 border border-white/5 rounded-xl p-4 mb-5 text-center text-sm text-slate-500">
        <i class="fa-solid fa-lock mr-1.5"></i> Only authorized roles can post in this channel. You can view and comment.
      </div>`}

      <div id="posts-list" class="space-y-4">
        ${posts.length === 0 ? emptyState('fa-comments', 'No posts yet', 'Be the first to share something here.') : posts.map(p => postCard(p, meta, isAnnouncement)).join('')}
      </div>
    </div>
  `

  qs('#post-submit')?.addEventListener('click', async () => {
    const content = qs('#post-content').value.trim()
    if (!content) return toast('Please write something first.', 'error')
    const title = isAnnouncement ? qs('#post-title')?.value.trim() : null
    const pinned = qs('#post-pinned')?.checked
    const btn = qs('#post-submit')
    btn.disabled = true
    try {
      await API.createPost(meta.channel.key, { content, title, pinned })
      toast('Posted successfully', 'success')
      renderMainContent(meta.channel.key)
    } catch (err) {
      toast(apiErrorMessage(err), 'error')
      btn.disabled = false
    }
  })

  bindPostCardEvents(container, meta)
}

function emptyState(icon, title, subtitle) {
  return `
    <div class="text-center py-16 text-slate-600">
      <i class="fa-solid ${icon} text-4xl mb-3 opacity-40"></i>
      <div class="font-semibold text-slate-500">${escapeHtml(title)}</div>
      <div class="text-xs mt-1">${escapeHtml(subtitle)}</div>
    </div>
  `
}

function postCard(p, meta, isAnnouncement) {
  const u = AppState.user
  const canDelete = u.is_admin === 1 || p.author_id === u.id
  return `
    <div class="bg-navy-slate border border-white/5 rounded-xl p-4 ${p.pinned ? 'ring-1 ring-amber/30' : ''}" data-post-id="${p.id}">
      ${p.pinned ? `<div class="text-[10px] font-bold text-amber mb-2"><i class="fa-solid fa-thumbtack mr-1"></i>PINNED</div>` : ''}
      <div class="flex items-start gap-3">
        ${avatar(p.author_name || 'Unknown', p.author_color, 8)}
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-semibold text-white text-sm">${escapeHtml(p.author_name || 'Unknown')}</span>
            ${p.author_title ? `<span class="text-[11px] text-slate-500">${escapeHtml(p.author_title)}</span>` : ''}
            <span class="text-[11px] text-slate-600">· ${timeAgo(p.created_at)}</span>
            ${canDelete ? `<button class="ml-auto post-delete-btn text-slate-600 hover:text-red-400 text-xs" data-id="${p.id}"><i class="fa-solid fa-trash"></i></button>` : ''}
          </div>
          ${p.title ? `<div class="font-bold text-white mt-1">${escapeHtml(p.title)}</div>` : ''}
          <div class="text-sm text-slate-300 mt-1 whitespace-pre-wrap">${nl2br(p.content)}</div>

          <div class="mt-3 pt-3 border-t border-white/5">
            <div class="space-y-2 comments-list">
              ${(p.comments || []).map(cm => `
                <div class="flex items-start gap-2">
                  ${avatar(cm.author_name || 'U', cm.author_color, 6)}
                  <div class="bg-navy rounded-lg px-3 py-1.5 flex-1 min-w-0">
                    <div class="flex items-baseline gap-2">
                      <span class="text-xs font-semibold text-slate-200">${escapeHtml(cm.author_name || 'Unknown')}</span>
                      <span class="text-[10px] text-slate-600">${timeAgo(cm.created_at)}</span>
                    </div>
                    <div class="text-xs text-slate-400 whitespace-pre-wrap">${nl2br(cm.content)}</div>
                  </div>
                </div>
              `).join('')}
            </div>
            <div class="flex items-center gap-2 mt-2">
              <input class="comment-input flex-1 bg-navy border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-teal/50" placeholder="Write a reply..." data-post-id="${p.id}" />
              <button class="comment-submit-btn text-teal hover:text-teal-light text-xs font-semibold px-2" data-post-id="${p.id}"><i class="fa-solid fa-reply"></i></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
}

function bindPostCardEvents(container, meta) {
  qsa('.post-delete-btn', container).forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this post?')) return
      try {
        await API.deletePost(meta.channel.key, btn.dataset.id)
        renderMainContent(meta.channel.key)
      } catch (err) { toast(apiErrorMessage(err), 'error') }
    })
  })

  qsa('.comment-submit-btn', container).forEach(btn => {
    const submit = async () => {
      const input = qs(`.comment-input[data-post-id="${btn.dataset.postId}"]`, container)
      const content = input.value.trim()
      if (!content) return
      try {
        await API.addComment(meta.channel.key, btn.dataset.postId, content)
        renderMainContent(meta.channel.key)
      } catch (err) { toast(apiErrorMessage(err), 'error') }
    }
    btn.addEventListener('click', submit)
  })

  qsa('.comment-input', container).forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        qs(`.comment-submit-btn[data-post-id="${input.dataset.postId}"]`, container)?.click()
      }
    })
  })
}

async function renderRulesView(container, meta) {
  const data = await API.getPosts(meta.channel.key)
  const posts = data.posts || []
  const canWrite = data.canWrite

  const defaultRules = [
    { title: '1. Respect & Professionalism', content: 'Treat every founder, mentor, investor, and staff member with respect. NCF Venture Studio is a professional environment built on trust and collaboration.' },
    { title: '2. Confidentiality', content: 'Information shared in venture-specific channels, deal-flow discussions, and stage-gate reviews is confidential. Do not share outside the platform without explicit permission.' },
    { title: '3. Conflict of Interest Disclosure', content: 'Investors, mentors, and corporate partners must disclose any conflicts of interest before participating in stage-gate votes or deal discussions.' },
    { title: '4. IP & Ownership', content: 'All IP developed within the studio structure follows the Venture Builder Agreement. Consult #legal-and-ip-support before external disclosure of any invention or prototype.' },
    { title: '5. Communication Etiquette', content: 'Use the correct channel for your topic. Keep discussions constructive, avoid spam, and tag the right stakeholders for faster resolution.' }
  ]

  container.innerHTML = `
    <div class="max-w-3xl mx-auto p-4 md:p-6 fade-in">
      <div class="bg-gradient-to-br from-navy-slate to-navy-light border border-white/5 rounded-xl p-5 mb-5">
        <div class="flex items-center gap-2 text-amber font-bold text-sm mb-1"><i class="fa-solid fa-scale-balanced"></i> Studio Governance Policy</div>
        <p class="text-xs text-slate-400">These guidelines apply to every member of the NCF Venture Studio community, across all roles and portfolio ventures.</p>
      </div>

      <div class="space-y-3">
        ${defaultRules.map(r => `
          <div class="bg-navy-slate border border-white/5 rounded-xl p-4">
            <div class="font-bold text-white text-sm mb-1">${escapeHtml(r.title)}</div>
            <div class="text-sm text-slate-400">${escapeHtml(r.content)}</div>
          </div>
        `).join('')}
      </div>

      ${canWrite ? `
      <div class="bg-navy-slate border border-white/5 rounded-xl p-4 mt-5">
        <textarea id="post-content" rows="2" placeholder="Add an additional governance note..."
          class="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 resize-none focus:outline-none focus:ring-1 focus:ring-teal/50"></textarea>
        <div class="flex justify-end mt-2">
          <button id="post-submit" class="bg-teal hover:bg-teal-dark text-navy-deep text-sm font-bold px-4 py-1.5 rounded-lg transition">Add Note</button>
        </div>
      </div>` : ''}

      ${posts.length > 0 ? `<div class="mt-5"><div class="text-xs font-bold text-slate-500 uppercase mb-2">Additional Notes</div><div class="space-y-3">${posts.map(p => postCard(p, meta, false)).join('')}</div></div>` : ''}
    </div>
  `

  qs('#post-submit')?.addEventListener('click', async () => {
    const content = qs('#post-content').value.trim()
    if (!content) return
    try {
      await API.createPost(meta.channel.key, { content })
      renderMainContent(meta.channel.key)
    } catch (err) { toast(apiErrorMessage(err), 'error') }
  })

  bindPostCardEvents(container, meta)
}
