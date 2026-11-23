import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import type { DateFilters } from '@/types/api'

export function useHourlyAverage(filters: DateFilters = {}) {
  return useQuery({
    queryKey: ['hourly-average', filters],
    queryFn: () => api.getHourlyAverage(filters),
    staleTime: 30_000,
    retry: 2,
  })
}
