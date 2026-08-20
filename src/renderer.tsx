import { jsxRenderer } from 'hono/jsx-renderer'

export const renderer = jsxRenderer(({ children }) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>NCF Venture Studio — Operations Hub</title>
        <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%9A%80%3C/text%3E%3C/svg%3E" />
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/dayjs@1.11.10/dayjs.min.js"></script>
        <script dangerouslySetInnerHTML={{
          __html: `
            tailwind.config = {
              darkMode: 'class',
              theme: {
                extend: {
                  fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui'] },
                  colors: {
                    navy: { DEFAULT: '#0A192F', deep: '#060F1F', slate: '#0D213F', light: '#132A4A' },
                    teal: { DEFAULT: '#00B4D8', dark: '#0090AD', light: '#48CAE4' },
                    amber: { DEFAULT: '#FFB703' },
                    purple: { from: '#4A00E0', to: '#8E2DE2' }
                  },
                  boxShadow: {
                    glow: '0 0 0 1px rgba(0,180,216,0.15), 0 4px 24px rgba(0,180,216,0.08)'
                  }
                }
              }
            }
          `
        }} />
        <link href="/static/style.css" rel="stylesheet" />
      </head>
      <body class="bg-navy text-slate-200 font-sans antialiased">
        {children}
        <script src="/static/helpers.js"></script>
        <script src="/static/api.js"></script>
        <script src="/static/login.js"></script>
        <script src="/static/views_discussion.js"></script>
        <script src="/static/views_kanban.js"></script>
        <script src="/static/views_documents.js"></script>
        <script src="/static/views_gates.js"></script>
        <script src="/static/views_events.js"></script>
        <script src="/static/views_directory.js"></script>
        <script src="/static/views_jobs.js"></script>
        <script src="/static/views_roadmap.js"></script>
        <script src="/static/views_investor.js"></script>
        <script src="/static/admin_panel.js"></script>
        <script src="/static/app.js"></script>
      </body>
    </html>
  )
})
