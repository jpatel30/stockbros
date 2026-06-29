'use client'
import { useState, useEffect } from 'react'
import { watchlist as wlApi } from '@/lib/api'
import { Plus, X, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import Cookies from 'js-cookie'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'
const get = (path: string) =>
  fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${Cookies.get('token')}` }
  }).then(r => r.json()).catch(() => null)

export default function WatchlistPage() {
  const [tickers, setTickers]   = useState<string[]>([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [detail, setDetail]     = useState<any>(null)
  const [loadingDetail, setLD]  = useState(false)

  useEffect(() => {
    wlApi.get().then((d: any) => setTickers(d.tickers || []))
              .finally(() => setLoading(false))
  }, [])

  const add = async () => {
    const t = input.trim().toUpperCase()
    if (!t || tickers.includes(t)) return
    await wlApi.add(t)
    setTickers(p => [...p, t])
    setInput('')
  }

  const remove = async (t: string) => {
    await wlApi.remove(t)
    setTickers(p => p.filter(x => x !== t))
    if (selected === t) { setSelected(null); setDetail(null) }
  }

  const loadDetail = async (ticker: string) => {
    if (selected === ticker) { setSelected(null); setDetail(null); return }
    setSelected(ticker)
    setDetail(null)
    setLD(true)
    try {
      const [signal, news, quote] = await Promise.all([
        get(`/api/market/ticker-signal?ticker=${ticker}`),
        get(`/api/market/news?ticker=${ticker}`),
        get(`/api/market/quote?ticker=${ticker}`),
      ])
      setDetail({ signal, news, quote })
    } finally { setLD(false) }
  }

  const d     = detail
  const sig   = d?.signal || {}
  const news  = d?.news   || []
  const quote = d?.quote  || {}

  const flowClr = sig.direction === 'BULLISH' ? 'text-emerald-600'
    : sig.direction === 'BEARISH' ? 'text-red-500' : 'text-gray-500'

  return (
    <div className="p-4 max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-bold text-gray-900">Watchlist</h1>
        <span className="text-xs text-gray-400">{tickers.length} tickers · tap any to see details</span>
      </div>

      {/* Add */}
      <div className="flex gap-2 mb-5">
        <input type="text" placeholder="Add ticker (e.g. NVDA)"
          value={input}
          onChange={e => setInput(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && add()}
          className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 bg-white shadow-sm" />
        <button onClick={add}
          className="bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-700 transition">
          <Plus size={16} />
        </button>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-5 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-bold text-gray-900 text-lg">{selected}</span>
            {loadingDetail && <RefreshCw size={14} className="animate-spin text-gray-400" />}
            {quote.price && (
              <div className="text-right">
                <span className="font-bold text-gray-900">${Number(quote.price).toFixed(2)}</span>
                <span className={`text-xs ml-2 ${Number(quote.change_pct) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {Number(quote.change_pct) >= 0 ? '+' : ''}{Number(quote.change_pct).toFixed(2)}%
                </span>
              </div>
            )}
          </div>

          {d && (
            <>
              {/* Stats grid */}
              <div className="grid grid-cols-4 divide-x divide-gray-100 border-b border-gray-100">
                {[
                  { l: 'Flow',      v: sig.direction || '—',           c: flowClr },
                  { l: 'Dark pool', v: sig.dp_score != null ? `${sig.dp_score}/100` : '—', c: '' },
                  { l: 'IV rank',   v: sig.iv_rank   != null ? `${sig.iv_rank}/100` : '—', c: '' },
                  { l: 'Volume',    v: quote.volume   ? `${(Number(quote.volume)/1e6).toFixed(1)}M` : '—', c: '' },
                ].map(({ l, v, c }) => (
                  <div key={l} className="px-3 py-3 text-center">
                    <div className="text-xs text-gray-400 mb-1">{l}</div>
                    <div className={`text-sm font-bold ${c || 'text-gray-900'}`}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Flow detail */}
              {(sig.flow_score != null || sig.sweeps != null) && (
                <div className="px-4 py-2.5 border-b border-gray-100 flex gap-4 text-xs text-gray-500">
                  {sig.flow_score != null && <span>Flow score: <strong className="text-gray-900">{sig.flow_score}</strong></span>}
                  {sig.sweeps != null && <span>Sweeps: <strong className="text-gray-900">{sig.sweeps}</strong></span>}
                  {sig.alert_count != null && <span>Alerts: <strong className="text-gray-900">{sig.alert_count}</strong></span>}
                </div>
              )}

              {/* News */}
              {news.length > 0 && (
                <div className="px-4 py-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Recent News</p>
                  {news.slice(0, 5).map((n: any, i: number) => (
                    <div key={i} className="py-2 border-b border-gray-50 last:border-0">
                      <p className="text-xs text-gray-800 leading-relaxed">
                        {n.headline || n.title || n.summary || ''}
                      </p>
                      {n.source && (
                        <p className="text-xs text-gray-400 mt-0.5">{n.source}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {!loadingDetail && news.length === 0 && (
                <div className="px-4 py-3 text-xs text-gray-400">No recent news</div>
              )}
            </>
          )}

          {loadingDetail && (
            <div className="px-4 py-6 text-center text-xs text-gray-400 animate-pulse">
              Loading data...
            </div>
          )}
        </div>
      )}

      {/* Ticker grid */}
      {loading ? (
        <div className="grid grid-cols-4 gap-2">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {tickers.map(t => (
            <div key={t} onClick={() => loadDetail(t)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl border cursor-pointer transition ${
                selected === t
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}>
              <span className="font-semibold text-gray-900 text-sm">{t}</span>
              <button onClick={e => { e.stopPropagation(); remove(t) }}
                className="text-gray-200 hover:text-red-400 transition ml-1">
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
