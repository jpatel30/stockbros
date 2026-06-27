'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { isLoggedIn, clearToken } from '@/lib/auth'
import { TrendingUp, LayoutDashboard, Bell, Activity, List, LogOut, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

const nav = [
  { href: '/dashboard/portfolio', label: 'Portfolio', icon: LayoutDashboard },
  { href: '/dashboard',           label: 'Picks',     icon: Search },
  { href: '/dashboard/alerts',    label: 'Alerts',    icon: Bell },
  { href: '/dashboard/learning',  label: 'Learning',  icon: Activity },
  { href: '/dashboard/watchlist', label: 'Watchlist', icon: List },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()

  useEffect(() => { if (!isLoggedIn()) router.push('/login') }, [router])
  const logout = () => { clearToken(); router.push('/login') }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 pb-20 md:pb-0 md:pl-56">
        <div className="max-w-5xl mx-auto p-4">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur border-t border-gray-800 md:hidden z-50">
        <div className="flex">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className={cn(
                'flex-1 flex flex-col items-center py-2 text-xs transition',
                pathname === href ? 'text-emerald-400' : 'text-gray-500'
              )}>
              <Icon size={20} />
              <span className="mt-0.5">{label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-56 bg-gray-900 border-r border-gray-800 flex-col p-4 z-50">
        <div className="flex items-center gap-2 mb-8 px-2">
          <TrendingUp className="text-emerald-400" size={20} />
          <span className="font-bold text-lg">StockBros</span>
        </div>
        <nav className="flex-1 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition',
                pathname === href
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
              )}>
              <Icon size={16} />{label}
            </Link>
          ))}
        </nav>
        <button onClick={logout}
          className="flex items-center gap-3 px-3 py-2 text-sm text-gray-500 hover:text-red-400 transition">
          <LogOut size={16} /> Logout
        </button>
      </aside>
    </div>
  )
}
