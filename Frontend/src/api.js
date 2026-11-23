import axios from 'axios'

// Always use the current origin. Vite proxies this path during local development;
// Vercel routes it to the serverless Express function in production.
// Deliberately do not read VITE_API_URL: stale localhost values break production builds.
const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { Accept: 'application/json' },
})

export default api
