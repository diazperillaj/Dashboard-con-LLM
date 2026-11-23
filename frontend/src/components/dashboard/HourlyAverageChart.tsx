import { AlertCircle } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import { useHourlyAverage } from '@/hooks/useHourlyAverage'
import type { DateFilters } from '@/types/api'

interface HourlyAverageChartProps {
  filters: DateFilters
}

interface TooltipPayload {
  value: number
  payload: { hour: number; average: number }
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null
  const { hour, average } = payload[0].payload
  const label = hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`

  return (
    <div className="bg-slate-900 text-white text-xs rounded-xl shadow-xl px-3.5 py-2.5 border border-slate-700">
      <div className="text-slate-400 mb-1">{label}</div>
      <div className="font-semibold">{average.toLocaleString(undefined, { maximumFractionDigits: 1 })} prom de tiendas</div>
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm h-full">
      <div className="skeleton h-5 w-48 mb-1" />
      <div className="skeleton h-3.5 w-32 mb-6" />
      <div className="skeleton h-52 w-full rounded-lg" />
    </div>
  )
}

export function HourlyAverageChart({ filters }: HourlyAverageChartProps) {
  const { data, isLoading, isError } = useHourlyAverage(filters)

  if (isLoading) return <ChartSkeleton />

  if (isError) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-6 shadow-sm flex flex-col items-center justify-center gap-2 text-red-500 h-full">
        <AlertCircle className="w-6 h-6" />
        <span className="text-sm font-medium">No se pudieron cargar los promedios por hora.</span>
      </div>
    )
  }

  if (!data?.length) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm flex flex-col items-center justify-center gap-2 text-slate-400 h-full">
        <span className="text-3xl">🕐</span>
        <span className="text-sm font-medium text-slate-600">Sin datos horarios</span>
      </div>
    )
  }

  const maxVal = Math.max(...data.map(d => d.average))

  const formatted = data.map(d => ({
    ...d,
    label: d.hour === 0 ? '12a' : d.hour === 12 ? '12p' : d.hour < 12 ? `${d.hour}a` : `${d.hour - 12}p`,
    intensity: d.average / maxVal,
  }))

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm animate-fade-in-up h-full">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-slate-900">Disponibilidad promedio por hora</h2>
        <p className="text-xs text-slate-500 mt-0.5">Número medio de tiendas por hora del día</p>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={formatted} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={12}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
            interval={1}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => v.toLocaleString()}
            width={56}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
          <Bar dataKey="average" radius={[4, 4, 0, 0]}>
            {formatted.map((entry, i) => (
              <Cell
                key={i}
                fill={`rgba(59, 130, 246, ${0.3 + entry.intensity * 0.7})`}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
