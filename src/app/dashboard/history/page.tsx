'use client'
import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, RefreshCw, BarChart3 } from 'lucide-react'
import Cookies from 'js-cookie'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'
const get = (path: string) =>
  fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${Cookies.get('token')}` } })
    .then(r => r.json()).catch(() => null)

const dollars = (n: number) => `$${Math.abs(n).toFixed(0)}`
const signed  = (n: number) => `${n >= 0 ? '+' : '-'}$${Math.abs(n).toFixed(0)}`
const pct     = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
const pnlClr  = (n: number) => n > 0 ? 'text-emerald-600' : n < 0 ? 'text-red-500' : 'text-gray-400'

function BacktestSummary({ stats }: { stats: any }) {
  if (!stats?.available) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-5 text-xs text-blue-700">
        📊 Backtest stats will appear once recommendations have been marked to market (happens automatically).
      </div>
    )
  }

  return (
    <div className="bg-gray-900 text-white rounded-2xl p-4 mb-5">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 size={15} />
        <span className="font-semibold text-sm">Track Record ({stats.total_recommendations} recommendations)</span>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div className="text-xs text-gray-400">Overall win rate</div>
          <div className={`text-xl font-bold ${stats.overall_win_rate >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
            {stats.overall_win_rate}%
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-400">Avg return</div>
          <div className={`text-xl font-bold ${stats.overall_avg_pnl_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {pct(stats.overall_avg_pnl_pct)}
          </div>
        </div>
      </div>
      {Object.keys(stats.by_conviction_tier || {}).length > 0 && (
        <div className="flex gap-3 text-xs mb-2 flex-wrap">
          {Object.entries(stats.by_conviction_tier).map(([tier, s]: any) => (
            <span key={tier} className="bg-gray-800 rounded-lg px-2 py-1">
              {tier}: <strong>{s.win_rate}%</strong> ({s.count})
            </span>
          ))}
        </div>
      )}
      {stats.insight && (
        <p className="text-xs text-gray-300 mt-2 pt-2 border-t border-gray-700">{stats.insight}</p>
      )}
    </div>
  )
}

function PickRow({ p }: { p: any }) {
  const hasMark = p.pnl_dollars !== null
  return (
    <div className="flex items-center justify-between py-2.5 px-1 border-b border-gray-50 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-gray-900 text-sm">{p.ticker}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${
            p.direction === 'BULLISH' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
          }`}>{p.direction}</span>
          <span className="text-xs text-gray-400">{(p.strategy || 'STOCK').replace(/_/g,' ')}</span>
        </div>
        <div className="text-xs text-gray-400 mt-0.5">
          conv {p.conviction_score}/100
          {p.expiry && ` · exp ${p.expiry}`}
          {p.mark_type === 'live' && <span className="text-emerald-500 ml-1">● live</span>}
          {p.mark_type === 'eod_close' && <span className="text-gray-400 ml-1">○ close</span>}
        </div>
      </div>
      <div className="text-right ml-3">
        <div className="text-xs text-gray-400">
          ${p.entry_value?.toFixed(2)} → {hasMark ? `$${p.current_value?.toFixed(2)}` : '—'}
        </div>
        {hasMark ? (
          <div className={`text-sm font-bold ${pnlClr(p.pnl_dollars)}`}>
            {signed(p.pnl_dollars)} ({pct(p.pnl_pct)})
          </div>
        ) : (
          <div className="text-xs text-gray-300">pending mark</div>
        )}
      </div>
    </div>
  )
}

function DateGroup({ group }: { group: any }) {
  const [open, setOpen] = useState(group === group) // default open for most recent handled by parent
  const [isOpen, setIsOpen] = useState(true)

  const dateLabel = new Date(group.date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric'
  })

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-3 overflow-hidden">
      <button onClick={() => setIsOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-gray-900 text-sm">📅 {dateLabel}</span>
          <span className="text-xs text-gray-400">{group.total_picks} picks</span>
        </div>
        <div className="flex items-center gap-3">
          {group.marked_picks > 0 && (
            <>
              <span className={`text-sm font-bold ${pnlClr(group.net_pnl)}`}>
                {signed(group.net_pnl)}
              </span>
              <span className="text-xs text-gray-400">
                {group.winners}W / {group.losers}L · {group.win_rate}%
              </span>
            </>
          )}
          {isOpen ? <ChevronUp size={14} className="text-gray-400"/> : <ChevronDown size={14} className="text-gray-400"/>}
        </div>
      </button>
      {isOpen && (
        <div className="px-4 pb-2">
          {group.picks.map((p: any) => <PickRow key={p.id} p={p} />)}
        </div>
      )}
    </div>
  )
}

export default function HistoryPage() {
  const [history, setHistory] = useState<any[]>([])
  const [stats, setStats]     = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [daysBack, setDaysBack] = useState(30)

  const load = async (force = false) => {
    force ? setRefreshing(true) : setLoading(true)
    try {
      const [h, s] = await Promise.all([
        get(`/api/recommendations/history-grouped?days_back=${daysBack}&force_remark=${force}`),
        get(`/api/recommendations/backtest-stats?days_back=90`),
      ])
      setHistory(h?.history || [])
      setStats(s)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [daysBack])

  return (
    <div className="p-4 max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-bold text-gray-900">Recommendation History</h1>
        <div className="flex items-center gap-2">
          <select value={daysBack} onChange={e => setDaysBack(Number(e.target.value))}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none">
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
          </select>
          <button onClick={() => load(true)} disabled={refreshing}
            className="text-gray-400 hover:text-gray-700 transition p-1.5 border border-gray-200 rounded-lg">
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <BacktestSummary stats={stats} />

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          No recommendation history yet — run a scan on the Picks tab to get started.
        </div>
      ) : (
        history.map(group => <DateGroup key={group.date} group={group} />)
      )}
    </div>
  )
}
