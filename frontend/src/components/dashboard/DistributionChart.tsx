import { useMemo } from 'react'
import { AlertCircle } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts'
import { useDistribution } from '@/hooks/useDistribution'
import type { DateFilters } from '@/types/api'

interface DistributionChartProps {
  filters: DateFilters
}

interface TooltipPayload {
  value: number
  payload: { label: string; count: number; pct: number }
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null
  const { label, count, pct } = payload[0].payload
  return (
    <div className="bg-slate-900 text-white text-xs rounded-xl shadow-xl px-3.5 py-2.5 border border-slate-700">
      <div className="text-slate-400 mb-1">Range: {label}</div>
      <div className="font-semibold">{count.toLocaleString()} lecturas</div>
      <div className="text-slate-400">{pct.toFixed(1)}% del total</div>
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="skeleton h-5 w-48 mb-1" />
      <div className="skeleton h-3.5 w-64 mb-6" />
      <div className="skeleton h-56 w-full rounded-lg" />
    </div>
  )
}

export function DistributionChart({ filters }: DistributionChartProps) {
  const { data, isLoading, isError } = useDistribution(filters, 24)

  const chartData = useMemo(() => {
    if (!data?.bins.length) return []
    const total = data.counts.reduce((s, c) => s + c, 0)
    return data.counts.map((count, i) => ({
      label: `${Math.round(data.bins[i])}–${Math.round(data.bins[i + 1])}`,
      midpoint: (data.bins[i] + data.bins[i + 1]) / 2,
      count,
      pct: total > 0 ? (count / total) * 100 : 0,
    }))
  }, [data])

  if (isLoading) return <ChartSkeleton />

  if (isError) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-8 shadow-sm flex flex-col items-center gap-2 text-red-500">
        <AlertCircle className="w-6 h-6" />
        <span className="text-sm font-medium">No se pudo cargar la distribución</span>
      </div>
    )
  }

  if (!chartData.length) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 shadow-sm flex flex-col items-center gap-2 text-slate-400">
        <span className="text-4xl">📊</span>
        <span className="font-medium text-slate-600">Sin datos de distribución</span>
      </div>
    )
  }

  const maxCount = Math.max(...chartData.map(d => d.count))

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm animate-fade-in-up">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-slate-900">Distribución de disponibilidad</h2>
        <p className="text-xs text-slate-500 mt-0.5">Histograma de frecuencia de los valores de recuento de tiendas</p>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barSize={14}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
            interval={2}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => v.toLocaleString()}
            width={52}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, i) => (
              <Cell
                key={i}
                fill={`rgba(99, 102, 241, ${0.25 + (entry.count / maxCount) * 0.75})`}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
