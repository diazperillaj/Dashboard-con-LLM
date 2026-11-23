import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import type { DateFilters } from '@/types/api'

export function useHeatmap(filters: DateFilters = {}) {
  return useQuery({
    queryKey: ['heatmap', filters],
    queryFn: () => api.getHeatmap(filters),
    staleTime: 30_000,
    retry: 2,
  })
}
