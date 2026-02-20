/**
 * API Service Layer — React ↔ FastAPI integration
 * Uses Axios for all HTTP requests to the FastAPI backend.
 *
 * Install: npm install axios
 * Usage:   import { TaskService, AIService } from './services/api'
 */

import axios from 'axios'

// ─── Base Config ──────────────────────────────────────────────────────────────
const getBackendUrl = () => {
  try {
    const settings = JSON.parse(localStorage.getItem('smart_productivity_settings') || '{}')
    return settings.backendUrl || 'http://localhost:8000'
  } catch {
    return 'http://localhost:8000'
  }
}

const api = axios.create({
  baseURL: `${getBackendUrl()}/api`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Interceptor: log errors in dev
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[API Error]', err.response?.status, err.response?.data || err.message)
    }
    return Promise.reject(err)
  }
)

// ─── Task Service ────────────────────────────────────────────────────────────
export const TaskService = {
  /** GET /api/tasks — list all tasks with optional filters */
  async getAll(params = {}) {
    const { data } = await api.get('/tasks', { params })
    return data
  },

  /** GET /api/tasks/stats */
  async getStats() {
    const { data } = await api.get('/tasks/stats')
    return data
  },

  /** POST /api/tasks — create a new task */
  async create(task) {
    const { data } = await api.post('/tasks', task)
    return data
  },

  /** GET /api/tasks/:id */
  async getById(id) {
    const { data } = await api.get(`/tasks/${id}`)
    return data
  },

  /** PUT /api/tasks/:id — partial update */
  async update(id, updates) {
    const { data } = await api.put(`/tasks/${id}`, updates)
    return data
  },

  /** DELETE /api/tasks/:id */
  async delete(id) {
    await api.delete(`/tasks/${id}`)
  },
}

// ─── AI Service ───────────────────────────────────────────────────────────────
export const AIService = {
  /**
   * POST /api/ai/priorities
   * Returns ranked task recommendations with reasons and suggested times
   */
  async analyzePriorities(tasks) {
    const { data } = await api.post('/ai/priorities', { tasks })
    return data
  },

  /**
   * POST /api/ai/daily-plan
   * Returns optimized daily schedule with time blocks and productivity tips
   */
  async generateDailyPlan(tasks) {
    const { data } = await api.post('/ai/daily-plan', { tasks })
    return data
  },

  /**
   * POST /api/ai/suggest
   * Given a task title+description, returns suggested priority and hours
   */
  async suggest(title, description = '') {
    const { data } = await api.post('/ai/suggest', { title, description })
    return data
  },
}

export default api
