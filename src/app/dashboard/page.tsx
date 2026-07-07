'use client'
import { useState, useEffect } from 'react'
import { portfolio, recommendations, alerts as alertsApi, signals, stockRecs } from '@/lib/api'
import { tierBg, tierColor } from '@/lib/utils'
import { RefreshCw, TrendingDown, TrendingUp, Minus, Search, RotateCcw, ChevronDown, ChevronUp, Bell, X } from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────
const dollars  = (n: number) => `$${Math.abs(n).toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`
const signed   = (n: number) => `${n >= 0 ? '+' : '-'}$${Math.abs(n).toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`
const pct      = (n: number) => `${n >= 0 ? '+' : ''}${(n ?? 0).toFixed(1)}%`
const clrPct   = (n: number) => n > 0 ? 'text-emerald-600' : n < 0 ? 'text-red-500' : 'text-gray-500'
const clrPnl   = (n: number) => n > 0 ? 'text-emerald-600' : n < 0 ? 'text-red-500' : 'text-gray-400'
const pnlAbs   = (b: any)    => (b.pnl ?? ((b.current_value ?? 0) - (b.investment ?? 0)))

const HORIZONS = [{v:'1w',l:'1W'},{v:'2w',l:'2W'},{v:'1m',l:'1M'},{v:'3m',l:'3M'},{v:'6m',l:'6M'},{v:'1yr',l:'1Y'}]
interface Prefs { budget: number; stop_pct: number; profit_pct: number; horizon: string; risk: string }
const DEFAULT: Prefs = { budget: 2000, stop_pct: 40, profit_pct: 100, horizon: '1m', risk: 'moderate' }


// ── Position Row ──────────────────────────────────────────────────────────────
function PosRow({ b }: { b: any }) {
  const abs = pnlAbs(b)
  const pp  = b.pnl_pct ?? 0
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <div>
        <span className="font-semibold text-gray-900 text-sm">{b.symbol}</span>
        <span className="text-xs text-gray-400 ml-1.5">{b.qty} {b.type === 'OPTION' ? 'ctr' : 'sh'}</span>
      </div>
      <div className="text-right">
        <div className={`text-sm font-bold ${clrPct(pp)}`}>{pct(pp)}</div>
        <div className={`text-xs ${clrPnl(abs)}`}>{signed(abs)}</div>
      </div>
    </div>
  )
}

