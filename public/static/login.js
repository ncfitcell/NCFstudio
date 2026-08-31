function renderLogin() {
  const root = document.getElementById('root')
  root.innerHTML = `
    <div class="min-h-screen flex items-center justify-center relative overflow-hidden" style="background: radial-gradient(circle at 20% 15%, rgba(74,0,224,0.22), transparent 45%), radial-gradient(circle at 80% 85%, rgba(142,45,226,0.18), transparent 50%), radial-gradient(circle at 50% 50%, rgba(0,180,216,0.08), transparent 60%), #0B0D21;">
      <div class="absolute inset-0 pointer-events-none opacity-30" style="background-image: linear-gradient(rgba(142,45,226,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(74,0,224,0.08) 1px, transparent 1px); background-size: 40px 40px;"></div>

      <div class="relative z-10 w-full max-w-md mx-4">
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-purple shadow-purple-glow mb-4">
            <i class="fa-solid fa-rocket text-2xl text-white"></i>
          </div>
          <h1 class="text-2xl font-extrabold text-white tracking-tight">NCF Venture Studio</h1>
          <p class="text-slate-400 text-sm mt-1">Operational Hub &amp; Deal-Flow Pipeline</p>
        </div>

        <div class="bg-navy-slate/90 backdrop-blur-md border border-purple-500/20 rounded-2xl shadow-purple-glow p-8">
          <h2 class="text-lg font-semibold text-white mb-1">Welcome back</h2>
          <p class="text-slate-400 text-sm mb-6">Sign in to access your studio dashboard</p>

          <form id="login-form" class="space-y-4">
            <div>
              <label class="block text-xs font-medium text-slate-400 mb-1.5">Username</label>
              <div class="relative">
                <i class="fa-solid fa-user absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></i>
                <input id="login-username" type="text" autocomplete="username" placeholder="Enter username"
                  class="w-full bg-navy border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-teal/50 focus:border-teal/50 transition" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
              <div class="relative">
                <i class="fa-solid fa-lock absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm"></i>
                <input id="login-password" type="password" autocomplete="current-password" placeholder="••••••••"
                  class="w-full bg-navy border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-teal/50 focus:border-teal/50 transition" />
              </div>
            </div>

            <div id="login-error" class="hidden text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"></div>

            <button type="submit" id="login-submit"
              class="w-full bg-teal hover:bg-teal-dark text-navy-deep font-bold py-2.5 rounded-lg transition flex items-center justify-center gap-2 shadow-glow">
              <span id="login-btn-text">Sign In</span>
              <i id="login-spinner" class="fa-solid fa-circle-notch fa-spin hidden"></i>
            </button>
          </form>
        </div>

        <p class="text-center text-slate-600 text-xs mt-6">© ${new Date().getFullYear()} Naree Care Foundation Venture Studio. Internal use only.</p>
      </div>
    </div>
  `

  const form = qs('#login-form')
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const username = qs('#login-username').value.trim()
    const password = qs('#login-password').value
    const errorEl = qs('#login-error')
    errorEl.classList.add('hidden')

    if (!username || !password) {
      errorEl.textContent = 'Please enter both username and password.'
      errorEl.classList.remove('hidden')
      return
    }

    qs('#login-btn-text').textContent = 'Signing in...'
    qs('#login-spinner').classList.remove('hidden')
    qs('#login-submit').disabled = true

    try {
      const data = await API.login(username, password)
      AppState.user = data.user
      await bootApp()
    } catch (err) {
      errorEl.textContent = apiErrorMessage(err)
      errorEl.classList.remove('hidden')
    } finally {
      qs('#login-btn-text').textContent = 'Sign In'
      qs('#login-spinner').classList.add('hidden')
      qs('#login-submit').disabled = false
    }
  })

  qs('#login-username').focus()
}
