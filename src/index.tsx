import { Hono } from 'hono'
import { renderer } from './renderer'
import type { Bindings, Variables } from './lib/types'

import authRoutes from './routes/auth'
import adminRoutes from './routes/admin'
import channelRoutes from './routes/channels'
import postRoutes from './routes/posts'
import taskRoutes from './routes/tasks'
import documentRoutes from './routes/documents'
import gateRoutes from './routes/gates'
import eventRoutes from './routes/events'
import roadmapRoutes from './routes/roadmap'
import jobRoutes from './routes/jobs'
import ventureRoutes from './routes/ventures'
import directoryRoutes from './routes/directory'

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// Static files are served directly by Netlify CDN from the publish directory

app.route('/api/auth', authRoutes)
app.route('/api/admin', adminRoutes)
app.route('/api/channels', channelRoutes)
app.route('/api/posts', postRoutes)
app.route('/api/tasks', taskRoutes)
app.route('/api/documents', documentRoutes)
app.route('/api/gates', gateRoutes)
app.route('/api/events', eventRoutes)
app.route('/api/roadmap', roadmapRoutes)
app.route('/api/jobs', jobRoutes)
app.route('/api/ventures', ventureRoutes)
app.route('/api/directory', directoryRoutes)

app.use(renderer)

app.get('*', (c) => {
  return c.render(<div id="root"></div>)
})

export default app
