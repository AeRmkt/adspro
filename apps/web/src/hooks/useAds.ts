import { useQuery } from '@tanstack/react-query'
import { getAds } from '../services/api'
import { useDashboardStore } from '../store/dashboardStore'

export function useAds(adsetId?: string) {
  const { selectedAccountId, dateRange } = useDashboardStore()

  return useQuery({
    queryKey: ['ads', selectedAccountId, adsetId, dateRange.from, dateRange.to],
    queryFn: () => getAds(selectedAccountId!, dateRange.from, dateRange.to, adsetId),
    enabled: !!selectedAccountId,
    staleTime: 5 * 60 * 1000,
  })
}