// ── Option Position Row (portfolio) ──────────────────────────────────────────
function OptPosRow({ b }: { b: any }) {
  const abs    = pnlAbs(b)
  const pp     = b.pnl_pct ?? 0
  // Webull option symbol: "GLD Jul10 2026 165.00 P" or similar
  const sym    = b.symbol || ''
  const parts  = sym.split(' ')
  const ticker = parts[0] || sym
  const expiry = parts.length > 1 ? parts.slice(1,3).join(' ') : ''
  const strike = parts.find((p:string) => !isNaN(Number(p))) || b.strike_price || ''
  const optType= parts.slice(-1)[0]?.toUpperCase() === 'P' ? 'PUT'
               : parts.slice(-1)[0]?.toUpperCase() === 'C' ? 'CALL' : ''

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <div>
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-gray-900 text-sm">{ticker}</span>
          {optType && (
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
              optType === 'CALL' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            }`}>{optType}</span>
          )}
        </div>
        <div className="text-xs text-gray-400 mt-0.5">
          {b.qty} ctr
          {strike ? ` · $${Number(strike).toFixed(0)}` : ''}
          {expiry ? ` · ${expiry}` : ''}
        </div>
      </div>
      <div className="text-right">
        <div className={`text-sm font-bold ${clrPct(pp)}`}>{pct(pp)}</div>
        <div className={`text-xs ${clrPnl(abs)}`}>{signed(abs)}</div>
      </div>
    </div>
  )
}

// ── Fill Button — per recommendation card ────────────────────────────────────
function FillButton({ ticker }: { ticker: string }) {
  const [filled, setFilled] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleFill = async () => {
    setLoading(true)
    try {
      const token = document.cookie.match(/token=([^;]+)/)?.[1] || ''
      await fetch('http://localhost:8001/api/execution/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ symbol: ticker, entry_price: 0, qty: 1 })
      })
      setFilled(true)
    } catch (e) {
      setFilled(true)
    } finally {
      setLoading(false)
    }
  }

  if (filled) {
    return (
      <div className="px-4 py-2 border-t border-gray-100 text-xs text-emerald-600 font-medium">
        ✅ Marked as filled — monitoring for alerts
      </div>
    )
  }

  return (
    <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-2">
      <span className="text-xs text-gray-400">Did you enter this trade?</span>
      <button onClick={handleFill} disabled={loading}
        className="text-xs px-2.5 py-1 bg-amber-50 border border-amber-300 rounded-lg text-amber-800 hover:bg-amber-100 transition font-medium">
        {loading ? '...' : `✅ Filled ${ticker}`}
      </button>
    </div>
  )
}

// ── Options Card ──────────────────────────────────────────────────────────────
function OptCard({ rec }: { rec: any }) {
  const [open, setOpen] = useState(false)
  const optDir    = rec.direction || ''
  const DirIcon = optDir === 'BULLISH' ? TrendingUp : optDir === 'BEARISH' ? TrendingDown : Minus
  const dirCls  = optDir === 'BULLISH' ? 'text-emerald-600' : optDir === 'BEARISH' ? 'text-red-500' : 'text-gray-400'
  const dirBg   = optDir === 'BULLISH' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : optDir === 'BEARISH' ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-gray-50 text-gray-600 border-gray-200'

  // Direct field mapping from smart_engine output (verified from actual response)
  const ticker    = rec.ticker || ''
  const expDate   = rec.expiry || ''
  const dte       = rec.dte || ''
  const strategy  = (rec.strategy || '').replace(/_/g,' ')
  const conf      = rec.confidence || rec.conviction_score || 0
  const legs      = rec.legs || []

  // Cost display: webull_limit_price is the actual order price
  const isCredit  = rec.strategy?.includes("IRON") || rec.strategy?.includes("CREDIT")
  const limitPx   = rec.webull_limit_price || rec.entry_debit || 0
  const limitAbs  = Math.abs(limitPx)
  const costPerCtr = Math.abs(limitPx) * 100  // per contract in dollars
  const maxLoss   = Math.abs(rec.max_loss_per_contract || rec.max_loss || 0)
  const maxGain   = rec.max_profit_per_contract || rec.max_profit || 0
  const rr        = rec.risk_reward || 0
  const webull    = rec.webull_instructions || ''
  const thesis    = rec.reasoning || rec.thesis || ''
  const inval     = rec.key_risk || rec.invalidation_conditions || ''
  const catalyst  = rec.catalyst || ''

  // Legs display: "BUY $730P · SELL $720P"
  const legsDisplay = legs.length > 0
    ? legs.map((l: any) => `${l.action} $${Number(l.strike).toFixed(0)} ${l.type?.[0]||''}`)
          .join(' · ')
    : ''

  // Greeks from first leg
  const leg1 = legs[0] || {}
  const leg2 = legs[1] || {}
  const leg1Mid = Number(leg1.mid || 0).toFixed(2)
  const leg2Mid = Number(leg2.mid || 0).toFixed(2)
  const spread   = rec.spread_width || Math.abs((leg1.strike||0)-(leg2.strike||0))

  return (
    <div className={`rounded-2xl border shadow-sm mb-3 overflow-hidden ${
      rec.status === 'BROKEN'
        ? 'bg-gray-50 border-gray-200 opacity-60'
        : 'bg-white border-gray-200'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <DirIcon size={15} className={dirCls} />
          <span className="font-bold text-gray-900 text-base">{ticker}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${dirBg}`}>{optDir}</span>
          <span className="text-xs text-gray-400">{strategy}</span>
          {/* Status badge */}
          {rec.status && rec.status !== 'NEW' && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              rec.status === 'INTACT'  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
              rec.status === 'UPDATED' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
              rec.status === 'BROKEN'  ? 'bg-red-50 text-red-500 border border-red-200' :
              'bg-gray-50 text-gray-500'
            }`}>
              {rec.status === 'INTACT' ? '✅ INTACT' : rec.status === 'UPDATED' ? '⬆️ STRONGER' : '❌ BROKEN'}
            </span>
          )}
          {rec.status === 'NEW' && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">🆕 NEW</span>
          )}
          {legsDisplay && (
            <span className="text-xs font-mono font-semibold text-gray-800 bg-gray-100 px-2 py-0.5 rounded-lg">
              {legsDisplay}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{expDate}{dte ? ` · ${dte}d` : ''}</span>
          <span className={`text-lg font-bold ${tierColor(conf >= 75 ? 'HIGH' : conf >= 65 ? 'MODERATE' : 'WATCH')}`}>
            {conf}/100
          </span>
        </div>
      </div>

      {/* Key numbers */}
      <div className="grid grid-cols-4 divide-x divide-gray-100 border-b border-gray-100">
        <div className="px-3 py-2 text-center">
          <div className="text-xs text-gray-400">Limit price</div>
          <div className="text-sm font-bold text-gray-900">
            {limitAbs ? (isCredit ? `Credit $${limitAbs.toFixed(2)}/sh` : `$${limitAbs.toFixed(2)}/sh`) : '—'}
          </div>
        </div>
        <div className="px-3 py-2 text-center">
          <div className="text-xs text-gray-400">Max loss/ctr</div>
          <div className="text-sm font-bold text-red-500">{maxLoss ? `$${maxLoss.toFixed(0)}` : '—'}</div>
        </div>
        <div className="px-3 py-2 text-center">
          <div className="text-xs text-gray-400">Max gain/ctr</div>
          <div className="text-sm font-bold text-emerald-600">{maxGain ? `$${maxGain.toFixed(0)}` : '—'}</div>
        </div>
        <div className="px-3 py-2 text-center">
          <div className="text-xs text-gray-400">R:R</div>
          <div className="text-sm font-bold text-gray-900">{rr ? `${rr.toFixed(1)}x` : '—'}</div>
        </div>
      </div>

      {/* Leg details + greeks */}
      {legs.length > 0 && (
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
          {legs.map((l: any, i: number) => (
            <div key={i} className="flex items-center justify-between text-xs mb-1 last:mb-0">
              <div className="flex items-center gap-2">
                <span className={`font-bold px-1.5 py-0.5 rounded text-xs ${
                  l.action === 'BUY' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                }`}>{l.action}</span>
                <span className="font-semibold text-gray-900">
                  ${Number(l.strike).toFixed(0)} {l.type}
                </span>
                <span className="text-gray-400">exp {l.expiry || expDate}</span>
              </div>
              <div className="text-right text-gray-500">
                ${Number(l.mid||0).toFixed(2)} mid
                {l.delta ? ` · Δ${l.delta.toFixed(3)}` : ''}
                {l.iv ? ` · IV ${(l.iv*100).toFixed(0)}%` : ''}
              </div>
            </div>
          ))}
          {spread > 0 && (
            <div className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-200">
              Spread width: ${Number(spread).toFixed(1)} · Expiry: {expDate} ({dte}d)
            </div>
          )}
        </div>
      )}

      {/* Webull instructions */}
      {webull && (
        <div className="px-4 py-2.5 bg-blue-50 border-b border-blue-100">
          <span className="text-xs font-medium text-blue-700">📱 {webull}</span>
        </div>
      )}

      {/* Status reason + Thesis + catalyst */}
      <div className="px-4 py-3">
        {rec.status_reason && (
          <p className={`text-xs font-medium mb-1.5 ${
            rec.status === 'INTACT'  ? 'text-emerald-600' :
            rec.status === 'UPDATED' ? 'text-blue-600' :
            rec.status === 'BROKEN'  ? 'text-red-500' : 'text-purple-600'
          }`}>→ {rec.status_reason}</p>
        )}
        {thesis && <p className="text-xs text-gray-600 leading-relaxed mb-1">{thesis}</p>}
        {catalyst && <p className="text-xs text-blue-600">📌 {catalyst}</p>}
      </div>

      {/* Expand */}
      {inval && (
        <>
          <button onClick={() => setOpen(!open)}
            className="flex items-center gap-1 px-4 py-2 text-xs text-gray-400 hover:text-gray-600 border-t border-gray-100 w-full">
            {open ? <ChevronUp size={10}/> : <ChevronDown size={10}/>}
            {open ? 'Hide' : 'Invalidation conditions'}
          </button>
          {open && (
            <div className="px-4 pb-3 text-xs text-orange-600 bg-orange-50">
              ⚠️ {inval}
            </div>
          )}
        </>
      )}
      {/* Fill confirmation — per card */}
      <FillButton ticker={ticker} />
    </div>
  )
}

