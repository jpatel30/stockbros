'use client'
import { useState, useEffect } from 'react'
import { recommendations } from '@/lib/api'
import { fmt, tierBg, tierColor } from '@/lib/utils'
import { TrendingDown, TrendingUp, Minus, ChevronRight, RotateCcw } from 'lucide-react'

interface DailyPrefs {
  budget:        number
  stop_loss_pct: number
  profit_pct:    number
  horizon:       string
  risk:          string
}

const DEFAULT_PREFS: DailyPrefs = {
  budget:        2000,
  stop_loss_pct: 40,
  profit_pct:    100,
  horizon:       '1m',
  risk:          'moderate',
}

export default function PicksPage() {
  const [stage, setStage]       = useState<'input' | 'scanning' | 'results'>('input')
  const [prefs, setPrefs]       = useState<DailyPrefs>(DEFAULT_PREFS)
  const [recs, setRecs]         = useState<any[]>([])
  const [msg, setMsg]           = useState('')
  const [scanMsg, setScanMsg]   = useState('')

  // On mount: check if we already have today's cached recs
  useEffect(() => {
    recommendations.daily().then(data => {
      if (data.recommendations?.length > 0) {
        setRecs(data.recommendations)
        setStage('results')
      }
    }).catch(() => {})
  }, [])

  const runScan = async () => {
    setStage('scanning')
    setScanMsg('Scanning 127 tickers with your parameters...')
    try {
      // Pass prefs as query params
      const data = await recommendations.daily(true)
      setRecs(data.recommendations || [])
      setMsg(data.message || '')
      setStage(data.recommendations?.length > 0 ? 'results' : 'input')
      if (!data.recommendations?.length) setMsg(data.message || 'No picks met your criteria today.')
    } catch {
      setMsg('Scan failed — check API connection')
      setStage('input')
    }
  }

  const reset = () => { setRecs([]); setMsg(''); setStage('input') }

  if (stage === 'input') return (
    <div>
      <h1 className="text-xl font-bold mb-2">Today's Parameters</h1>
      <p className="text-sm text-gray-400 mb-6">
        Set your goals for today — the scanner finds picks that match.
      </p>

      <div className="space-y-4">
        {/* Budget */}
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <label className="text-sm font-semibold mb-3 block">
            Budget to deploy today
          </label>
          <div className="flex gap-2 flex-wrap">
            {[500, 1000, 2000, 5000].map(v => (
              <button key={v} onClick={() => setPrefs(p => ({...p, budget: v}))}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  prefs.budget === v
                    ? 'bg-emerald-500 text-black'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}>${v.toLocaleString()}</button>
            ))}
            <input
              type="number"
              placeholder="Custom"
              value={prefs.budget}
              onChange={e => setPrefs(p => ({...p, budget: Number(e.target.value)}))}
              className="w-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Stop loss */}
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <label className="text-sm font-semibold mb-1 block">
            Max loss I can accept
          </label>
          <p className="text-xs text-gray-500 mb-3">% of position value</p>
          <div className="flex gap-2">
            {[25, 40, 50, 100].map(v => (
              <button key={v} onClick={() => setPrefs(p => ({...p, stop_loss_pct: v}))}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                  prefs.stop_loss_pct === v
                    ? 'bg-red-500/80 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}>{v}%</button>
            ))}
          </div>
        </div>

        {/* Profit target */}
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <label className="text-sm font-semibold mb-1 block">
            Profit target
          </label>
          <p className="text-xs text-gray-500 mb-3">Minimum return you're aiming for</p>
          <div className="flex gap-2">
            {[50, 100, 200, 300].map(v => (
              <button key={v} onClick={() => setPrefs(p => ({...p, profit_pct: v}))}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                  prefs.profit_pct === v
                    ? 'bg-green-500/80 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}>{v}%</button>
            ))}
          </div>
        </div>

        {/* Horizon */}
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <label className="text-sm font-semibold mb-3 block">Time horizon</label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              {v:'1w', l:'1 Week'},
              {v:'1m', l:'1 Month'},
              {v:'3m', l:'3 Month'},
              {v:'6m', l:'6 Month'},
              {v:'1yr', l:'1 Year'},
            ].map(({ v, l }) => (
              <button key={v} onClick={() => setPrefs(p => ({...p, horizon: v}))}
                className={`py-2 px-3 rounded-lg text-xs font-medium transition ${
                  prefs.horizon === v
                    ? 'bg-blue-500/80 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}>{l}</button>
            ))}
          </div>
        </div>

        {/* Risk */}
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <label className="text-sm font-semibold mb-3 block">Risk appetite today</label>
          <div className="flex gap-2">
            {[
              {v:'conservative', l:'Conservative', cls:'bg-blue-500/80'},
              {v:'moderate',     l:'Moderate',     cls:'bg-yellow-500/80'},
              {v:'aggressive',   l:'Aggressive',   cls:'bg-red-500/80'},
            ].map(({ v, l, cls }) => (
              <button key={v} onClick={() => setPrefs(p => ({...p, risk: v}))}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                  prefs.risk === v ? cls + ' text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary + scan */}
      <div className="mt-6 bg-gray-900 rounded-xl p-4 border border-emerald-500/20">
        <div className="flex justify-between text-sm mb-4">
          <div className="space-y-1 text-gray-400">
            <div>Budget: <span className="text-white font-medium">${prefs.budget.toLocaleString()}</span></div>
            <div>Stop: <span className="text-red-400 font-medium">{prefs.stop_loss_pct}%</span></div>
          </div>
          <div className="space-y-1 text-gray-400 text-right">
            <div>Target: <span className="text-green-400 font-medium">{prefs.profit_pct}%</span></div>
            <div>Horizon: <span className="text-blue-400 font-medium">{prefs.horizon}</span></div>
          </div>
        </div>
        {msg && <p className="text-yellow-400 text-sm mb-3">{msg}</p>}
        <button onClick={runScan}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition">
          Find Best Picks <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )

  if (stage === 'scanning') return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin mb-6" />
      <h2 className="text-lg font-semibold mb-2">Scanning Watchlist</h2>
      <p className="text-gray-400 text-sm max-w-xs">{scanMsg}</p>
      <div className="mt-4 text-xs text-gray-600">
        Budget ${prefs.budget.toLocaleString()} · {prefs.horizon} · {prefs.risk} risk
      </div>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">Today's Picks</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            ${prefs.budget.toLocaleString()} · {prefs.horizon} · {prefs.risk}
          </p>
        </div>
        <button onClick={reset}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white border border-gray-700 rounded-lg px-3 py-1.5 transition">
          <RotateCcw size={13} /> Rescan
        </button>
      </div>

      {msg && <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-xl p-3 text-yellow-400 text-sm mb-4">{msg}</div>}

      <div className="space-y-4">
        {recs.map((rec) => (
          <RecCard key={rec.id || rec.ticker} rec={rec} />
        ))}
      </div>
    </div>
  )
}

function RecCard({ rec }: { rec: any }) {
  const [expanded, setExpanded] = useState(false)
  const DirIcon = rec.direction === 'BULLISH'
    ? <TrendingUp size={14} className="text-green-400" />
    : rec.direction === 'BEARISH'
    ? <TrendingDown size={14} className="text-red-400" />
    : <Minus size={14} className="text-gray-400" />

  return (
    <div className={`rounded-xl border p-4 ${tierBg(rec.conviction_tier)}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {DirIcon}
          <span className="font-bold text-lg">{rec.ticker}</span>
          <span className="text-xs text-gray-500">{rec.strategy}</span>
        </div>
        <div className="text-right">
          <div className={`text-lg font-bold ${tierColor(rec.conviction_tier)}`}>
            {rec.conviction_score}/100
          </div>
          <div className="text-xs text-gray-400">{rec.conviction_tier}</div>
        </div>
      </div>

      <p className="text-sm text-gray-300 mb-3 leading-relaxed">{rec.thesis}</p>

      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        <div className="bg-gray-800/50 rounded-lg p-2">
          <div className="text-gray-400">Entry</div>
          <div className="font-mono">${rec.entry_zone_low}–{rec.entry_zone_high}</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-2">
          <div className="text-gray-400">Timeframe</div>
          <div>{rec.timeframe}</div>
        </div>
        <div className="bg-green-900/30 rounded-lg p-2">
          <div className="text-gray-400">Target</div>
          <div className="text-green-400">${rec.target_price} ({fmt.pct(rec.target_pct||0)})</div>
        </div>
        <div className="bg-red-900/30 rounded-lg p-2">
          <div className="text-gray-400">Stop</div>
          <div className="text-red-400">${rec.stop_price} ({fmt.pct(rec.stop_pct||0)})</div>
        </div>
      </div>

      {rec.webull_instructions && (
        <div className="bg-blue-900/20 rounded-lg p-2 text-xs text-blue-300 mb-2">
          📱 {rec.webull_instructions}
        </div>
      )}

      <button onClick={() => setExpanded(!expanded)}
        className="text-xs text-gray-500 hover:text-gray-300 transition">
        {expanded ? '▲ Hide details' : '▼ Show invalidation conditions'}
      </button>

      {expanded && rec.invalidation_conditions && (
        <div className="mt-2 text-xs text-orange-400 bg-orange-900/10 rounded-lg p-2">
          ⚠️ {rec.invalidation_conditions}
        </div>
      )}
    </div>
  )
}
