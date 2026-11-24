import axios from 'axios'

// Local development uses Vite's /api proxy. Production must point directly to
// the separately deployed Render API (VITE_API_URL=https://service.onrender.com/api).
const suppliedBase = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '')
// Accept either the Render service origin or its /api URL to avoid an easy 404
// caused by forgetting the API suffix in Vercel's environment variables.
const configuredBase = suppliedBase
  ? (/\/api$/i.test(suppliedBase) ? suppliedBase : `${suppliedBase}/api`)
  : ''
const baseURL = configuredBase || '/api'

const api = axios.create({
  baseURL,
  timeout: 120000, // Allows the Render free service to wake after idle time.
  headers: { Accept: 'application/json' },
})

api.interceptors.request.use(config => {
  if (import.meta.env.PROD && !configuredBase) {
    return Promise.reject(new Error('Production API URL is missing. Set VITE_API_URL in Vercel to your Render service URL, then redeploy.'))
  }
  return config
})

export default api
