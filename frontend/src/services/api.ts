import axios from 'axios'
import type {
  KPIResponse,
  TimeSeriesPoint,
  HourlyAverage,
  HeatmapPoint,
  DistributionResponse,
  DailySummary,
  InsightsResponse,
  ChatResponse,
  DateFilters,
} from '@/types/api'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
})

function cleanFilters(filters: DateFilters): Record<string, string> {
  const params: Record<string, string> = {}
  if (filters.start_date) params.start_date = filters.start_date
  if (filters.end_date) params.end_date = filters.end_date
  return params
}

export const api = {
  getKPIs: (filters: DateFilters = {}) =>
    client.get<KPIResponse>('/api/kpis', { params: cleanFilters(filters) }).then(r => r.data),

  getTimeseries: (filters: DateFilters = {}) =>
    client.get<TimeSeriesPoint[]>('/api/timeseries', { params: cleanFilters(filters) }).then(r => r.data),

  getHourlyAverage: (filters: DateFilters = {}) =>
    client.get<HourlyAverage[]>('/api/hourly-average', { params: cleanFilters(filters) }).then(r => r.data),

  getHeatmap: (filters: DateFilters = {}) =>
    client.get<HeatmapPoint[]>('/api/heatmap', { params: cleanFilters(filters) }).then(r => r.data),

  getDistribution: (filters: DateFilters = {}, bins = 20) =>
    client
      .get<DistributionResponse>('/api/distribution', { params: { ...cleanFilters(filters), bins } })
      .then(r => r.data),

  getTable: (filters: DateFilters = {}) =>
    client.get<DailySummary[]>('/api/table', { params: cleanFilters(filters) }).then(r => r.data),

  getInsights: (filters: DateFilters = {}) =>
    client.get<InsightsResponse>('/api/insights', { params: cleanFilters(filters) }).then(r => r.data),

  sendChat: (message: string) =>
    client.post<ChatResponse>('/api/chat', { message }).then(r => r.data),
}
