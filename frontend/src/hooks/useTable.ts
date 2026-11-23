import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import type { DateFilters } from '@/types/api'

export function useTable(filters: DateFilters = {}) {
  return useQuery({
    queryKey: ['table', filters],
    queryFn: () => api.getTable(filters),
    staleTime: 30_000,
    retry: 2,
  })
}
