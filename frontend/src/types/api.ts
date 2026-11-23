export interface KPIResponse {
  current: number
  average: number
  maximum: number
  maximum_timestamp: string
  minimum: number
  minimum_timestamp: string
  variation_percent: number
  volatility: number
}

export interface TimeSeriesPoint {
  timestamp: string
  value: number
}

export interface HourlyAverage {
  hour: number
  average: number
}

export interface HeatmapPoint {
  date: string
  hour: number
  value: number
}

export interface DistributionResponse {
  bins: number[]
  counts: number[]
}

export interface DailySummary {
  date: string
  average: number
  maximum: number
  minimum: number
  volatility: number
  records: number
}

export interface InsightsResponse {
  insights: string[]
}

export interface ToolCall {
  tool: string
  parameters: Record<string, unknown>
  result?: unknown
}

export interface ChatResponse {
  message: string
  tools_available: string[]
  tool_calls: ToolCall[]
  status: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface DateFilters {
  start_date?: string
  end_date?: string
}
