import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

function localDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatDate(dateStr: string): string {
  return localDate(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateShort(dateStr: string): string {
  return localDate(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getDateRange(preset: 'today' | 'last7' | 'last30' | 'all'): {
  start_date: string | undefined
  end_date: string | undefined
} {
  const now = new Date()
  const today = now.toISOString().split('T')[0]

  if (preset === 'today') {
    return { start_date: today, end_date: today }
  }
  if (preset === 'last7') {
    const d = new Date(now)
    d.setDate(d.getDate() - 6)
    return { start_date: d.toISOString().split('T')[0], end_date: today }
  }
  if (preset === 'last30') {
    const d = new Date(now)
    d.setDate(d.getDate() - 29)
    return { start_date: d.toISOString().split('T')[0], end_date: today }
  }
  return { start_date: undefined, end_date: undefined }
}
