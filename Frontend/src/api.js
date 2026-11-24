import axios from 'axios'

// Production: Express serves the frontend and API from the same Render origin.
// Local development: Vite proxies /api to the local Express server.
const api = axios.create({
  baseURL: '/api',
  timeout: 120000,
  headers: { Accept: 'application/json' },
})

export default api
