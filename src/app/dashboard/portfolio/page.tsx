'use client'
import { useState, useEffect } from 'react'
import { portfolio } from '@/lib/api'
import { fmt, pnlColor } from '@/lib/utils'
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'

export default function PortfolioPage() {
  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [source, setSource]   = useState('')

  const load = async (live = false) => {
    live ? setRefreshing(true) : setLoading(true)
    try {
      const d = await portfolio.get(live)
      setData(d)
      setSource(d.source || '')
    } catch (e) { console.error(e) }
    finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { load(false) }, [])

  if (loading) return (
    <div className="space-y-4">
      <div className="h-8 bg-gray-800 rounded w-1/3 animate-pulse mb-6" />
      {[1,2,3,4].map(i => (
        <div key={i} className="bg-gray-900 rounded-xl p-4 border border-gray-800 animate-pulse h-20" />
      ))}
    </div>
  )

  const pnl  = data?.pnl  || {}
  const bets = data?.bets || []
  const bal  = data?.balances || {}

  const winners = bets.filter((b: any) => b.pnl_pct > 0).sort((a:any,b:any) => b.pnl_pct - a.pnl_pct)
  const losers  = bets.filter((b: any) => b.pnl_pct <= 0).sort((a:any,b:any) => a.pnl_pct - b.pnl_pct)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Portfolio</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {source === 'cache' ? `Cached ${data?.age_minutes || 0}m ago` : 'Live from Webull'}
          </p>
        </div>
        <button onClick={() => load(true)} disabled={refreshing}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white border border-gray-700 rounded-lg px-3 py-1.5 transition">
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Fetching...' : 'Refresh'}
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Net Liq',    value: fmt.dollars(pnl.net_liq || pnl.total_value || 0), cls: '' },
          { label: 'Total P&L',  value: fmt.signed(pnl.total_pnl || 0), cls: pnlColor(pnl.total_pnl || 0) },
          { label: 'Cash',       value: fmt.dollars(pnl.cash || bal.cash_balance || 0), cls: 'text-blue-400' },
          { label: 'Win rate',   value: `${pnl.win_rate || 0}%`, cls: '' },
        ].map(({ label, value, cls }) => (
          <div key={label} className="bg-gray-900 rounded-xl p-3 border border-gray-800">
            <div className="text-xs text-gray-500 mb-1">{label}</div>
            <div className={`text-base font-bold ${cls}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Winners */}
      {winners.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-green-400" />
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Winners</h2>
          </div>
          <div className="space-y-2 mb-5">
            {winners.map((b: any, i: number) => <BetRow key={`${b.symbol}-${i}`} b={b} />)}
          </div>
        </>
      )}

      {/* Losers */}
      {losers.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={14} className="text-red-400" />
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Losers</h2>
          </div>
          <div className="space-y-2">
            {losers.map((b: any, i: number) => <BetRow key={`${b.symbol}-${i}`} b={b} />)}
          </div>
        </>
      )}

      {bets.length === 0 && (
        <div className="text-center py-16 text-gray-600">No open positions</div>
      )}
    </div>
  )
}

function BetRow({ b }: { b: any }) {
  return (
    <div className="bg-gray-900 rounded-xl p-3 border border-gray-800 flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm">{b.symbol}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded ${
            b.status === 'ON_TRACK' ? 'bg-green-900/40 text-green-400'
            : b.status === 'NEAR_STOP' ? 'bg-red-900/40 text-red-400'
            : 'bg-gray-800 text-gray-400'
          }`}>{b.status}</span>
        </div>
        <div className="text-xs text-gray-500 mt-0.5">
          {b.qty} shares · cost {fmt.dollars(b.investment)}
        </div>
      </div>
      <div className="text-right">
        <div className={`font-bold ${pnlColor(b.pnl_pct)}`}>{fmt.pct(b.pnl_pct)}</div>
        <div className={`text-xs ${pnlColor(b.pnl_abs)}`}>{fmt.signed(b.pnl_abs)}</div>
      </div>
    </div>
  )
}
