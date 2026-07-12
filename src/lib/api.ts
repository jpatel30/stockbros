import axios from 'axios'
import Cookies from 'js-cookie'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

const api = axios.create({ baseURL: API_URL, timeout: 120000 })  // 120s for slow scans

api.interceptors.request.use((config) => {
  const token = Cookies.get('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      Cookies.remove('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const auth = {
  login: (invite_code: string, display_name?: string) =>
    api.post('/api/auth/login', { invite_code, display_name }).then(r => r.data),
  me: () => api.get('/api/auth/me').then(r => r.data),
}

export const portfolio = {
  // live=false uses cache (instant), live=true fetches from Webull
  get:        (live = false) => api.get(`/api/portfolio?live=${live}`).then(r => r.data),
  pnl:        () => api.get('/api/portfolio/pnl').then(r => r.data),
  activeBets: () => api.get('/api/portfolio/active-bets').then(r => r.data),
}

export const scanStatus = () => api.get('/api/scan/status').then(r => r.data)

export const recommendations = {
  // No scan param = return cached instantly or empty with needs_scan=true
  daily:      (force?: boolean, budget?: number, scanType?: string, horizon?: string) =>
    api.get(`/api/recommendations/daily${force ? `?force_refresh=true&budget=${budget||2000}&scan_type=${scanType||'options'}&horizon=${horizon||'1m'}` : ''}`).then(r => r.data),
  history:    (days?: number) =>
    api.get(`/api/recommendations/history?days_back=${days || 7}`).then(r => r.data),
  invalidate: (ticker: string, reason: string) =>
    api.post('/api/recommendations/invalidate', { ticker, reason }).then(r => r.data),
  horizon:    (ticker: string, horizon: string, budget: number) =>
    api.post('/api/recommendations/horizon', { ticker, horizon, budget }).then(r => r.data),
}

export const alerts = {
  get:        (limit?: number) => api.get(`/api/alerts?limit=${limit || 20}`).then(r => r.data),
  dismiss:    (id: string)     => api.post(`/api/alerts/${id}/dismiss`).then(r => r.data),
  dismissAll: ()               => api.post('/api/alerts/dismiss-all').then(r => r.data),
}

export const watchlist = {
  get:    ()               => api.get('/api/watchlist').then(r => r.data),
  add:    (ticker: string) => api.post('/api/watchlist/add', { ticker }).then(r => r.data),
  remove: (ticker: string) => api.delete(`/api/watchlist/${ticker}`).then(r => r.data),
}

export const signals = {
  sell: () => api.get('/api/sell-signals').then(r => r.data),
}

export const learning = {
  report:   () => api.get('/api/learning/report').then(r => r.data),
  backtest: () => api.get('/api/learning/backtest').then(r => r.data),
}

export const stockRecs = {
  get: (budget?: number) =>
    api.get(`/api/recommendations/stocks${budget ? `?budget=${budget}` : ''}`).then(r => r.data),
}

export const checkFills = {
  check: () => api.get('/api/portfolio/check-fills').then(r => r.data),
}

export const execution = {
  confirm: (symbol: string, entry_price: number, qty: number) =>
    api.post('/api/execution/confirm', { symbol, entry_price, qty }).then(r => r.data),
  outcome: (symbol: string, exit_price: number, exit_reason: string) =>
    api.post('/api/execution/outcome', { symbol, exit_price, exit_reason }).then(r => r.data),
}

export const health = {
  check: () => api.get('/api/health').then(r => r.data),
}

export default api
