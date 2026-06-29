'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { isLoggedIn } from '@/lib/auth'
import { LayoutDashboard, List, Bell, BookOpen, LogOut } from 'lucide-react'

const nav = [
  { href: '/dashboard',            label: 'Picks',      icon: LayoutDashboard },
  { href: '/dashboard/watchlist',  label: 'Watchlist',  icon: List },
  { href: '/dashboard/alerts',     label: 'Alerts',     icon: Bell },
  { href: '/dashboard/learning',   label: 'Learning',   icon: BookOpen },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoggedIn()) router.push('/login')
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50">
      {children}
      {/* Bottom nav - mobile only, dashboard page has its own layout */}
    </div>
  )
}
