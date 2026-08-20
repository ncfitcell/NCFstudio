// Thin API client wrapper around axios
const API = {
  async login(username, password) {
    const res = await axios.post('/api/auth/login', { username, password })
    return res.data
  },
  async logout() {
    return axios.post('/api/auth/logout')
  },
  async me() {
    const res = await axios.get('/api/auth/me')
    return res.data
  },
  async nav() {
    const res = await axios.get('/api/channels/nav')
    return res.data
  },
  async channelAccess(key) {
    const res = await axios.get(`/api/channels/access/${encodeURIComponent(key)}`)
    return res.data
  },
  // Posts
  async getPosts(channelKey) {
    const res = await axios.get(`/api/posts/${encodeURIComponent(channelKey)}`)
    return res.data
  },
  async createPost(channelKey, data) {
    const res = await axios.post(`/api/posts/${encodeURIComponent(channelKey)}`, data)
    return res.data
  },
  async deletePost(channelKey, id) {
    return axios.delete(`/api/posts/${encodeURIComponent(channelKey)}/${id}`)
  },
  async addComment(channelKey, postId, content) {
    const res = await axios.post(`/api/posts/${encodeURIComponent(channelKey)}/${postId}/comments`, { content })
    return res.data
  },
  // Tasks
  async getTasks(channelKey) {
    const res = await axios.get(`/api/tasks/${encodeURIComponent(channelKey)}`)
    return res.data
  },
  async createTask(channelKey, data) {
    const res = await axios.post(`/api/tasks/${encodeURIComponent(channelKey)}`, data)
    return res.data
  },
  async updateTask(channelKey, id, data) {
    const res = await axios.put(`/api/tasks/${encodeURIComponent(channelKey)}/${id}`, data)
    return res.data
  },
  async deleteTask(channelKey, id) {
    return axios.delete(`/api/tasks/${encodeURIComponent(channelKey)}/${id}`)
  },
  // Documents
  async getDocuments(channelKey) {
    const res = await axios.get(`/api/documents/${encodeURIComponent(channelKey)}`)
    return res.data
  },
  async createDocument(channelKey, data) {
    const res = await axios.post(`/api/documents/${encodeURIComponent(channelKey)}`, data)
    return res.data
  },
  async updateDocument(channelKey, id, data) {
    const res = await axios.put(`/api/documents/${encodeURIComponent(channelKey)}/${id}`, data)
    return res.data
  },
  async deleteDocument(channelKey, id) {
    return axios.delete(`/api/documents/${encodeURIComponent(channelKey)}/${id}`)
  },
  // Gates
  async getGates(channelKey) {
    const res = await axios.get(`/api/gates/${encodeURIComponent(channelKey)}`)
    return res.data
  },
  async createGate(channelKey, data) {
    const res = await axios.post(`/api/gates/${encodeURIComponent(channelKey)}`, data)
    return res.data
  },
  async voteGate(channelKey, id, vote, comment) {
    const res = await axios.post(`/api/gates/${encodeURIComponent(channelKey)}/${id}/vote`, { vote, comment })
    return res.data
  },
  async resolveGate(channelKey, id, status) {
    const res = await axios.post(`/api/gates/${encodeURIComponent(channelKey)}/${id}/resolve`, { status })
    return res.data
  },
  // Events
  async getEvents(channelKey) {
    const res = await axios.get(`/api/events/${encodeURIComponent(channelKey)}`)
    return res.data
  },
  async createEvent(channelKey, data) {
    const res = await axios.post(`/api/events/${encodeURIComponent(channelKey)}`, data)
    return res.data
  },
  async rsvpEvent(channelKey, id, status) {
    const res = await axios.post(`/api/events/${encodeURIComponent(channelKey)}/${id}/rsvp`, { status })
    return res.data
  },
  async deleteEvent(channelKey, id) {
    return axios.delete(`/api/events/${encodeURIComponent(channelKey)}/${id}`)
  },
  // Roadmap
  async getRoadmap() {
    const res = await axios.get('/api/roadmap')
    return res.data
  },
  async createRoadmapItem(data) {
    const res = await axios.post('/api/roadmap', data)
    return res.data
  },
  async updateRoadmapItem(id, data) {
    const res = await axios.put(`/api/roadmap/${id}`, data)
    return res.data
  },
  async deleteRoadmapItem(id) {
    return axios.delete(`/api/roadmap/${id}`)
  },
  // Jobs
  async getJobs() {
    const res = await axios.get('/api/jobs')
    return res.data
  },
  async createJob(data) {
    const res = await axios.post('/api/jobs', data)
    return res.data
  },
  async updateJob(id, data) {
    const res = await axios.put(`/api/jobs/${id}`, data)
    return res.data
  },
  async deleteJob(id) {
    return axios.delete(`/api/jobs/${id}`)
  },
  // Ventures
  async getVentures() {
    const res = await axios.get('/api/ventures')
    return res.data
  },
  async getDealflow() {
    const res = await axios.get('/api/ventures/dealflow')
    return res.data
  },
  async getVentureMembers(slug) {
    const res = await axios.get(`/api/ventures/${slug}/members`)
    return res.data
  },
  async createVenture(data) {
    const res = await axios.post('/api/ventures', data)
    return res.data
  },
  async updateVenture(slug, data) {
    const res = await axios.put(`/api/ventures/${slug}`, data)
    return res.data
  },
  async addVentureMember(slug, userId, roleInVenture) {
    const res = await axios.post(`/api/ventures/${slug}/members`, { userId, roleInVenture })
    return res.data
  },
  async removeVentureMember(slug, userId) {
    return axios.delete(`/api/ventures/${slug}/members/${userId}`)
  },
  async deleteVenture(slug) {
    return axios.delete(`/api/ventures/${slug}`)
  },
  async getVentureMetrics(slug) {
    const res = await axios.get(`/api/ventures/${slug}/metrics`)
    return res.data
  },
  async addVentureMetrics(slug, data) {
    const res = await axios.post(`/api/ventures/${slug}/metrics`, data)
    return res.data
  },
  async getDashboardSummary() {
    const res = await axios.get('/api/ventures/dashboard/summary')
    return res.data
  },
  // Directory
  async getUsersLite() {
    const res = await axios.get('/api/directory/users')
    return res.data
  },
  async getProfiles() {
    const res = await axios.get('/api/directory/profiles')
    return res.data
  },
  async updateProfile(data) {
    const res = await axios.put('/api/directory/profile', data)
    return res.data
  },
  // Admin
  async getRolesCatalogue() {
    const res = await axios.get('/api/admin/roles')
    return res.data
  },
  async getAllUsers() {
    const res = await axios.get('/api/admin/users')
    return res.data
  },
  async createUser(data) {
    const res = await axios.post('/api/admin/users', data)
    return res.data
  },
  async updateUser(id, data) {
    const res = await axios.put(`/api/admin/users/${id}`, data)
    return res.data
  },
  async toggleUserActive(id) {
    const res = await axios.post(`/api/admin/users/${id}/toggle-active`)
    return res.data
  },
  async resetUserPassword(id, password) {
    const res = await axios.post(`/api/admin/users/${id}/reset-password`, { password })
    return res.data
  },
  async deleteUser(id) {
    return axios.delete(`/api/admin/users/${id}`)
  }
}
