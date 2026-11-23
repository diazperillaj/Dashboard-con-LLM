import { useMemo } from 'react'
import { AlertCircle } from 'lucide-react'
import { useHeatmap } from '@/hooks/useHeatmap'
import type { DateFilters } from '@/types/api'

interface HeatmapChartProps {
  filters: DateFilters
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)

function hourLabel(h: number): string {
  if (h === 0) return '12a'
  if (h === 12) return '12p'
  return h < 12 ? `${h}a` : `${h - 12}p`
}

function getColor(value: number, min: number, max: number): string {
  if (max === min) return '#dbeafe'
  const t = (value - min) / (max - min)
  const r = Math.round(239 - t * (239 - 29))
  const g = Math.round(246 - t * (246 - 78))
  const b = Math.round(255 - t * (255 - 216))
  return `rgb(${r},${g},${b})`
}

function ChartSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm h-full">
      <div className="skeleton h-5 w-40 mb-1" />
      <div className="skeleton h-3.5 w-52 mb-5" />
      <div className="skeleton h-52 w-full rounded-lg" />
    </div>
  )
}

export function HeatmapChart({ filters }: HeatmapChartProps) {
  const { data, isLoading, isError } = useHeatmap(filters)

  const { dates, lookup, min, max } = useMemo(() => {
    if (!data?.length) return { dates: [], lookup: new Map(), min: 0, max: 0 }

    const dateSet = new Set<string>()
    const lookup = new Map<string, number>()
    let min = Infinity, max = -Infinity

    for (const pt of data) {
      dateSet.add(pt.date)
      lookup.set(`${pt.date}:${pt.hour}`, pt.value)
      if (pt.value < min) min = pt.value
      if (pt.value > max) max = pt.value
    }

    const dates = Array.from(dateSet).sort()
    return { dates, lookup, min, max }
  }, [data])

  if (isLoading) return <ChartSkeleton />

  if (isError) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-6 shadow-sm flex flex-col items-center justify-center gap-2 text-red-500 h-full">
        <AlertCircle className="w-6 h-6" />
        <span className="text-sm font-medium">No se pudo cargar el mapa de calor</span>
      </div>
    )
  }

  if (!dates.length) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm flex flex-col items-center justify-center gap-2 text-slate-400 h-full">
        <span className="text-3xl">🗓️</span>
        <span className="text-sm font-medium text-slate-600">Sin datos de mapas de calor</span>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm animate-fade-in-up h-full flex flex-col">
      <div className="mb-4 shrink-0">
        <h2 className="text-base font-semibold text-slate-900">Mapa de calor de disponibilidad</h2>
        <p className="text-xs text-slate-500 mt-0.5">Fecha × Hora — intensidad = disponibilidad</p>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <span className="text-xs text-slate-400">{Math.round(min)}</span>
        <div
          className="h-2.5 flex-1 rounded-full"
          style={{
            background: `linear-gradient(to right, ${getColor(min, min, max)}, ${getColor(max, min, max)})`,
          }}
        />
        <span className="text-xs text-slate-400">{Math.round(max)}</span>
      </div>

      {/* Grid */}
      <div className="overflow-auto flex-1 min-h-0">
        <div style={{ minWidth: 520 }}>
          {/* Hour header */}
          <div style={{ display: 'grid', gridTemplateColumns: '64px repeat(24, 1fr)', gap: '1px' }} className="mb-1">
            <div />
            {HOURS.map(h => (
              <div key={h} className="text-center text-[9px] text-slate-400 font-medium">
                {hourLabel(h)}
              </div>
            ))}
          </div>

          {/* Rows */}
          <div className="flex flex-col gap-px">
            {dates.map(date => {
              const [y, mo, d] = date.split('-').map(Number)
              const shortDate = new Date(y, mo - 1, d).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })
              return (
                <div
                  key={date}
                  style={{ display: 'grid', gridTemplateColumns: '64px repeat(24, 1fr)', gap: '1px' }}
                >
                  <div className="text-[9px] text-slate-400 flex items-center pr-2 justify-end font-medium">
                    {shortDate}
                  </div>
                  {HOURS.map(h => {
                    const val = lookup.get(`${date}:${h}`)
                    return (
                      <div
                        key={h}
                        title={val !== undefined ? `${date} ${hourLabel(h)}: ${val.toFixed(1)}` : 'No data'}
                        className="h-5 rounded-sm cursor-default transition-opacity hover:opacity-80"
                        style={{
                          backgroundColor: val !== undefined ? getColor(val, min, max) : '#f8fafc',
                          border: '1px solid rgba(0,0,0,0.04)',
                        }}
                      />
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
