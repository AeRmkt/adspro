import { useQuery } from '@tanstack/react-query'
import { compareInsights } from '../services/api'
import { useDashboardStore } from '../store/dashboardStore'

interface CompareParams {
  from1: string
  to1: string
  from2: string
  to2: string
  enabled?: boolean
}

export function useCompare({ from1, to1, from2, to2, enabled = false }: CompareParams) {
  const { selectedAccountId } = useDashboardStore()

  return useQuery({
    queryKey: ['compare', selectedAccountId, from1, to1, from2, to2],
    queryFn: () => compareInsights(selectedAccountId!, from1, to1, from2, to2),
    enabled: !!selectedAccountId && enabled && !!from1 && !!to1 && !!from2 && !!to2,
    staleTime: 5 * 60 * 1000,
  })
}
