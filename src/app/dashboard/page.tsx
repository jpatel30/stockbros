'use client'
import { useState, useEffect, useCallback } from 'react'
import { portfolio, recommendations, alerts as alertsApi, signals } from '@/lib/api'
import { fmt, tierBg, tierColor, pnlColor } from '@/lib/utils'
import {
  TrendingUp, TrendingDown, Minus, RefreshCw, Search,
  Bell, X, ChevronDown, ChevronUp, RotateCcw
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────
interface Prefs {
  budget: number; stop_pct: number; profit_pct: number
  horizon: string; risk: string
}
const DEFAULT_PREFS: Prefs = { budget: 2000, stop_pct: 40, profit_pct: 100, horizon: '1m', risk: 'moderate' }
const HORIZONS = [
  {v:'1w',l:'1W'},{v:'2w',l:'2W'},{v:'1m',l:'1M'},
  {v:'3m',l:'3M'},{v:'6m',l:'6M'},{v:'1yr',l:'1Y'},
]

// ── Portfolio Strip ──────────────────────────────────────────────────────────
function PortfolioStrip({ data, onRefresh, refreshing }: any) {
  const pnl = data?.pnl || {}
  const bal = data?.balances || {}
  const acct = bal.account_currency_assets?.[0] || {}
  const net_liq = pnl.net_liq || parseFloat(acct.net_liquidation_value || '0') || 0
  const cash    = pnl.cash    || parseFloat(bal.total_cash_balance    || '0') || 0
  const stats = [
    { l: 'Net Liq',  v: fmt.dollars(net_liq), c: '' },
    { l: 'P&L',      v: fmt.signed(pnl.total_pnl || 0), c: pnlColor(pnl.total_pnl || 0) },
    { l: 'Cash',     v: fmt.dollars(cash), c: 'text-blue-400' },
    { l: 'Win Rate', v: `${pnl.win_rate || 0}%`, c: '' },
  ]
  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-gray-900 border-b border-gray-800">
      <span className="text-emerald-400 font-bold text-sm hidden sm:block">StockBros</span>
      <div className="flex gap-4 flex-1">
        {stats.map(s => (
          <div key={s.l} className="text-xs">
            <span className="text-gray-500">{s.l} </span>
            <span className={`font-bold ${s.c}`}>{s.v}</span>
          </div>
        ))}
      </div>
      <button onClick={onRefresh} disabled={refreshing}
        className="text-gray-500 hover:text-white transition">
        <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
      </button>
    </div>
  )
}

// ── Position Row ──────────────────────────────────────────────────────────────
function PositionRow({ b }: { b: any }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-800/50 last:border-0">
      <div>
        <span className="text-sm font-bold">{b.symbol}</span>
        <span className="text-xs text-gray-500 ml-1.5">{b.qty} {b.type === 'OPTION' ? 'ctr' : 'sh'}</span>
      </div>
      <div className="text-right">
        <div className={`text-sm font-bold ${pnlColor(b.pnl_pct)}`}>{fmt.pct(b.pnl_pct)}</div>
        <div className={`text-xs ${pnlColor(b.pnl)}`}>{fmt.signed(b.pnl)}</div>
      </div>
    </div>
  )
}

