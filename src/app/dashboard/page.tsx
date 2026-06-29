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

// ── Top Strip ─────────────────────────────────────────────────────────────────
function Strip({ data, onRefresh, refreshing }: any) {
  const pnl  = data?.pnl  || {}
  const bal  = data?.balances || {}
  const acct = bal.account_currency_assets?.[0] || {}
  const net  = pnl.net_liq || parseFloat(acct.net_liquidation_value || '0') || 0
  const cash = pnl.cash    || parseFloat(bal.total_cash_balance      || '0') || 0
  const dp   = pnl.total_pnl || 0

  return (
    <div className="flex items-center gap-6 px-5 py-2.5 bg-white border-b border-gray-200 shadow-sm">
      <span className="font-bold text-gray-900 text-sm">StockBros</span>
      <div className="flex gap-5 flex-1 text-sm">
        <span className="text-gray-500">Net Liq <strong className="text-gray-900">{dollars(net)}</strong></span>
        <span className="text-gray-500">P&L <strong className={clrPnl(dp)}>{signed(dp)}</strong></span>
        <span className="text-gray-500">Cash <strong className="text-blue-600">{dollars(cash)}</strong></span>
        <span className="text-gray-500">Win <strong className="text-gray-900">{pnl.win_rate || 0}%</strong></span>
      </div>
      <button onClick={onRefresh} disabled={refreshing} className="text-gray-400 hover:text-gray-700 transition">
        <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
      </button>
    </div>
  )
}

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

