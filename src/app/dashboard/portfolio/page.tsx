'use client'
import { useState, useEffect } from 'react'
import { portfolio } from '@/lib/api'
import { fmt, pnlColor } from '@/lib/utils'
import { RefreshCw, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'

function StatCard({ label, value, cls = '' }: any) {
  return (
    <div className="bg-gray-900 rounded-xl p-3 border border-gray-800">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-base font-bold ${cls}`}>{value}</div>
    </div>
  )
}

function BetRow({ b }: { b: any }) {
  const pct = b.pnl_pct ?? 0
  const abs = b.pnl ?? 0
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-800/50 last:border-0">
      <div>
        <span className="font-bold text-sm">{b.symbol}</span>
        <span className="text-xs text-gray-500 ml-1.5">
          {b.qty} {b.type === 'OPTION' ? 'ctr' : 'sh'}
        </span>
        {b.status === 'NEAR_STOP' && (
          <span className="ml-1.5 text-xs text-red-400 bg-red-900/20 px-1 rounded">STOP</span>
        )}
      </div>
      <div className="text-right">
        <div className={`text-sm font-bold ${pnlColor(pct)}`}>
          {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
        </div>
        <div className={`text-xs ${pnlColor(abs)}`}>{fmt.signed(abs)}</div>
      </div>
    </div>
  )
}

export default function PortfolioPage() {
  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [source, setSource]   = useState('')

  const load = async (live = false) => {
    live ? setRefreshing(true) : setLoading(true)
    try {
      const d = await portfolio.get(live)
      setData(d); setSource(d.source || '')
    } finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { load(false) }, [])

  if (loading) return (
    <div className="space-y-3 animate-pulse p-4">
      {[1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-800 rounded-xl"/>)}
    </div>
  )

  const pnl  = data?.pnl  || {}
  const bets = data?.bets || []
  const bal  = data?.balances || {}

  const winners = bets.filter((b:any) => (b.pnl_pct ?? 0) > 0)
    .sort((a:any,b:any) => b.pnl_pct - a.pnl_pct)
  const losers  = bets.filter((b:any) => (b.pnl_pct ?? 0) <= 0)
    .sort((a:any,b:any) => a.pnl_pct - b.pnl_pct)

  const acct     = bal.account_currency_assets?.[0] || {}
  const net_liq  = pnl.net_liq || parseFloat(acct.net_liquidation_value || '0') || 0
  const cash     = pnl.cash    || parseFloat(bal.total_cash_balance || '0') || 0
  const total_pnl = pnl.total_pnl || 0

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold">Portfolio</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {source === 'cache' ? `cached ${data?.age_minutes || 0}m ago` : 'live'}
          </span>
          <button onClick={() => load(true)} disabled={refreshing}
            className="p-1.5 text-gray-400 hover:text-white border border-gray-700 rounded-lg transition">
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
        <StatCard label="Net Liq"  value={fmt.dollars(net_liq)} />
        <StatCard label="P&L"      value={fmt.signed(total_pnl)}
          cls={total_pnl >= 0 ? 'text-green-400' : 'text-red-400'} />
        <StatCard label="Cash"     value={fmt.dollars(cash)} cls="text-blue-400" />
        <StatCard label="Win Rate" value={`${pnl.win_rate || 0}%`} />
      </div>

      {/* Sell signals */}
      {bets.filter((b:any) => b.status === 'NEAR_STOP').length > 0 && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-700/30 rounded-xl">
          <div className="flex items-center gap-2 text-red-400 text-sm font-semibold mb-2">
            <AlertTriangle size={14}/> Approaching Stop
          </div>
          {bets.filter((b:any) => b.status === 'NEAR_STOP').map((b:any) => (
            <div key={b.symbol} className="text-xs text-red-300">
              {b.symbol}: {b.pnl_pct?.toFixed(1)}%
            </div>
          ))}
        </div>
      )}

      {/* Winners */}
      {winners.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp size={12} className="text-green-400"/>
            <span className="text-xs font-semibold text-green-400 uppercase tracking-wide">
              Winners ({winners.length})
            </span>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 px-3">
            {winners.map((b:any, i:number) => <BetRow key={`w${i}`} b={b}/>)}
          </div>
        </div>
      )}

      {/* Losers */}
      {losers.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingDown size={12} className="text-red-400"/>
            <span className="text-xs font-semibold text-red-400 uppercase tracking-wide">
              Losers ({losers.length})
            </span>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 px-3">
            {losers.map((b:any, i:number) => <BetRow key={`l${i}`} b={b}/>)}
          </div>
        </div>
      )}
    </div>
  )
}
