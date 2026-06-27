'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/api'
import { setToken } from '@/lib/auth'
import { TrendingUp, Lock } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = await auth.login(code.trim(), name.trim() || undefined)
      setToken(data.token)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid invite code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <TrendingUp className="text-emerald-400" size={28} />
          </div>
          <h1 className="text-2xl font-bold">StockBros</h1>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <div className="flex items-center gap-2 mb-6">
            <Lock size={16} className="text-gray-400" />
            <p className="text-gray-400 text-sm">Enter your invite code to access</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="text"
              placeholder="Invite code"
              value={code}
              onChange={e => setCode(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition"
              required
            />
            <input
              type="text"
              placeholder="Display name (optional)"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 transition"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-semibold py-3 rounded-lg transition"
            >
              {loading ? 'Connecting...' : 'Enter Platform'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
