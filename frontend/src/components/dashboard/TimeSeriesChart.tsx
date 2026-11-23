import { AlertCircle, RefreshCw } from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Brush,
  ReferenceLine,
} from 'recharts'
import { useTimeseries } from '@/hooks/useTimeseries'
import type { DateFilters } from '@/types/api'

interface TimeSeriesChartProps {
  filters: DateFilters
}

interface TooltipPayload {
  value: number
  payload: { timestamp: string; value: number }
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null
  const { timestamp, value } = payload[0].payload
  const date = new Date(timestamp)

  return (
    <div className="bg-slate-900 text-white text-xs rounded-xl shadow-xl px-3.5 py-2.5 border border-slate-700">
      <div className="text-slate-400 mb-1">
        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        {' · '}
        {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div className="font-semibold text-sm">
        <span className="text-blue-400">●</span>
        {' '}
        {value.toLocaleString()} stores
      </div>
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="skeleton h-5 w-48 mb-1" />
      <div className="skeleton h-3.5 w-64 mb-6" />
      <div className="skeleton h-72 w-full rounded-lg" />
    </div>
  )
}

function tickFormatter(ts: string) {
  const d = new Date(ts)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function TimeSeriesChart({ filters }: TimeSeriesChartProps) {
  const { data, isLoading, isError, refetch } = useTimeseries(filters)

  if (isLoading) return <ChartSkeleton />

  if (isError) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-8 shadow-sm flex flex-col items-center gap-3 text-red-500">
        <AlertCircle className="w-8 h-8" />
        <span className="font-medium">No se pudo cargar la serie temporal</span>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 text-sm hover:text-red-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Reintentar
        </button>
      </div>
    )
  }

  if (!data?.length) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 shadow-sm flex flex-col items-center gap-2 text-slate-400">
        <span className="text-4xl">📈</span>
        <span className="font-medium text-slate-600">No hay datos para el periodo seleccionado</span>
        <span className="text-sm">Intenta expandir el rango de fecha</span>
      </div>
    )
  }

  const avg = data.reduce((s, p) => s + p.value, 0) / data.length

  const sampled = data.length > 2000
    ? data.filter((_, i) => i % Math.ceil(data.length / 2000) === 0)
    : data

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm animate-fade-in-up">
      <div className="mb-6">
        <h2 className="text-base font-semibold text-slate-900">Disponibilidad a lo largo del tiempo</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          {data.length.toLocaleString()} lecturas · Arrastra el pincel de abajo para hacer zoom
        </p>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={sampled} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="timestamp"
            tickFormatter={tickFormatter}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
            minTickGap={60}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => v.toLocaleString()}
            width={64}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={avg}
            stroke="#94a3b8"
            strokeDasharray="4 4"
            label={{ value: 'Avg', position: 'insideTopRight', fontSize: 10, fill: '#94a3b8' }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
          />
          <Brush
            dataKey="timestamp"
            height={24}
            stroke="#e2e8f0"
            fill="#f8fafc"
            tickFormatter={tickFormatter}
            travellerWidth={6}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
