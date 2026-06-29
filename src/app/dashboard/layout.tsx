'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { isLoggedIn, clearToken } from '@/lib/auth'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/dashboard',           label: 'Picks'      },
  { href: '/dashboard/watchlist', label: 'Watchlist'  },
  { href: '/dashboard/alerts',    label: 'Alerts'     },
  { href: '/dashboard/learning',  label: 'Learning'   },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => { if (!isLoggedIn()) router.push('/login') }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Tab bar - always visible */}
      <div className="bg-white border-b border-gray-200 px-4 flex items-center gap-1">
        {tabs.map(({ href, label }) => (
          <Link key={href} href={href}
            className={cn(
              'px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap',
              pathname === href
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            )}>
            {label}
          </Link>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => { clearToken(); router.push('/login') }}
          className="text-xs text-gray-400 hover:text-gray-700 py-3 px-2">
          Sign out
        </button>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}
