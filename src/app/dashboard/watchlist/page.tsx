'use client'
import { useState, useEffect } from 'react'
import { watchlist as wlApi } from '@/lib/api'
import { Plus, X } from 'lucide-react'

export default function WatchlistPage() {
  const [tickers, setTickers] = useState<string[]>([])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(true)

  const load = () => wlApi.get().then((d: any) => setTickers(d.tickers || [])).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const add = async () => {
    const t = input.trim().toUpperCase()
    if (!t) return
    await wlApi.add(t)
    setTickers(prev => [...new Set([...prev, t])])
    setInput('')
  }

  const remove = async (ticker: string) => {
    await wlApi.remove(ticker)
    setTickers(prev => prev.filter(t => t !== ticker))
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">Watchlist</h1>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Add ticker (e.g. NVDA)"
          value={input}
          onChange={e => setInput(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && add()}
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-emerald-500"
        />
        <button onClick={add}
          className="bg-emerald-500 hover:bg-emerald-400 text-black p-2 rounded-lg transition">
          <Plus size={18} />
        </button>
      </div>

      {loading ? (
        <div className="text-gray-400 animate-pulse">Loading...</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {tickers.map(t => (
            <div key={t} className="flex items-center justify-between bg-gray-900 rounded-lg px-3 py-2 border border-gray-800">
              <span className="font-mono text-sm font-semibold">{t}</span>
              <button onClick={() => remove(t)} className="text-gray-600 hover:text-red-400 transition">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-gray-500 mt-4">{tickers.length} tickers</p>
    </div>
  )
}
