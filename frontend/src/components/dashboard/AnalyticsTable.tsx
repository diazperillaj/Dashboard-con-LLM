import { useState, useMemo } from 'react'
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { useTable } from '@/hooks/useTable'
import { cn, formatNumber, formatDate } from '@/lib/utils'
import type { DateFilters, DailySummary } from '@/types/api'

interface AnalyticsTableProps {
  filters: DateFilters
}

type SortKey = keyof DailySummary
type SortDir = 'asc' | 'desc'

const PAGE_SIZE = 12

const COLUMNS: { key: SortKey; label: string; align?: 'right' }[] = [
  { key: 'date', label: 'Date' },
  { key: 'average', label: 'Average', align: 'right' },
  { key: 'maximum', label: 'Maximum', align: 'right' },
  { key: 'minimum', label: 'Minimum', align: 'right' },
  { key: 'volatility', label: 'Volatility', align: 'right' },
  { key: 'records', label: 'Records', align: 'right' },
]

function SortIcon({ col, sortKey, dir }: { col: SortKey; sortKey: SortKey; dir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="w-3.5 h-3.5 text-slate-300" />
  return dir === 'asc'
    ? <ChevronUp className="w-3.5 h-3.5 text-blue-500" />
    : <ChevronDown className="w-3.5 h-3.5 text-blue-500" />
}

function TableSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100">
        <div className="skeleton h-5 w-48 mb-1" />
        <div className="skeleton h-3.5 w-32" />
      </div>
      <div className="p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-4 py-3 border-b border-slate-50">
            {Array.from({ length: 6 }).map((_, j) => (
              <div key={j} className="skeleton h-4 flex-1 rounded" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function formatCell(key: SortKey, value: DailySummary[SortKey]): string {
  if (key === 'date') return formatDate(value as string)
  if (key === 'records') return formatNumber(value as number)
  if (key === 'volatility') return formatNumber(value as number, 2)
  return formatNumber(value as number, key === 'average' ? 1 : 0)
}

export function AnalyticsTable({ filters }: AnalyticsTableProps) {
  const { data, isLoading, isError, refetch } = useTable(filters)
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
    setPage(1)
  }

  const filtered = useMemo(() => {
    if (!data) return []
    const q = search.toLowerCase()
    return data.filter(row => !q || row.date.includes(q))
  }, [data, search])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageData = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  if (isLoading) return <TableSkeleton />

  if (isError) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-6 shadow-sm flex items-center gap-3 text-red-600">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <span className="text-sm font-medium">No se pudo cargar la tabla.</span>
        <button
          onClick={() => refetch()}
          className="ml-auto flex items-center gap-1.5 text-sm hover:text-red-800 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Reintentar
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in-up">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Resumen de análisis diario</h2>
          <p className="text-xs text-slate-500 mt-0.5">{sorted.length} días · ordenado por {sortKey}</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by date…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="h-8 pl-8 pr-3 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all w-52"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={cn(
                    'px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer select-none whitespace-nowrap transition-colors hover:text-slate-700 hover:bg-slate-100',
                    col.align === 'right' ? 'text-right' : 'text-left'
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    <SortIcon col={col.key} sortKey={sortKey} dir={sortDir} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-3xl">🔍</span>
                    <span className="text-sm font-medium text-slate-500">No se encontraron resultados</span>
                  </div>
                </td>
              </tr>
            ) : (
              pageData.map((row, i) => (
                <tr
                  key={row.date}
                  className={cn(
                    'border-b border-slate-50 hover:bg-slate-50 transition-colors',
                    i % 2 === 0 ? '' : 'bg-slate-50/50'
                  )}
                >
                  {COLUMNS.map(col => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-5 py-3.5 text-slate-700 tabular-nums',
                        col.align === 'right' ? 'text-right font-medium' : 'font-medium text-slate-900'
                      )}
                    >
                      {formatCell(col.key, row[col.key])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
        <span>
          {sorted.length > 0
            ? `${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, sorted.length)} of ${sorted.length}`
            : '0 results'}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum: number
            if (totalPages <= 5) {
              pageNum = i + 1
            } else if (safePage <= 3) {
              pageNum = i + 1
            } else if (safePage >= totalPages - 2) {
              pageNum = totalPages - 4 + i
            } else {
              pageNum = safePage - 2 + i
            }
            return (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={cn(
                  'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                  safePage === pageNum
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-slate-100 text-slate-600'
                )}
              >
                {pageNum}
              </button>
            )
          })}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
