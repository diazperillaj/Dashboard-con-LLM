import { Lightbulb, TrendingUp, AlertTriangle, Info, RefreshCw, AlertCircle } from 'lucide-react'
import { useInsights } from '@/hooks/useInsights'
import type { DateFilters } from '@/types/api'
import { cn } from '@/lib/utils'

interface InsightsPanelProps {
  filters: DateFilters
}

type InsightType = 'positive' | 'warning' | 'info' | 'neutral'

function classifyInsight(text: string): InsightType {
  const lower = text.toLowerCase()
  if (lower.includes('high') || lower.includes('peak') || lower.includes('increas') || lower.includes('above')) {
    return 'positive'
  }
  if (lower.includes('low') || lower.includes('drop') || lower.includes('decreas') || lower.includes('below') || lower.includes('alert')) {
    return 'warning'
  }
  if (lower.includes('note') || lower.includes('average') || lower.includes('typical')) {
    return 'info'
  }
  return 'neutral'
}

const TYPE_CONFIG: Record<InsightType, { icon: React.ElementType; bg: string; border: string; iconColor: string; textColor: string }> = {
  positive: {
    icon: TrendingUp,
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    iconColor: 'text-emerald-600',
    textColor: 'text-emerald-800',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    iconColor: 'text-amber-600',
    textColor: 'text-amber-800',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    iconColor: 'text-blue-600',
    textColor: 'text-blue-800',
  },
  neutral: {
    icon: Lightbulb,
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    iconColor: 'text-slate-500',
    textColor: 'text-slate-700',
  },
}

function InsightSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="skeleton h-5 w-44 mb-1" />
      <div className="skeleton h-3.5 w-32 mb-5" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-16 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

export function InsightsPanel({ filters }: InsightsPanelProps) {
  const { data, isLoading, isError, refetch } = useInsights(filters)

  if (isLoading) return <InsightSkeleton />

  if (isError) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-6 shadow-sm flex items-center gap-3 text-red-600">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <span className="text-sm font-medium">No se pudieron cargar los datos.</span>
        <button
          onClick={() => refetch()}
          className="ml-auto flex items-center gap-1.5 text-sm hover:text-red-800 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Reintentar
        </button>
      </div>
    )
  }

  const insights = data?.insights ?? []

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm animate-fade-in-up">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-lg bg-yellow-50 flex items-center justify-center">
          <Lightbulb className="w-4 h-4 text-yellow-500" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">Información automatizada</h2>
          <p className="text-xs text-slate-500">{insights.length} dato{insights.length !== 1 ? 's' : ''} generados</p>
        </div>
      </div>

      {insights.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
          <span className="text-3xl">💡</span>
          <span className="text-sm font-medium text-slate-500">No hay datos disponibles para este período.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {insights.map((insight, i) => {
            const type = classifyInsight(insight)
            const { icon: Icon, bg, border, iconColor, textColor } = TYPE_CONFIG[type]
            return (
              <div
                key={i}
                className={cn(
                  'flex items-start gap-3 p-4 rounded-xl border transition-shadow hover:shadow-sm',
                  bg,
                  border
                )}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className={cn('shrink-0 mt-0.5', iconColor)}>
                  <Icon size={16} />
                </div>
                <p className={cn('text-sm leading-relaxed', textColor)}>{insight}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
