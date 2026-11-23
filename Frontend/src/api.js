import axios from 'axios'

const api = axios.create({
  // Same-origin requests work locally (via Vite proxy) and on Vercel.
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
})

export default api
