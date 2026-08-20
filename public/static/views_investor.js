async function renderDealflowView(container, meta) {
  const data = await API.getDealflow()
  const ventures = data.ventures || []

  container.innerHTML = `
    <div class="max-w-6xl mx-auto p-4 md:p-6 fade-in">
      <div class="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div class="text-xs text-slate-500">${ventures.length} venture${ventures.length !== 1 ? 's' : ''} open for investment</div>
        <div class="flex gap-2 flex-wrap">
          ${['all', 'ideation', 'mvp', 'scale'].map(s => `<button data-stage="${s}" class="dealflow-filter-btn text-xs font-semibold px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-teal-light hover:border-teal/40 transition ${s === 'all' ? 'bg-teal/10 text-teal-light border-teal/40' : ''}">${s === 'all' ? 'All Stages' : s[0].toUpperCase() + s.slice(1)}</button>`).join('')}
        </div>
      </div>
      <div id="dealflow-grid" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"></div>
    </div>
  `

  function renderGrid(filterStage) {
    const grid = qs('#dealflow-grid')
    const filtered = filterStage === 'all' ? ventures : ventures.filter(v => v.stage === filterStage)
    if (filtered.length === 0) { grid.innerHTML = `<div class="col-span-full">${emptyState('fa-briefcase', 'No ventures match this filter', 'Try a different stage filter.')}</div>`; return }
    grid.innerHTML = filtered.map(v => `
      <div class="bg-navy-slate border border-white/5 rounded-xl p-5 hover:border-teal/30 transition">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-xl bg-teal/10 flex items-center justify-center text-xl">${v.logo_emoji || '🚀'}</div>
          <div class="min-w-0">
            <div class="font-bold text-white">${escapeHtml(v.name)}</div>
            <div class="text-xs text-slate-500">${escapeHtml(v.sector || 'Sector TBD')}</div>
          </div>
        </div>
        ${v.tagline ? `<div class="text-sm text-teal-light mt-3 font-medium">${escapeHtml(v.tagline)}</div>` : ''}
        ${v.description ? `<div class="text-xs text-slate-400 mt-2 line-clamp-3">${escapeHtml(v.description)}</div>` : ''}
        <div class="flex flex-wrap gap-1.5 mt-3">
          <span class="badge bg-teal/15 text-teal-light border border-teal/30">${escapeHtml((v.stage || '').toUpperCase())}</span>
          ${v.ask_amount ? `<span class="badge bg-amber/15 text-amber border border-amber/30">Ask: ${escapeHtml(v.ask_amount)}</span>` : ''}
          ${v.valuation ? `<span class="badge bg-purple-500/15 text-purple-300 border border-purple-500/30">Val: ${escapeHtml(v.valuation)}</span>` : ''}
        </div>
        ${v.traction_summary ? `<div class="text-xs text-slate-500 mt-3 pt-3 border-t border-white/5"><i class="fa-solid fa-chart-line mr-1 text-emerald-400"></i>${escapeHtml(v.traction_summary)}</div>` : ''}
      </div>
    `).join('')
  }

  renderGrid('all')

  qsa('.dealflow-filter-btn', container).forEach(btn => {
    btn.addEventListener('click', () => {
      qsa('.dealflow-filter-btn', container).forEach(b => b.classList.remove('bg-teal/10', 'text-teal-light', 'border-teal/40'))
      btn.classList.add('bg-teal/10', 'text-teal-light', 'border-teal/40')
      renderGrid(btn.dataset.stage)
    })
  })
}

async function renderDashboardView(container, meta) {
  const data = await API.getDashboardSummary()
  const summary = data.summary || []

  const totalMrr = summary.reduce((s, v) => s + (v.mrr || 0), 0)
  const totalBurn = summary.reduce((s, v) => s + (v.burn_rate || 0), 0)
  const avgGrowth = summary.length ? (summary.reduce((s, v) => s + (v.growth_rate || 0), 0) / summary.length) : 0
  const totalHeadcount = summary.reduce((s, v) => s + (v.headcount || 0), 0)

  container.innerHTML = `
    <div class="max-w-6xl mx-auto p-4 md:p-6 fade-in">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        ${metricTile('Consolidated MRR', `$${totalMrr.toLocaleString()}`, 'fa-sack-dollar', 'text-emerald-400')}
        ${metricTile('Total Burn Rate', `$${totalBurn.toLocaleString()}/mo`, 'fa-fire', 'text-red-400')}
        ${metricTile('Avg. Growth Rate', `${avgGrowth.toFixed(1)}%`, 'fa-arrow-trend-up', 'text-teal-light')}
        ${metricTile('Portfolio Headcount', `${totalHeadcount}`, 'fa-users', 'text-amber')}
      </div>

      <div class="bg-navy-slate border border-white/5 rounded-xl overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-white/5 text-left text-xs text-slate-500 uppercase">
              <th class="px-4 py-3">Venture</th>
              <th class="px-4 py-3">Stage</th>
              <th class="px-4 py-3">Month</th>
              <th class="px-4 py-3 text-right">MRR</th>
              <th class="px-4 py-3 text-right">Burn</th>
              <th class="px-4 py-3 text-right">Runway</th>
              <th class="px-4 py-3 text-right">Growth</th>
              <th class="px-4 py-3 text-right">HC</th>
            </tr>
          </thead>
          <tbody>
            ${summary.length === 0 ? `<tr><td colspan="8" class="px-4 py-8 text-center text-slate-600">No metrics have been reported yet.</td></tr>` : summary.map(v => `
              <tr class="border-b border-white/5 hover:bg-white/[0.02] transition">
                <td class="px-4 py-3 font-semibold text-white">${v.logo_emoji || '🚀'} ${escapeHtml(v.name)}</td>
                <td class="px-4 py-3"><span class="badge bg-teal/10 text-teal-light border border-teal/30">${escapeHtml((v.stage || '').toUpperCase())}</span></td>
                <td class="px-4 py-3 text-slate-500">${v.month || '—'}</td>
                <td class="px-4 py-3 text-right text-emerald-400 font-mono">${v.mrr ? '$' + v.mrr.toLocaleString() : '—'}</td>
                <td class="px-4 py-3 text-right text-red-400 font-mono">${v.burn_rate ? '$' + v.burn_rate.toLocaleString() : '—'}</td>
                <td class="px-4 py-3 text-right text-slate-300 font-mono">${v.runway_months ? v.runway_months + 'mo' : '—'}</td>
                <td class="px-4 py-3 text-right text-teal-light font-mono">${v.growth_rate ? v.growth_rate + '%' : '—'}</td>
                <td class="px-4 py-3 text-right text-slate-300 font-mono">${v.headcount || '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `
}

function metricTile(label, value, icon, colorClass) {
  return `
    <div class="bg-navy-slate border border-white/5 rounded-xl p-4">
      <div class="flex items-center justify-between mb-2">
        <span class="text-[11px] text-slate-500 uppercase font-semibold">${escapeHtml(label)}</span>
        <i class="fa-solid ${icon} ${colorClass}"></i>
      </div>
      <div class="text-xl font-extrabold text-white">${value}</div>
    </div>
  `
}
