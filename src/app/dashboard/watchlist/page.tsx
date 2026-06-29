'use client'
import { useState, useEffect } from 'react'
import { watchlist as wlApi } from '@/lib/api'
import { Plus, X, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'
import axios from 'axios'
import Cookies from 'js-cookie'

const api = (path: string) => axios.get(
  `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'}${path}`,
  { headers: { Authorization: `Bearer ${Cookies.get('token')}` } }
).then(r => r.data)

interface TickerInfo {
  ticker: string
  price?: number
  change_pct?: number
  dp_score?: number
  news?: string[]
  flow?: string
  iv_rank?: number
}

export default function WatchlistPage() {
  const [tickers, setTickers]   = useState<string[]>([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(true)
  const [enriched, setEnriched] = useState<Record<string, TickerInfo>>({})
  const [enriching, setEnriching] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)

  const load = () =>
    wlApi.get().then((d: any) => setTickers(d.tickers || []))
              .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const add = async () => {
    const t = input.trim().toUpperCase()
    if (!t || tickers.includes(t)) return
    await wlApi.add(t)
    setTickers(prev => [...prev, t])
    setInput('')
  }

  const remove = async (ticker: string) => {
    await wlApi.remove(ticker)
    setTickers(prev => prev.filter(t => t !== ticker))
    if (selected === ticker) setSelected(null)
  }

  const enrichTicker = async (ticker: string) => {
    if (enriched[ticker]) { setSelected(ticker); return }
    setEnriching(true)
    try {
      const [signal, news] = await Promise.all([
        api(`/api/market/ticker-signal?ticker=${ticker}`).catch(() => ({})),
        api(`/api/market/news?ticker=${ticker}`).catch(() => []),
      ])
      setEnriched(prev => ({
        ...prev,
        [ticker]: {
          ticker,
          dp_score:  signal?.dp_score,
          flow:      signal?.direction,
          iv_rank:   signal?.iv_rank,
          news:      (news || []).slice(0,3).map((n: any) => n.headline || n.title || ''),
        }
      }))
      setSelected(ticker)
    } catch { setSelected(ticker) }
    finally { setEnriching(false) }
  }

  const sel = selected ? enriched[selected] : null

  return (
    <div className="p-4 pb-20">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gray-900">Watchlist</h1>
        <span className="text-xs text-gray-400">{tickers.length} tickers</span>
      </div>

      {/* Add ticker */}
      <div className="flex gap-2 mb-5">
        <input type="text" placeholder="Add ticker (e.g. NVDA)"
          value={input} onChange={e => setInput(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && add()}
          className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 shadow-sm" />
        <button onClick={add}
          className="bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-700 transition">
          <Plus size={16} />
        </button>
      </div>

      {/* Detail panel for selected ticker */}
      {selected && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-gray-900 text-base">{selected}</span>
            {enriching && <RefreshCw size={14} className="animate-spin text-gray-400" />}
          </div>
          {sel ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-gray-400 mb-0.5">Flow</div>
                  <div className={`font-bold ${sel.flow === 'BULLISH' ? 'text-emerald-600' : sel.flow === 'BEARISH' ? 'text-red-500' : 'text-gray-600'}`}>
                    {sel.flow || '—'}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-gray-400 mb-0.5">Dark pool</div>
                  <div className="font-bold text-gray-900">{sel.dp_score != null ? `${sel.dp_score}/100` : '—'}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-gray-400 mb-0.5">IV rank</div>
                  <div className="font-bold text-gray-900">{sel.iv_rank != null ? `${sel.iv_rank}/100` : '—'}</div>
                </div>
              </div>
              {sel.news && sel.news.length > 0 && (
                <div>
                  <div className="text-xs text-gray-400 mb-1.5 font-medium">Recent news</div>
                  {sel.news.map((n, i) => (
                    <div key={i} className="text-xs text-gray-700 py-1.5 border-b border-gray-100 last:border-0">
                      {n}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-400">Loading data...</p>
          )}
        </div>
      )}

      {/* Ticker grid */}
      {loading ? (
        <div className="grid grid-cols-3 gap-2">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse"/>)}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {tickers.map(t => (
            <div key={t}
              onClick={() => enrichTicker(t)}
              className={`flex items-center justify-between bg-white border rounded-xl px-3 py-2.5 cursor-pointer transition ${
                selected === t ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}>
              <span className="font-semibold text-gray-900 text-sm">{t}</span>
              <button onClick={e => { e.stopPropagation(); remove(t) }}
                className="text-gray-300 hover:text-red-400 transition ml-1">
                <X size={12}/>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
