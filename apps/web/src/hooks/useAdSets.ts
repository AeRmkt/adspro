import { useQuery } from '@tanstack/react-query'
import { getAdSets } from '../services/api'
import { useDashboardStore } from '../store/dashboardStore'

export function useAdSets(campaignId?: string) {
  const { selectedAccountId, dateRange } = useDashboardStore()

  return useQuery({
    queryKey: ['adsets', selectedAccountId, campaignId, dateRange.from, dateRange.to],
    queryFn: () => getAdSets(selectedAccountId!, dateRange.from, dateRange.to, campaignId),
    enabled: !!selectedAccountId,
    staleTime: 5 * 60 * 1000,
  })
}
