import { useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { FiltersBar } from '@/components/dashboard/FiltersBar'
import { KPICards } from '@/components/dashboard/KPICards'
import { TimeSeriesChart } from '@/components/dashboard/TimeSeriesChart'
import { HourlyAverageChart } from '@/components/dashboard/HourlyAverageChart'
import { HeatmapChart } from '@/components/dashboard/HeatmapChart'
import { DistributionChart } from '@/components/dashboard/DistributionChart'
import { InsightsPanel } from '@/components/dashboard/InsightsPanel'
import { AnalyticsTable } from '@/components/dashboard/AnalyticsTable'
import { ChatWidget } from '@/components/chatbot/ChatWidget'
import type { DateFilters } from '@/types/api'

export function DashboardPage() {
  const [filters, setFilters] = useState<DateFilters>({
    start_date: undefined,
    end_date: undefined,
  })

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* ── Header ── */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 md:px-6 py-4 shrink-0">
        <div className="max-w-screen-2xl mx-auto flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-900/40">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-white text-base font-semibold tracking-tight">
              Dashboard Analítico
            </h1>
            <p className="text-slate-400 text-xs mt-0.5">
              Disponibilidad de tiendas · métricas históricas y asistente con IA
            </p>
          </div>
        </div>
      </header>

      {/* ── Filters ── */}
      <FiltersBar filters={filters} onChange={setFilters} />

      {/* ── Main content ── */}
      <main className="flex-1 px-4 md:px-6 py-6 max-w-screen-2xl mx-auto w-full">
        <div className="flex flex-col gap-6">

          {/* KPIs */}
          <section>
            <KPICards filters={filters} />
          </section>

          {/* Time Series */}
          <section>
            <TimeSeriesChart filters={filters} />
          </section>

          {/* Hourly Average + Heatmap */}
          <section className="grid grid-cols-1 xl:grid-cols-2 gap-6" style={{ minHeight: 360 }}>
            <HourlyAverageChart filters={filters} />
            <HeatmapChart filters={filters} />
          </section>

          {/* Distribution */}
          <section>
            <DistributionChart filters={filters} />
          </section>

          {/* Insights */}
          <section>
            <InsightsPanel filters={filters} />
          </section>

          {/* Table */}
          <section className="pb-4">
            <AnalyticsTable filters={filters} />
          </section>

        </div>
      </main>

      {/* ── Chatbot ── */}
      <ChatWidget />
    </div>
  )
}
