import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import type { DateFilters } from '@/types/api'

export function useTimeseries(filters: DateFilters = {}) {
  return useQuery({
    queryKey: ['timeseries', filters],
    queryFn: () => api.getTimeseries(filters),
    staleTime: 30_000,
    retry: 2,
  })
}