// ── Options Card ──────────────────────────────────────────────────────────────
function OptCard({ rec }: { rec: any }) {
  const [open, setOpen] = useState(false)
  const dir = rec.direction
  const DirIcon = dir === 'BULLISH' ? TrendingUp : dir === 'BEARISH' ? TrendingDown : Minus
  const dirCls  = dir === 'BULLISH' ? 'text-emerald-600' : dir === 'BEARISH' ? 'text-red-500' : 'text-gray-400'
  const dirBg   = dir === 'BULLISH' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : dir === 'BEARISH' ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-gray-50 text-gray-600 border-gray-200'

  const expDate  = rec.expiry || ''
  const dte      = rec.best?.dte || rec.dte || ''
  const strategy = (rec.strategy || rec.best?.strategy || '').replace(/_/g,' ')
  const cost     = rec.entry_debit || rec.total_cost || rec.best?.entry_debit || 0
  const maxLoss  = rec.max_loss  || rec.best?.max_loss  || 0
  const maxGain  = rec.max_profit || rec.best?.max_profit || 0
  const rr       = rec.risk_reward || rec.best?.risk_reward || 0
  const tgt      = rec.target_price || rec.best?.target_price || 0
  const tgtPct   = rec.target_pct  || rec.best?.target_pct  || 0
  const stop     = rec.stop_price  || rec.best?.stop_price  || 0
  const entry    = rec.entry_zone_low  || rec.best?.entry_zone_low  || 0
  const entryH   = rec.entry_zone_high || rec.best?.entry_zone_high || 0
  const ticker   = rec.ticker || rec.best?.ticker || ''
  const conf     = rec.confidence || rec.conviction_score || rec.best?.confidence || 0
  const webull   = rec.webull_instructions || rec.best?.webull_instructions || ''
  const thesis   = rec.thesis || rec.reasoning || rec.best?.thesis || ''
  const inval    = rec.invalidation_conditions || rec.best?.invalidation_conditions || ''
  const legs     = rec.legs || rec.best?.legs || []

  // Format legs: "BUY $190 PUT · SELL $182.50 PUT"
  const legsDisplay = legs.length > 0
    ? legs.map((l: any) => `${l.action} $${Number(l.strike).toFixed(0)} ${l.type}`).join(' · ')
    : ''

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-3 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <DirIcon size={15} className={dirCls} />
          <span className="font-bold text-gray-900 text-base">{ticker}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${dirBg}`}>{dir}</span>
          <span className="text-xs text-gray-400">{strategy}</span>
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
        {[
          { l: 'Entry debit', v: cost > 0 ? `$${cost.toFixed(2)}/sh` : '—' },
          { l: 'Max loss',    v: maxLoss  ? dollars(Math.abs(maxLoss)) : '—', c: 'text-red-500' },
          { l: 'Max gain',    v: maxGain  ? dollars(maxGain)            : '—', c: 'text-emerald-600' },
          { l: 'R:R',         v: rr ? `${rr.toFixed(1)}x` : '—' },
        ].map(({ l, v, c }) => (
          <div key={l} className="px-3 py-2 text-center">
            <div className="text-xs text-gray-400">{l}</div>
            <div className={`text-sm font-bold ${c || 'text-gray-900'}`}>{v}</div>
          </div>
        ))}
      </div>

      {/* Entry zone + targets */}
      <div className="grid grid-cols-3 gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="text-xs">
          <span className="text-gray-400 block mb-0.5">Entry zone</span>
          <span className="font-semibold text-gray-900">
            {entry ? `$${entry} – $${entryH}` : '—'}
          </span>
        </div>
        <div className="text-xs">
          <span className="text-gray-400 block mb-0.5">Target</span>
          <span className="font-semibold text-emerald-600">
            {tgt ? `$${tgt.toFixed(0)} (${tgtPct > 0 ? '+' : ''}${tgtPct?.toFixed(1)}%)` : '—'}
          </span>
        </div>
        <div className="text-xs">
          <span className="text-gray-400 block mb-0.5">Stop</span>
          <span className="font-semibold text-red-500">{stop ? `$${stop.toFixed(0)}` : '—'}</span>
        </div>
      </div>

      {/* Webull instructions */}
      {webull && (
        <div className="px-4 py-2.5 bg-blue-50 border-b border-blue-100">
          <span className="text-xs font-medium text-blue-700">📱 {webull}</span>
        </div>
      )}

      {/* Thesis */}
      {thesis && (
        <div className="px-4 py-3">
          <p className="text-xs text-gray-600 leading-relaxed">{thesis.slice(0, 180)}{thesis.length > 180 ? '...' : ''}</p>
        </div>
      )}

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
    </div>
  )
}

// ── Stock Card ────────────────────────────────────────────────────────────────
function StockCard({ r }: { r: any }) {
  const ticker  = r.ticker || r.symbol || '?'
  const horizon = r.horizon_label || r.horizon || ''
  const tgtPct  = r.target_pct || 0
  const fund    = r.fundamental_score || 0

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-3 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-blue-500" />
          <span className="font-bold text-gray-900">{ticker}</span>
          <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full">
            {horizon} · STOCK
          </span>
        </div>
        <span className="font-bold text-emerald-600">{tgtPct > 0 ? '+' : ''}{tgtPct.toFixed(1)}%</span>
      </div>

      <div className="grid grid-cols-4 divide-x divide-gray-100 border-b border-gray-100">
        {[
          { l: 'Entry',   v: r.entry_price ? `$${r.entry_price.toFixed(2)}` : '—' },
          { l: 'Target',  v: r.target_price ? `$${r.target_price.toFixed(0)}` : '—', c: 'text-emerald-600' },
          { l: 'Stop',    v: r.stop_price   ? `$${r.stop_price.toFixed(0)}`  : '—', c: 'text-red-500' },
          { l: 'Fund',    v: `${fund}/100` },
        ].map(({ l, v, c }) => (
          <div key={l} className="px-3 py-2 text-center">
            <div className="text-xs text-gray-400">{l}</div>
            <div className={`text-sm font-bold ${c || 'text-gray-900'}`}>{v}</div>
          </div>
        ))}
      </div>

      {r.thesis && (
        <div className="px-4 py-3">
          <p className="text-xs text-gray-600 leading-relaxed">{r.thesis.slice(0, 160)}...</p>
        </div>
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

  useEffect(() => {
    portfolio.get(false).then(setPort).finally(() => setLP(false))
    alertsApi.get(10).then(setAlerts).catch(() => {})
    stockRecs.get(5000).then(d => setStocks(d?.stocks || [])).catch(() => {})
    signals.sell().then(s => setSellSigs(s?.filter((x:any) => x.signals?.length > 0) || [])).catch(() => {})
    recommendations.daily().then(d => {
      if (d.recommendations?.length) { setRecs(d.recommendations); setStage('results') }
    }).catch(() => {})
  }, [])

  const refreshPort = () => { setRP(true); portfolio.get(true).then(setPort).finally(() => setRP(false)) }
  const dismissAlert = (id: string) => { alertsApi.dismiss(id); setAlerts(a => a.filter(x => x.id !== id)) }
  const runScan = async () => {
    setStage('scanning')
    try {
      const d = await recommendations.daily(true)
      setRecs(d.recommendations || [])
      setStage(d.recommendations?.length ? 'results' : 'form')
    } catch { setStage('form') }
  }

  const bets   = port?.bets || []
  // Detect options: type field OR symbol length > 6 (options have long symbols)
  const isOpt  = (b: any) => b.type === 'OPTION' || (b.symbol?.length > 6 && !['GOOGL','CRWV','IONQ','MSTR','RKLB','AAOI','SNDK'].includes(b.symbol))
  // Sort losers first within each group
  const opts_pos   = bets.filter(isOpt).sort((a:any,b:any) => (a.pnl_pct ?? 0) - (b.pnl_pct ?? 0))
  const stocks_pos = bets.filter((b:any) => !isOpt(b)).sort((a:any,b:any) => (a.pnl_pct ?? 0) - (b.pnl_pct ?? 0))

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      {/* Top strip */}
      <Strip data={port} onRefresh={refreshPort} refreshing={refreshingPort} />

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
                    <p className="text-xs font-semibold text-purple-500 uppercase tracking-wide mb-2">
                      Options ({opts_pos.length})
                    </p>
                    {opts_pos.map((b:any, i:number) => <PosRow key={`o-${i}`} b={b}/>)}
                  </div>
                )}

                {/* Stocks (losers first) */}
                {stocks_pos.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                      Stocks ({stocks_pos.length})
                    </p>
                    {stocks_pos.map((b:any, i:number) => <PosRow key={`s-${i}`} b={b}/>)}
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
              <p className="text-sm font-semibold text-gray-700 mb-4">Set today's parameters</p>

              <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-3">
                <p className="text-xs text-gray-500 mb-2 font-medium">Budget</p>
                <div className="flex gap-2 flex-wrap">
                  {[500,1000,2000,5000].map(v => (
                    <button key={v} onClick={() => setPrefs(p => ({...p, budget:v}))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                        prefs.budget===v ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:border-gray-400'
                      }`}>${v.toLocaleString()}</button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-3">
                <p className="text-xs text-gray-500 mb-2 font-medium">Horizon</p>
                <div className="flex gap-2 flex-wrap">
                  {HORIZONS.map(({v,l}) => (
                    <button key={v} onClick={() => setPrefs(p => ({...p, horizon:v}))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                        prefs.horizon===v ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-gray-400'
                      }`}>{l}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  {label:'Max loss', key:'stop_pct', opts:[25,40,50], active:'bg-red-500 text-white border-red-500'},
                  {label:'Target',   key:'profit_pct', opts:[50,100,200], active:'bg-emerald-500 text-white border-emerald-500'},
                  {label:'Risk',     key:'risk', opts:['conservative','moderate','aggressive'],
                   labels:['C','M','A'], active:'bg-yellow-500 text-white border-yellow-500'},
                ].map(({label, key, opts, labels, active}) => (
                  <div key={key} className="bg-white rounded-2xl border border-gray-200 p-3">
                    <p className="text-xs text-gray-500 mb-2 font-medium">{label}</p>
                    <div className="flex gap-1">
                      {opts.map((v, i) => (
                        <button key={String(v)} onClick={() => setPrefs(p => ({...p, [key]:v}))}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition ${
                            (prefs as any)[key]===v ? active : 'border-gray-200 text-gray-500'
                          }`}>{labels ? labels[i] : (typeof v === 'number' ? v+'%' : String(v)[0].toUpperCase())}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={runScan}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 rounded-2xl flex items-center justify-center gap-2 text-sm transition shadow-sm">
                <Search size={15}/> Find Best Picks
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
                <button onClick={() => { setRecs([]); setStage('form') }}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 transition">
                  <RotateCcw size={11}/> Rescan
                </button>
              </div>

              {/* Options */}
              {recs.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                    Options Recommendations
                  </p>
                  {recs.map((r, i) => <OptCard key={r.id || i} rec={r}/>)}
                </div>
              )}

              {/* Stocks */}
              {stocks.length > 0 && (
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
              <p className="text-xs font-bold text-red-600 mb-2">⚠️ SELL SIGNALS ({sellSigs.length})</p>
              {sellSigs.map((s:any, i:number) => (
                <div key={`ss-${i}`} className="text-xs text-red-700 mb-1 leading-tight">
                  <strong>{s.symbol}</strong> {s.pnl_pct?.toFixed(1)}%
                  <span className="text-red-500 ml-1">— {s.signals?.[0]?.slice(0,35)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <Bell size={11}/> Alerts
              {alertList.length > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                  {alertList.length}
                </span>
              )}
            </p>
            {alertList.length > 0 && (
              <button onClick={() => { alertsApi.dismissAll(); setAlerts([]) }}
                className="text-xs text-gray-400 hover:text-gray-700">clear</button>
            )}
          </div>
          {alertList.length === 0
            ? <p className="text-xs text-gray-300 text-center mt-6">No alerts</p>
            : alertList.map(a => <AlertItem key={a.id} a={a} onDismiss={dismissAlert}/>)
          }
        </div>
      </div>
    </div>
  )
}
