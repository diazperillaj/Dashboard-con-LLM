import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import type { DateFilters } from '@/types/api'

export function useKPIs(filters: DateFilters = {}) {
  return useQuery({
    queryKey: ['kpis', filters],
    queryFn: () => api.getKPIs(filters),
    staleTime: 30_000,
    retry: 2,
  })
}
