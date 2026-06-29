'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { isLoggedIn } from '@/lib/auth'
import { LayoutDashboard, List, Bell, BookOpen, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

const nav = [
  { href: '/dashboard',           label: 'Picks',      icon: LayoutDashboard },
  { href: '/dashboard/watchlist', label: 'Watchlist',  icon: List },
  { href: '/dashboard/alerts',    label: 'Alerts',     icon: Bell },
  { href: '/dashboard/learning',  label: 'Learning',   icon: BookOpen },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  useEffect(() => { if (!isLoggedIn()) router.push('/login') }, [router])

  return (
    <div className="min-h-screen bg-gray-50">
      {children}
      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-50">
        <div className="flex">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className={cn(
                'flex-1 flex flex-col items-center py-2 text-xs transition',
                pathname === href ? 'text-blue-600' : 'text-gray-400'
              )}>
              <Icon size={18} />
              <span className="mt-0.5">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}