// ── Stock Card ────────────────────────────────────────────────────────────────
function StockCard({ r }: { r: any }) {
  const [open, setOpen] = useState(false)
  const ticker  = r.ticker || r.symbol || '?'
  const horizon = r.horizon_label || r.horizon || ''
  const tgtPct  = r.target_pct || 0
  const fund    = r.fundamental_score || 0
  const conf    = r.conviction_score || r.fundamental_score || 0
  const thesis  = r.thesis || ''
  const inval   = r.invalidation_conditions || ''
  const analyst = r.analyst_rec || ''
  const upside  = r.analyst_upside_pct || tgtPct

  // Status badge (same system as options)
  const status  = r.status || 'NEW'
  const statusCls = status === 'INTACT'  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : status === 'UPDATED' ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : status === 'BROKEN'  ? 'bg-red-50 text-red-500 border-red-200'
                  : 'bg-purple-50 text-purple-700 border-purple-200'
  const statusLabel = status === 'INTACT' ? '✅ INTACT'
                    : status === 'UPDATED' ? '⬆️ STRONGER'
                    : status === 'BROKEN'  ? '❌ BROKEN'
                    : '🆕 NEW'

  // Conviction tier (same as options)
  const tier    = conf >= 75 ? 'HIGH' : conf >= 65 ? 'MODERATE' : 'WATCH'
  const confCls = tier === 'HIGH' ? 'text-emerald-600' : tier === 'MODERATE' ? 'text-yellow-600' : 'text-orange-500'

  return (
    <div className={`rounded-2xl border shadow-sm mb-3 overflow-hidden ${
      status === 'BROKEN' ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-white border-gray-200'
    }`}>
      {/* Header — same layout as OptCard */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 flex-wrap">
          <TrendingUp size={14} className="text-blue-500" />
          <span className="font-bold text-gray-900 text-base">{ticker}</span>
          <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full">
            {horizon} · STOCK
          </span>
          {status !== 'NEW' && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${statusCls}`}>
              {statusLabel}
            </span>
          )}
          {status === 'NEW' && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              🆕 NEW
            </span>
          )}
        </div>
        <div className="text-right">
          <div className={`text-lg font-bold ${confCls}`}>{conf}/100</div>
          <div className="text-xs text-gray-400">{tier}</div>
        </div>
      </div>

      {/* Status reason */}
      {r.status_reason && (
        <div className={`px-4 py-1.5 text-xs font-medium border-b border-gray-100 ${
          status === 'INTACT' ? 'text-emerald-600 bg-emerald-50'
          : status === 'UPDATED' ? 'text-blue-600 bg-blue-50'
          : 'text-gray-500 bg-gray-50'
        }`}>→ {r.status_reason}</div>
      )}

      {/* Key numbers */}
      <div className="grid grid-cols-4 divide-x divide-gray-100 border-b border-gray-100">
        <div className="px-3 py-2 text-center">
          <div className="text-xs text-gray-400">Entry</div>
          <div className="text-sm font-bold text-gray-900">
            {r.entry_price ? `$${r.entry_price.toFixed(2)}` : '—'}
          </div>
        </div>
        <div className="px-3 py-2 text-center">
          <div className="text-xs text-gray-400">Target</div>
          <div className="text-sm font-bold text-emerald-600">
            {r.target_price ? `$${r.target_price.toFixed(0)}` : '—'}
            {tgtPct ? ` (+${tgtPct.toFixed(1)}%)` : ''}
          </div>
        </div>
        <div className="px-3 py-2 text-center">
          <div className="text-xs text-gray-400">Stop</div>
          <div className="text-sm font-bold text-red-500">
            {r.stop_price ? `$${r.stop_price.toFixed(0)}` : '—'}
            {r.stop_pct ? ` (${r.stop_pct}%)` : ''}
          </div>
        </div>
        <div className="px-3 py-2 text-center">
          <div className="text-xs text-gray-400">Fundamentals</div>
          <div className="text-sm font-bold text-gray-900">{fund}/100</div>
        </div>
      </div>

      {/* Analyst + R:R */}
      {(analyst || r.risk_reward) && (
        <div className="px-4 py-2 border-b border-gray-100 flex gap-4 text-xs text-gray-500">
          {analyst && <span>Analyst: <strong className="text-gray-900 capitalize">{analyst}</strong></span>}
          {r.analyst_count && <span>{r.analyst_count} analysts</span>}
          {r.risk_reward && <span>R:R: <strong className="text-gray-900">{r.risk_reward.toFixed(1)}x</strong></span>}
          {r.shares && <span>Shares: <strong className="text-gray-900">{r.shares}</strong></span>}
        </div>
      )}

      {/* Thesis */}
      <div className="px-4 py-3">
        {thesis && <p className="text-xs text-gray-600 leading-relaxed">{thesis}</p>}
      </div>

      {/* Invalidation conditions */}
      {inval && (
        <>
          <button onClick={() => setOpen(!open)}
            className="flex items-center gap-1 px-4 py-2 text-xs text-gray-400 hover:text-gray-600 border-t border-gray-100 w-full">
            {open ? <ChevronUp size={10}/> : <ChevronDown size={10}/>}
            {open ? 'Hide' : 'Invalidation conditions'}
          </button>
          {open && (
            <div className="px-4 pb-3 text-xs text-orange-600 bg-orange-50">⚠️ {inval}</div>
          )}
        </>
      )}
    </div>
  )
}

// ── Alert Item ────────────────────────────────────────────────────────────────
function AlertItem({ a, onDismiss }: any) {
  return (
    <div className={`flex gap-2 items-start p-2.5 rounded-lg border text-xs mb-1.5 ${
      a.urgency === 'HIGH' ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'
    }`}>
      <div className="flex-1">
        <span className={`font-bold mr-1 ${a.urgency === 'HIGH' ? 'text-red-600' : 'text-yellow-700'}`}>{a.symbol}</span>
        <span className="text-gray-600">{a.message?.slice(0,80)}</span>
      </div>
      <button onClick={() => onDismiss(a.id)} className="text-gray-400 hover:text-gray-700 mt-0.5">
        <X size={12}/>
      </button>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [port, setPort]           = useState<any>(null)
  const [refreshingPort, setRP]   = useState(false)
  const [recs, setRecs]           = useState<any[]>([])
  const [stocks, setStocks]       = useState<any[]>([])
  const [alertList, setAlerts]    = useState<any[]>([])
  const [sellSigs, setSellSigs]   = useState<any[]>([])
  const [prefs, setPrefs]         = useState<Prefs>(DEFAULT)
  const [stage, setStage]         = useState<'form'|'scanning'|'results'>('form')
  const [loadingPort, setLP]      = useState(true)
  const [fills, setFills]         = useState<string[]>([]) // tickers user confirmed filled
  const [checkingFills, setChkF]  = useState(false)
  const [msg, setMsg]             = useState('')
  const [autoCheckCount, setACC]  = useState(0)
  const [showOpts, setShowOpts]   = useState(true)
  const [showStks, setShowStks]   = useState(true)
  const [showSigs, setShowSigs]   = useState(true)
  const [showAlts, setShowAlts]   = useState(true)

  useEffect(() => {
    // Listen for refresh events from layout strip button
    const onRefresh = () => {
      portfolio.get(true).then(setPort).catch(() => {})
    }
    window.addEventListener('portfolio:refresh', onRefresh)
    return () => window.removeEventListener('portfolio:refresh', onRefresh)
  }, [])

  useEffect(() => {
    portfolio.get(false).then(setPort).finally(() => setLP(false))
    alertsApi.get(10).then(setAlerts).catch(() => {})
    signals.sell().then(s => setSellSigs(s?.filter((x:any) => x.signals?.length > 0) || [])).catch(() => {})

    // Only auto-load cached OPTIONS recs from a real prior scan today.
    // Never auto-loads stocks, never shows results unless cache actually exists.
    recommendations.daily(false, undefined, 'options').then(d => {
      if (d.recommendations?.length && d.source === 'cached_today') {
        setRecs(d.recommendations)
        setStocks([])
        setStage('results')

        const lastScan   = d.recommendations[0]?.scan_time || ''
        const now        = new Date()
        const etHour     = (now.getUTCHours() - 4 + 24) % 24
        const marketOpen = etHour >= 9 && etHour < 16
        const scanAge    = lastScan
          ? (now.getTime() - new Date(lastScan).getTime()) / 1000 / 60
          : 999
        if (marketOpen && scanAge > 120) {
          setTimeout(runScan, 2000)
        }
      }
    }).catch(() => {})
  }, [])

  const refreshPort = () => { setRP(true); portfolio.get(true).then(setPort).finally(() => setRP(false)) }
  const dismissAlert = (id: string) => { alertsApi.dismiss(id); setAlerts(a => a.filter(x => x.id !== id)) }
  const runScan = async () => {
    setStage('scanning')

    try {
      const params = new URLSearchParams({
        force_refresh: 'true',
        budget: String(prefs.budget),
        ...(prefs.sector   ? {sector:   prefs.sector}   : {}),
        ...(prefs.cap_size ? {cap_size: prefs.cap_size} : {}),
        ...(prefs.catalyst ? {catalyst: prefs.catalyst} : {}),
      })
      const d = await recommendations.daily(true, prefs.budget, prefs.scanType, prefs.horizon)
      const optRecs  = d.recommendations || []
      const stkRecs  = d.stocks || []
      if (prefs.scanType === 'stocks') {
        setRecs([])
        setStocks(stkRecs)
      } else {
        setRecs(optRecs)
        setStocks([])  // clear stocks when showing options
      }
      setMsg(d.market_view || '')
      if (optRecs.length > 0 || stkRecs.length > 0) {
        setStage('results')
      } else {
        setMsg('No high-conviction picks today — SPY/QQQ used as fallback')
        setStage('form')
      }
    } catch (err) {
      console.error('Scan error:', err)
      setStage('form')
    }
  }

  const bets   = port?.bets || []
  // Use type field (fixed in API to merge from pnl.positions)
  const isOpt      = (b: any) => b.type === 'OPTION'
  const opts_pos   = bets.filter(isOpt).sort((a:any,b:any) => (a.pnl_pct??0)-(b.pnl_pct??0))
  const stocks_pos = bets.filter((b:any) => !isOpt(b)).sort((a:any,b:any) => (a.pnl_pct??0)-(b.pnl_pct??0))

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">


      {/* Main */}
      <div className="flex-1 flex flex-col lg:flex-row">

        {/* LEFT: Portfolio */}
        <div className="lg:w-64 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4">

            {loadingPort ? (
              <div className="space-y-2 animate-pulse">
                {[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-gray-100 rounded-lg"/>)}
              </div>
            ) : (
              <>
                {/* Options first (losers first) */}
                {opts_pos.length > 0 && (
                  <div className="mb-4">
                    <button onClick={() => setShowOpts(v => !v)}
                      className="flex items-center justify-between w-full mb-2">
                      <span className="text-xs font-semibold text-purple-500 uppercase tracking-wide">
                        Options ({opts_pos.length})
                      </span>
                      <span className="text-xs text-gray-400">{showOpts ? '▲' : '▼'}</span>
                    </button>
                    {showOpts && opts_pos.map((b:any, i:number) => <OptPosRow key={`o-${i}`} b={b}/>)}
                  </div>
                )}

                {/* Stocks (losers first) */}
                {stocks_pos.length > 0 && (
                  <div>
                    <button onClick={() => setShowStks(v => !v)}
                      className="flex items-center justify-between w-full mb-2">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        Stocks ({stocks_pos.length})
                      </span>
                      <span className="text-xs text-gray-400">{showStks ? '▲' : '▼'}</span>
                    </button>
                    {showStks && stocks_pos.map((b:any, i:number) => <PosRow key={`s-${i}`} b={b}/>)}
                  </div>
                )}

                {bets.length === 0 && (
                  <p className="text-xs text-gray-400 text-center mt-8">No open positions</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* CENTER: Picks */}
        <div className="flex-1 p-4 lg:overflow-y-auto">

          {/* Scan form */}
          {stage === 'form' && (
            <div className="max-w-lg">
              {/* Scan type toggle */}
              <div className="flex gap-3 mb-5">
                <button onClick={() => setPrefs(p => ({...p, scanType:'options', horizon:'1m'}))}
                  className={`flex-1 py-3 rounded-2xl text-sm font-semibold border-2 transition ${
                    prefs.scanType !== 'stocks'
                      ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                      : 'border-gray-200 text-gray-500 bg-white'
                  }`}>📈 Options</button>
                <button onClick={() => setPrefs(p => ({...p, scanType:'stocks', horizon:'6m'}))}
                  className={`flex-1 py-3 rounded-2xl text-sm font-semibold border-2 transition ${
                    prefs.scanType === 'stocks'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'border-gray-200 text-gray-500 bg-white'
                  }`}>🏢 Stocks</button>
              </div>
              <p className="text-sm font-semibold text-gray-700 mb-4">
                {prefs.scanType === 'stocks' ? 'Stock scan parameters' : 'Options scan parameters'}
              </p>

              {/* ── OPTIONS parameters ─────────────────────────── */}
              {prefs.scanType !== 'stocks' && (<>
                <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-3">
                  <p className="text-xs text-gray-500 mb-2 font-medium">Investment amount</p>
                  <div className="flex gap-2 flex-wrap">
                    {[500,1000,2000,5000].map(v => (
                      <button key={v} onClick={() => setPrefs(p => ({...p, budget:v}))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                          prefs.budget===v ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600'
                        }`}>${v.toLocaleString()}</button>
                    ))}
                    <input type="number" placeholder="Custom"
                      onChange={e => setPrefs(p => ({...p, budget:Number(e.target.value)}))}
                      className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-gray-400" />
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-3">
                  <p className="text-xs text-gray-500 mb-2 font-medium">Expiry horizon</p>
                  <div className="flex gap-2 flex-wrap">
                    {[{v:'1w',l:'1 Week'},{v:'2w',l:'2 Week'},{v:'1m',l:'1 Month'},{v:'3m',l:'3 Month'}].map(({v,l}) => (
                      <button key={v} onClick={() => setPrefs(p => ({...p, horizon:v}))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                          prefs.horizon===v ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600'
                        }`}>{l}</button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    {label:'Max loss', key:'stop_pct', opts:[25,40,50], active:'bg-red-500 text-white border-red-500'},
                    {label:'Target', key:'profit_pct', opts:[50,100,200], active:'bg-emerald-500 text-white border-emerald-500'},
                    {label:'Risk', key:'risk', opts:['conservative','moderate','aggressive'], labels:['C','M','A'], active:'bg-yellow-500 text-white border-yellow-500'},
                  ].map(({label,key,opts,labels,active}) => (
                    <div key={key} className="bg-white rounded-2xl border border-gray-200 p-3">
                      <p className="text-xs text-gray-500 mb-2 font-medium">{label}</p>
                      <div className="flex gap-1">
                        {opts.map((v,i) => (
                          <button key={String(v)} onClick={() => setPrefs(p => ({...p, [key]:v}))}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition ${
                              (prefs as any)[key]===v ? active : 'border-gray-200 text-gray-500'
                            }`}>{labels ? labels[i] : (typeof v==='number' ? v+'%' : String(v)[0].toUpperCase())}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>)}

              {/* ── STOCKS parameters ──────────────────────────────── */}
              {prefs.scanType === 'stocks' && (<>
                <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-3">
                  <p className="text-xs text-gray-500 mb-2 font-medium">Holding period</p>
                  <div className="flex gap-2">
                    {[{v:'3m',l:'Short term',sub:'1–3 months'},{v:'6m',l:'Medium term',sub:'3–6 months'},{v:'1yr',l:'Long term',sub:'6–12 months'}].map(({v,l,sub}) => (
                      <button key={v} onClick={() => setPrefs(p => ({...p, horizon:v}))}
                        className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-medium border-2 transition text-center ${
                          prefs.horizon===v ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 bg-white'
                        }`}>
                        <div className="font-semibold">{l}</div>
                        <div className={`text-xs mt-0.5 ${prefs.horizon===v ? 'text-blue-100' : 'text-gray-400'}`}>{sub}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-3">
                  <p className="text-xs text-gray-500 mb-2 font-medium">Investment amount</p>
                  <div className="flex gap-2 flex-wrap">
                    {[1000,2500,5000,10000,25000].map(v => (
                      <button key={v} onClick={() => setPrefs(p => ({...p, budget:v}))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                          prefs.budget===v ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600'
                        }`}>${v.toLocaleString()}</button>
                    ))}
                    <input type="number" placeholder="Custom"
                      onChange={e => setPrefs(p => ({...p, budget:Number(e.target.value)}))}
                      className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-white rounded-2xl border border-gray-200 p-3">
                    <p className="text-xs text-gray-500 mb-2 font-medium">Risk tolerance</p>
                    <div className="flex gap-1">
                      {[['C','conservative'],['M','moderate'],['A','aggressive']].map(([l,v]) => (
                        <button key={v} onClick={() => setPrefs(p => ({...p, risk:v}))}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition ${
                            prefs.risk===v ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-500'
                          }`}>{l}</button>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-200 p-3">
                    <p className="text-xs text-gray-500 mb-2 font-medium">Stop loss</p>
                    <div className="flex gap-1">
                      {[10,15,20].map(v => (
                        <button key={v} onClick={() => setPrefs(p => ({...p, stop_pct:v}))}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition ${
                            prefs.stop_pct===v ? 'bg-red-500 text-white border-red-500' : 'border-gray-200 text-gray-500'
                          }`}>{v}%</button>
                      ))}
                    </div>
                  </div>
                </div>
              </>)}

              <button onClick={runScan}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 rounded-2xl flex items-center justify-center gap-2 text-sm transition shadow-sm">
                {prefs.scanType === 'stocks' ? <><span>🏢</span> Find Best Stocks</> : <><Search size={15}/> Find Best Options</>}

              </button>
            </div>
          )}

          {stage === 'scanning' && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-10 h-10 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin mb-4"/>
              <p className="text-sm text-gray-600">Scanning {prefs.horizon} picks...</p>
              <p className="text-xs text-gray-400 mt-1">${prefs.budget.toLocaleString()} · {prefs.risk}</p>
            </div>
          )}

          {stage === 'results' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-gray-700">
                  {recs.length} option{recs.length !== 1 ? 's' : ''} · {stocks.length} stock{stocks.length !== 1 ? 's' : ''}
                </p>
                <button onClick={() => { setRecs([]); setStocks([]); setStage('form') }}
                  className="text-xs text-gray-400 hover:text-gray-700 transition">
                  ← Back
                </button>
                <button onClick={() => { setRecs([]); setStage('form') }}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 transition">
                  <RotateCcw size={11}/> Rescan
                </button>
              </div>



              {fills.filter(f => f !== 'SKIPPED').length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4 text-xs text-emerald-700">
                  ✅ Tracking: {fills.filter(f => f !== 'SKIPPED').join(', ')} — monitoring for alerts
                </div>
              )}

              {/* Options */}
              {recs.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    Options Recommendations
                  </p>
                  {recs.map((r, i) => <OptCard key={r.id || i} rec={r}/>)}
                </div>
              )}

              {/* Stocks — only shown when stock scan */}
              {stocks.length > 0 && prefs.scanType === 'stocks' && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    Stock Recommendations
                  </p>
                  {stocks.map((r, i) => <StockCard key={i} r={r}/>)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Alerts */}
        <div className="lg:w-60 bg-white border-l border-gray-200 p-4">
          {/* Sell signals in alerts panel */}
          {sellSigs.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
              <button onClick={() => setShowSigs(v => !v)}
                className="flex items-center justify-between w-full mb-1">
                <span className="text-xs font-bold text-red-600">⚠️ SELL ({sellSigs.length})</span>
                <span className="text-xs text-red-400">{showSigs ? '▲' : '▼'}</span>
              </button>
              {showSigs && sellSigs.map((s:any, i:number) => (
                <div key={`ss-${i}`} className="text-xs text-red-700 mb-1 leading-tight">
                  <strong>{s.symbol}</strong> {s.pnl_pct?.toFixed(1)}%
                  <span className="text-red-500 ml-1">— {s.signals?.[0]?.slice(0,35)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setShowAlts(v => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <Bell size={11}/> Alerts
              {alertList.length > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                  {alertList.length}
                </span>
              )}
              <span className="text-gray-300 ml-1">{showAlts ? '▲' : '▼'}</span>
            </button>
            {alertList.length > 0 && (
              <button onClick={() => { alertsApi.dismissAll(); setAlerts([]) }}
                className="text-xs text-gray-400 hover:text-gray-700">clear</button>
            )}
          </div>
          {showAlts && (alertList.length === 0
            ? <p className="text-xs text-gray-300 text-center mt-6">No alerts</p>
            : alertList.map(a => <AlertItem key={a.id} a={a} onDismiss={dismissAlert}/>)
          )}
        </div>
      </div>
    </div>
  )
}
