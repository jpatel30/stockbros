import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const fmt = {
  pct:     (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`,
  dollars: (n: number) => `$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0 })}`,
  signed:  (n: number) => `${n >= 0 ? '+' : '-'}$${Math.abs(n).toLocaleString()}`,
}

export const tierColor = (tier: string) => ({
  VERY_HIGH: 'text-emerald-400',
  HIGH:      'text-green-400',
  MODERATE:  'text-yellow-400',
  WATCH:     'text-orange-400',
  SKIP:      'text-red-400',
}[tier] ?? 'text-gray-400')

export const tierBg = (tier: string) => ({
  VERY_HIGH: 'bg-emerald-900/30 border-emerald-500/30',
  HIGH:      'bg-green-900/30 border-green-500/30',
  MODERATE:  'bg-yellow-900/30 border-yellow-500/30',
  WATCH:     'bg-orange-900/30 border-orange-500/30',
  SKIP:      'bg-red-900/30 border-red-500/30',
}[tier] ?? 'bg-gray-900/30 border-gray-500/30')

export const pnlColor = (pct: number) =>
  pct >= 0 ? 'text-green-400' : 'text-red-400'
