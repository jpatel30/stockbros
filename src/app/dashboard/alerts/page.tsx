'use client'
import { useState, useEffect } from 'react'
import { alerts as alertsApi } from '@/lib/api'
import { Bell, X, CheckCheck } from 'lucide-react'

export default function AlertsPage() {
  const [alertList, setAlertList] = useState<any[]>([])
  const [loading, setLoading]     = useState(true)

  const load = () => alertsApi.get().then(setAlertList).finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const dismiss = async (id: string) => {
    await alertsApi.dismiss(id)
    setAlertList(a => a.filter(x => x.id !== id))
  }

  const dismissAll = async () => {
    await alertsApi.dismissAll()
    setAlertList([])
  }

  const urgencyColor = (u: string) =>
    u === 'HIGH' ? 'border-red-500/40 bg-red-900/20'
    : u === 'MEDIUM' ? 'border-yellow-500/40 bg-yellow-900/20'
    : 'border-gray-700 bg-gray-900/50'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Alerts</h1>
        {alertList.length > 0 && (
          <button onClick={dismissAll}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-white">
            <CheckCheck size={14} /> Dismiss all
          </button>
        )}
      </div>

      {loading && <div className="text-gray-400 animate-pulse">Loading alerts...</div>}

      {!loading && alertList.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-600">
          <Bell size={40} className="mb-3" />
          <p>No active alerts</p>
        </div>
      )}

      <div className="space-y-3">
        {alertList.map((a) => (
          <div key={a.id} className={`rounded-xl border p-4 ${urgencyColor(a.urgency)}`}>
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                  a.urgency === 'HIGH' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                }`}>{a.urgency}</span>
                <span className="font-bold">{a.symbol}</span>
              </div>
              <button onClick={() => dismiss(a.id)} className="text-gray-500 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-gray-300 mt-2">{a.message}</p>
            {a.pnl_pct && (
              <p className={`text-xs mt-1 ${a.pnl_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                P&L: {a.pnl_pct >= 0 ? '+' : ''}{a.pnl_pct.toFixed(1)}%
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
