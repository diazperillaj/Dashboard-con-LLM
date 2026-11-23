import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import type { DateFilters } from '@/types/api'

export function useInsights(filters: DateFilters = {}) {
  return useQuery({
    queryKey: ['insights', filters],
    queryFn: () => api.getInsights(filters),
    staleTime: 60_000,
    retry: 2,
  })
}
