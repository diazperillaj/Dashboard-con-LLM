import {
  Activity,
  BarChart2,
  TrendingUp,
  TrendingDown,
  Zap,
  ArrowUpDown,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { cn, formatNumber, formatPercent, formatTimestamp } from '@/lib/utils'
import { useKPIs } from '@/hooks/useKPIs'
import type { DateFilters } from '@/types/api'

interface KPICardsProps {
  filters: DateFilters
}

interface KPIDef {
  key: string
  label: string
  icon: React.ElementType
  color: string
  bgColor: string
  format: (v: number, data: ReturnType<typeof useKPIs>['data']) => string
  sub?: (data: ReturnType<typeof useKPIs>['data']) => string | undefined
}

const KPI_DEFS: KPIDef[] = [
  {
    key: 'current',
    label: 'Disponibilidad Actual',
    icon: Activity,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    format: v => formatNumber(v),
    sub: d => d?.maximum_timestamp ? `Última lectura` : undefined,
  },
  {
    key: 'average',
    label: 'Disponibilidad Promedio',
    icon: BarChart2,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    format: v => formatNumber(v, 1),
  },
  {
    key: 'maximum',
    label: 'Disponibilidad Máxima',
    icon: TrendingUp,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    format: v => formatNumber(v),
    sub: d => d?.maximum_timestamp ? `En ${formatTimestamp(d.maximum_timestamp)}` : undefined,
  },
  {
    key: 'minimum',
    label: 'Disponibilidad mínima',
    icon: TrendingDown,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    format: v => formatNumber(v),
    sub: d => d?.minimum_timestamp ? `En ${formatTimestamp(d.minimum_timestamp)}` : undefined,
  },
  {
    key: 'volatility',
    label: 'Volatilidad',
    icon: Zap,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    format: v => formatNumber(v, 2),
    sub: () => 'Desviación estandar',
  },
  {
    key: 'variation_percent',
    label: '% Variación',
    icon: ArrowUpDown,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    format: v => formatPercent(v),
    sub: () => 'Primera → última lectura',
  },
]

function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="skeleton w-10 h-10 rounded-lg" />
      </div>
      <div className="skeleton h-7 w-24 mb-2" />
      <div className="skeleton h-4 w-32 mb-1" />
      <div className="skeleton h-3 w-20" />
    </div>
  )
}

export function KPICards({ filters }: KPICardsProps) {
  const { data, isLoading, isError, refetch } = useKPIs(filters)

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-6 shadow-sm flex items-center gap-3 text-red-600">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <span className="text-sm font-medium">Error al cargar los KPIs.</span>
        <button
          onClick={() => refetch()}
          className="ml-auto flex items-center gap-1.5 text-sm text-red-600 hover:text-red-800 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reintentar
        </button>
      </div>
    )
  }

  const values: Record<string, number> = {
    current: data?.current ?? 0,
    average: data?.average ?? 0,
    maximum: data?.maximum ?? 0,
    minimum: data?.minimum ?? 0,
    volatility: data?.volatility ?? 0,
    variation_percent: data?.variation_percent ?? 0,
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {KPI_DEFS.map(({ key, label, icon: Icon, color, bgColor, format, sub }, idx) => {
        const value = values[key]
        const subtitle = sub?.(data)
        const isPositive = key === 'variation_percent' && value > 0
        const isNegative = key === 'variation_percent' && value < 0

        return (
          <div
            key={key}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 animate-fade-in-up"
            style={{ animationDelay: `${idx * 60}ms` }}
          >
            {/* Icon */}
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mb-4', bgColor)}>
              <Icon className={cn('w-4.5 h-4.5', color)} size={18} />
            </div>

            {/* Value */}
            <div
              className={cn(
                'text-2xl font-bold tracking-tight tabular-nums mb-1',
                isPositive && 'text-emerald-600',
                isNegative && 'text-rose-600',
                !isPositive && !isNegative && 'text-slate-900'
              )}
            >
              {format(value, data)}
            </div>

            {/* Label */}
            <div className="text-xs font-medium text-slate-500 leading-tight">{label}</div>

            {/* Subtitle */}
            {subtitle && (
              <div className="text-xs text-slate-400 mt-1 truncate" title={subtitle}>
                {subtitle}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
