"use client"
import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { isLoggedIn, clearToken } from "@/lib/auth"
import { portfolio } from "@/lib/api"
import { cn } from "@/lib/utils"

const tabs = [
  { href: "/dashboard",           label: "Picks"     },
  { href: "/dashboard/watchlist", label: "Watchlist" },
  { href: "/dashboard/history",   label: "History"   },
]

const dollars = (n: number) =>
  "$" + Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 })
const signed = (n: number) =>
  (n >= 0 ? "+$" : "-$") + Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 })

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [port, setPort] = useState<any>(null)

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return }
    portfolio.get(false).then(setPort).catch(() => {})
    const interval = setInterval(() =>
      portfolio.get(true).then(setPort).catch(() => {}), 300000)
    return () => clearInterval(interval)
  }, [router])

  const pnl  = port?.pnl  || {}
  const bal  = port?.balances || {}
  const acct = bal.account_currency_assets?.[0] || {}
  const netLiq  = pnl.net_liq || parseFloat(acct.net_liquidation_value || "0") || 0
  const cash    = pnl.cash    || parseFloat(bal.total_cash_balance      || "0") || 0
  const dayPnl  = pnl.total_pnl || 0
  const winRate = pnl.win_rate || 0

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-100 px-5 py-2 flex items-center justify-between">
        <span className="font-bold text-gray-900 text-base tracking-tight">StockBros</span>
        <button onClick={() => { clearToken(); router.push("/login") }}
          className="text-xs text-gray-400 hover:text-gray-700 transition">Sign out</button>
      </div>
      <div className="bg-white border-b border-gray-100 px-5 py-2 flex items-center gap-6 text-sm">
        <div><span className="text-gray-400 text-xs">Net Liq </span><span className="font-bold text-gray-900">{dollars(netLiq)}</span></div>
        <div><span className="text-gray-400 text-xs">P&amp;L </span><span className={dayPnl >= 0 ? "font-bold text-emerald-600" : "font-bold text-red-500"}>{signed(dayPnl)}</span></div>
        <div><span className="text-gray-400 text-xs">Cash </span><span className="font-bold text-blue-600">{dollars(cash)}</span></div>
        <div><span className="text-gray-400 text-xs">Win </span><span className="font-bold text-gray-900">{winRate}%</span></div>
        <button onClick={() => { portfolio.get(true).then(setPort).catch(() => {}); window.dispatchEvent(new CustomEvent('portfolio:refresh')) }}
          className="ml-auto text-gray-400 hover:text-gray-700 transition" title="Refresh portfolio">
          ↻
        </button>
      </div>
      <div className="bg-white border-b border-gray-200 px-4 flex items-center gap-0">
        {tabs.map(({ href, label }) => (
          <Link key={href} href={href}
            className={cn(
              "px-5 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap",
              pathname === href ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-800"
            )}>{label}</Link>
        ))}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}
