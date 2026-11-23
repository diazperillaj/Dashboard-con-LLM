import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import type { DateFilters } from '@/types/api'

export function useDistribution(filters: DateFilters = {}, bins = 20) {
  return useQuery({
    queryKey: ['distribution', filters, bins],
    queryFn: () => api.getDistribution(filters, bins),
    staleTime: 30_000,
    retry: 2,
  })
}
