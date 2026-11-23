import axios from 'axios'

// Local development defaults to /api and is proxied by Vite to localhost:8000.
// Production sets VITE_API_URL to the separately hosted Express API base URL.
const configuredBase = (import.meta.env.VITE_API_URL || '').trim()
const baseURL = configuredBase ? configuredBase.replace(/\/+$/, '') : '/api'

const api = axios.create({
  baseURL,
  timeout: 120000, // Render Free instances can take about a minute to wake after idle.
  headers: { Accept: 'application/json' },
})

export default api
