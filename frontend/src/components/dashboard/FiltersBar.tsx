import { Calendar, RotateCcw } from 'lucide-react'
import { cn, getDateRange } from '@/lib/utils'
import type { DateFilters } from '@/types/api'

type Preset = 'today' | 'last7' | 'last30' | 'all'

interface FiltersBarProps {
  filters: DateFilters
  onChange: (filters: DateFilters) => void
}

const PRESETS: { key: Preset; label: string }[] = [
  { key: 'today', label: 'Hoy' },
  { key: 'last7', label: 'Últimos 7 días' },
  { key: 'last30', label: 'Últimos 30 días' },
  { key: 'all', label: 'Todo el tiempo' },
]

function activePreset(filters: DateFilters): Preset | null {
  for (const { key } of PRESETS) {
    const range = getDateRange(key)
    if (range.start_date === filters.start_date && range.end_date === filters.end_date) {
      return key
    }
  }
  return null
}

export function FiltersBar({ filters, onChange }: FiltersBarProps) {
  const current = activePreset(filters)

  const handlePreset = (key: Preset) => {
    onChange(getDateRange(key))
  }

  const handleReset = () => {
    onChange({ start_date: undefined, end_date: undefined })
  }

  return (
    <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 md:px-6 py-3">
      <div className="max-w-screen-2xl mx-auto flex flex-wrap items-center gap-3">
        {/* Calendar icon + label */}
        <div className="flex items-center gap-1.5 text-slate-500 text-sm font-medium shrink-0">
          <Calendar className="w-4 h-4" />
          <span className="hidden sm:inline">Rango de Fecha</span>
        </div>

        {/* Date inputs */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filters.start_date ?? ''}
            onChange={e => onChange({ ...filters, start_date: e.target.value || undefined })}
            className="h-8 px-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all cursor-pointer"
          />
          <span className="text-slate-400 text-xs font-medium">to</span>
          <input
            type="date"
            value={filters.end_date ?? ''}
            min={filters.start_date}
            onChange={e => onChange({ ...filters, end_date: e.target.value || undefined })}
            className="h-8 px-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all cursor-pointer"
          />
        </div>

        <div className="h-5 w-px bg-slate-200 hidden sm:block" />

        {/* Quick presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {PRESETS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handlePreset(key)}
              className={cn(
                'h-8 px-3 text-sm font-medium rounded-lg border transition-all duration-150',
                current === key
                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Reset */}
        {(filters.start_date || filters.end_date) && (
          <button
            onClick={handleReset}
            className="h-8 px-2.5 ml-auto flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
            title="Clear filters"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reiniciar</span>
          </button>
        )}
      </div>
    </div>
  )
}
