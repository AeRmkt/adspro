import { useQuery } from '@tanstack/react-query'
import { getCampaigns } from '../services/api'
import { useDashboardStore } from '../store/dashboardStore'

export function useCampaigns() {
  const { selectedAccountId, dateRange } = useDashboardStore()

  return useQuery({
    queryKey: ['campaigns', selectedAccountId, dateRange.from, dateRange.to],
    queryFn: () => getCampaigns(selectedAccountId!, dateRange.from, dateRange.to),
    enabled: !!selectedAccountId,
    staleTime: 5 * 60 * 1000,
  })
}