// ── Recommendation Card ───────────────────────────────────────────────────────
function RecCard({ rec }: { rec: any }) {
  const [open, setOpen] = useState(false)
  const DirIcon = rec.direction === 'BULLISH' ? TrendingUp
    : rec.direction === 'BEARISH' ? TrendingDown : Minus

  return (
    <div className={`rounded-xl border p-3 ${tierBg(rec.conviction_tier)} mb-2`}>
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-1.5">
          <DirIcon size={13} className={rec.direction === 'BULLISH' ? 'text-green-400' : 'text-red-400'} />
          <span className="font-bold">{rec.ticker}</span>
          <span className="text-xs text-gray-500">{rec.strategy}</span>
          <span className="text-xs text-gray-600">{rec.timeframe}</span>
        </div>
        <span className={`text-sm font-bold ${tierColor(rec.conviction_tier)}`}>
          {rec.conviction_score}/100
        </span>
      </div>

      <p className="text-xs text-gray-400 mt-1.5 leading-relaxed line-clamp-2">{rec.thesis}</p>

      <div className="flex gap-2 mt-2 text-xs">
        <span className="bg-gray-800/60 rounded px-2 py-0.5">
          Entry ${rec.entry_zone_low}–{rec.entry_zone_high}
        </span>
        <span className="bg-green-900/40 text-green-400 rounded px-2 py-0.5">
          ▲ ${rec.target_price} ({fmt.pct(rec.target_pct || 0)})
        </span>
        <span className="bg-red-900/40 text-red-400 rounded px-2 py-0.5">
          ▼ ${rec.stop_price}
        </span>
      </div>

      {rec.webull_instructions && (
        <div className="text-xs text-blue-400 mt-1.5 bg-blue-900/10 rounded px-2 py-1">
          {rec.webull_instructions}
        </div>
      )}

      <button onClick={() => setOpen(!open)}
        className="text-xs text-gray-600 mt-1.5 flex items-center gap-1">
        {open ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        {open ? 'less' : 'more'}
      </button>

      {open && rec.invalidation_conditions && (
        <div className="text-xs text-orange-400 mt-1 bg-orange-900/10 rounded px-2 py-1">
          ⚠️ {rec.invalidation_conditions}
        </div>
      )}
    </div>
  )
}

// ── Alert Item ────────────────────────────────────────────────────────────────
function AlertItem({ a, onDismiss }: any) {
  return (
    <div className={`flex gap-2 items-start p-2 rounded-lg border text-xs mb-1 ${
      a.urgency === 'HIGH' ? 'border-red-800/50 bg-red-900/10'
      : 'border-yellow-800/50 bg-yellow-900/10'
    }`}>
      <div className="flex-1">
        <span className="font-bold mr-1">{a.symbol}</span>
        <span className="text-gray-400">{a.message?.slice(0, 80)}</span>
      </div>
      <button onClick={() => onDismiss(a.id)} className="text-gray-600 hover:text-white">
        <X size={12} />
      </button>
    </div>
  )
}

// ── Main Single Page ──────────────────────────────────────────────────────────
export default function Dashboard() {
  const [port, setPort]         = useState<any>(null)
  const [refreshingPort, setRP] = useState(false)
  const [recs, setRecs]         = useState<any[]>([])
  const [alertList, setAlerts]  = useState<any[]>([])
  const [sellSigs, setSellSigs] = useState<any[]>([])
  const [prefs, setPrefs]       = useState<Prefs>(DEFAULT_PREFS)
  const [stage, setStage]       = useState<'form'|'scanning'|'results'>('form')
  const [loadingPort, setLP]    = useState(true)

  // Load portfolio + alerts instantly on mount
  useEffect(() => {
    portfolio.get(false).then(setPort).finally(() => setLP(false))
    alertsApi.get(10).then(setAlerts).catch(() => {})
    // Check for cached recs
    recommendations.daily().then(d => {
      if (d.recommendations?.length) { setRecs(d.recommendations); setStage('results') }
    }).catch(() => {})
    // Sell signals (rule-based, fast)
    signals.sell().then(s => setSellSigs(s?.filter((x:any) => x.signals?.length > 0) || [])).catch(() => {})
  }, [])

  const refreshPort = async () => {
    setRP(true)
    portfolio.get(true).then(setPort).finally(() => setRP(false))
  }

  const runScan = async () => {
    setStage('scanning')
    try {
      const d = await recommendations.daily(true)
      setRecs(d.recommendations || [])
      setStage(d.recommendations?.length ? 'results' : 'form')
    } catch { setStage('form') }
  }

  const dismissAlert = async (id: string) => {
    await alertsApi.dismiss(id)
    setAlerts(a => a.filter(x => x.id !== id))
  }

  const positions = port?.bets || []
  const winners   = positions.filter((p:any) => p.pnl_pct > 0).sort((a:any,b:any) => b.pnl_pct - a.pnl_pct)
  const losers    = positions.filter((p:any) => p.pnl_pct <= 0).sort((a:any,b:any) => a.pnl_pct - b.pnl_pct)

  return (
    <div className="min-h-screen flex flex-col bg-gray-950">

      {/* Portfolio strip — always visible at top */}
      <PortfolioStrip data={port} onRefresh={refreshPort} refreshing={refreshingPort} />

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">

        {/* LEFT: Positions */}
        <div className="lg:w-72 lg:min-h-0 lg:overflow-y-auto border-r border-gray-800 p-3">
          {loadingPort ? (
            <div className="space-y-2 animate-pulse">
              {[1,2,3,4].map(i => <div key={i} className="h-10 bg-gray-800 rounded" />)}
            </div>
          ) : (
            <>
              {/* Sell signals */}
              {sellSigs.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-red-400 mb-1">⚠️ SELL SIGNALS ({sellSigs.length})</p>
                  {sellSigs.slice(0,3).map((s:any, i:number) => (
                    <div key={`ss-${s.symbol}-${i}`} className="text-xs bg-red-900/20 border border-red-800/30 rounded px-2 py-1 mb-1">
                      <span className="font-bold text-red-400">{s.symbol}</span>
                      <span className="text-gray-400 ml-1">{s.pnl_pct}% — {s.signals?.[0]?.slice(0,30)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Winners */}
              {winners.length > 0 && (
                <>
                  <p className="text-xs text-green-500 font-semibold mb-1">WINNERS</p>
                  {winners.map((b:any, i:number) => <PositionRow key={`w-${i}`} b={b} />)}
                </>
              )}

              {/* Losers */}
              {losers.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-red-500 font-semibold mb-1">LOSERS</p>
                  {losers.map((b:any, i:number) => <PositionRow key={`l-${i}`} b={b} />)}
                </div>
              )}

              {positions.length === 0 && (
                <p className="text-xs text-gray-600 text-center mt-8">No open positions</p>
              )}
            </>
          )}
        </div>

        {/* CENTER: Picks */}
        <div className="flex-1 p-3 lg:overflow-y-auto">

          {stage === 'form' && (
            <div>
              <p className="text-sm font-semibold mb-3">Set today's parameters</p>

              {/* Budget */}
              <div className="mb-3">
                <p className="text-xs text-gray-400 mb-1.5">Budget</p>
                <div className="flex gap-1.5 flex-wrap">
                  {[500,1000,2000,5000].map(v => (
                    <button key={v} onClick={() => setPrefs(p => ({...p, budget:v}))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        prefs.budget === v ? 'bg-emerald-500 text-black' : 'bg-gray-800 text-gray-300'
                      }`}>${v.toLocaleString()}</button>
                  ))}
                </div>
              </div>

              {/* Horizon */}
              <div className="mb-3">
                <p className="text-xs text-gray-400 mb-1.5">Time horizon</p>
                <div className="flex gap-1.5 flex-wrap">
                  {HORIZONS.map(({v,l}) => (
                    <button key={v} onClick={() => setPrefs(p => ({...p, horizon:v}))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        prefs.horizon === v ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-300'
                      }`}>{l}</button>
                  ))}
                </div>
              </div>

              {/* Stop / Profit / Risk row */}
              <div className="flex gap-2 mb-4">
                <div className="flex-1">
                  <p className="text-xs text-gray-400 mb-1.5">Max loss</p>
                  <div className="flex gap-1">
                    {[25,40,50].map(v => (
                      <button key={v} onClick={() => setPrefs(p => ({...p, stop_pct:v}))}
                        className={`flex-1 py-1.5 rounded text-xs transition ${
                          prefs.stop_pct === v ? 'bg-red-500/70 text-white' : 'bg-gray-800 text-gray-400'
                        }`}>{v}%</button>
                    ))}
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400 mb-1.5">Target</p>
                  <div className="flex gap-1">
                    {[50,100,200].map(v => (
                      <button key={v} onClick={() => setPrefs(p => ({...p, profit_pct:v}))}
                        className={`flex-1 py-1.5 rounded text-xs transition ${
                          prefs.profit_pct === v ? 'bg-green-500/70 text-white' : 'bg-gray-800 text-gray-400'
                        }`}>{v}%</button>
                    ))}
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400 mb-1.5">Risk</p>
                  <div className="flex gap-1">
                    {[['C','conservative'],['M','moderate'],['A','aggressive']].map(([l,v]) => (
                      <button key={v} onClick={() => setPrefs(p => ({...p, risk:v}))}
                        className={`flex-1 py-1.5 rounded text-xs transition ${
                          prefs.risk === v ? 'bg-yellow-500/70 text-white' : 'bg-gray-800 text-gray-400'
                        }`}>{l}</button>
                    ))}
                  </div>
                </div>
              </div>

              <button onClick={runScan}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm transition">
                <Search size={15} /> Find Best Picks
              </button>
            </div>
          )}

          {stage === 'scanning' && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-10 h-10 border-3 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin mb-4" />
              <p className="text-sm text-gray-400">Scanning {prefs.horizon} {prefs.risk} picks...</p>
              <p className="text-xs text-gray-600 mt-1">Budget ${prefs.budget.toLocaleString()} · Stop {prefs.stop_pct}%</p>
            </div>
          )}

          {stage === 'results' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold">{recs.length} picks · {prefs.horizon} · ${prefs.budget.toLocaleString()}</p>
                <button onClick={() => { setRecs([]); setStage('form') }}
                  className="text-xs text-gray-500 hover:text-white flex items-center gap-1">
                  <RotateCcw size={11} /> Rescan
                </button>
              </div>
              {recs.map((r, i) => <RecCard key={r.id || i} rec={r} />)}
            </div>
          )}
        </div>

        {/* RIGHT: Alerts */}
        <div className="lg:w-64 border-t lg:border-t-0 lg:border-l border-gray-800 p-3 lg:overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold flex items-center gap-1">
              <Bell size={11} className="text-yellow-400" />
              ALERTS {alertList.length > 0 && <span className="bg-red-500 text-white rounded-full px-1.5 text-xs">{alertList.length}</span>}
            </p>
            {alertList.length > 0 && (
              <button onClick={() => { alertsApi.dismissAll(); setAlerts([]) }}
                className="text-xs text-gray-600 hover:text-white">clear all</button>
            )}
          </div>
          {alertList.length === 0 ? (
            <p className="text-xs text-gray-700 text-center mt-4">No alerts</p>
          ) : (
            alertList.map(a => <AlertItem key={a.id} a={a} onDismiss={dismissAlert} />)
          )}
        </div>

      </div>
    </div>
  )
}
