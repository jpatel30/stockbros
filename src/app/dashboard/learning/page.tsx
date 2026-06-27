'use client'
import { useState, useEffect } from 'react'
import { learning } from '@/lib/api'

export default function LearningPage() {
  const [report, setReport] = useState<any>(null)
  const [bt, setBt]         = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([learning.report(), learning.backtest()])
      .then(([r, b]) => { setReport(r); setBt(b) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-gray-400 animate-pulse">Loading learning data...</div>

  const sc = report?.sell_compliance || {}

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">Learning Report</h1>

      {report?.summary && (
        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 mb-6">
          <p className="text-sm text-gray-300">{report.summary}</p>
        </div>
      )}

      {/* Sell compliance */}
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 mb-4">
        <h2 className="font-semibold mb-3">Sell Signal Compliance</h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-2xl font-bold">{sc.total_signals || 0}</div>
            <div className="text-xs text-gray-400">Total signals</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-400">{sc.acted_on || 0}</div>
            <div className="text-xs text-gray-400">Acted on</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-400">{sc.compliance_rate || 0}%</div>
            <div className="text-xs text-gray-400">Compliance</div>
          </div>
        </div>
        {sc.insight && <p className="text-xs text-gray-400 mt-3">{sc.insight}</p>}
      </div>

      {/* Action items */}
      {report?.action_items?.length > 0 && (
        <div>
          <h2 className="font-semibold mb-3">Action Items</h2>
          <div className="space-y-2">
            {report.action_items.map((a: any, i: number) => (
              <div key={i} className={`rounded-lg p-3 text-sm border ${
                a.priority === 'HIGH' ? 'border-red-500/30 bg-red-900/20 text-red-300'
                : 'border-yellow-500/30 bg-yellow-900/20 text-yellow-300'
              }`}>
                <span className="font-bold">{a.action}</span> — {a.reason}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Backtest */}
      {bt?.sell_signal_cost?.available && (
        <div className="mt-6">
          <h2 className="font-semibold mb-3">Backtest: Signal Compliance Cost</h2>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-sm text-gray-300 mb-2">
              {bt.sell_signal_cost.summary?.insight}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
