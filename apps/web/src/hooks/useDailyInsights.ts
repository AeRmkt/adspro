import { useQuery } from '@tanstack/react-query'
import { getDailyInsights } from '../services/api'
import { useDashboardStore } from '../store/dashboardStore'

export function useDailyInsights() {
  const { selectedAccountId, dateRange } = useDashboardStore()

  return useQuery({
    queryKey: ['daily', selectedAccountId, dateRange.from, dateRange.to],
    queryFn: () => getDailyInsights(selectedAccountId!, dateRange.from, dateRange.to),
    enabled: !!selectedAccountId,
    staleTime: 5 * 60 * 1000,
  })
}
