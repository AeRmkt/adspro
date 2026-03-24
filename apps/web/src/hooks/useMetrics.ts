import { useQuery } from '@tanstack/react-query'
import { getMetrics } from '../services/api'
import { useDashboardStore } from '../store/dashboardStore'
import { getPreviousPeriod } from '@adspro/utils'

export function useMetrics() {
  const { selectedAccountId, dateRange } = useDashboardStore()
  const prevPeriod = getPreviousPeriod(dateRange.from, dateRange.to)

  const current = useQuery({
    queryKey: ['metrics', selectedAccountId, dateRange.from, dateRange.to],
    queryFn: () => getMetrics(selectedAccountId!, dateRange.from, dateRange.to),
    enabled: !!selectedAccountId,
    staleTime: 5 * 60 * 1000,
  })

  const previous = useQuery({
    queryKey: ['metrics', selectedAccountId, prevPeriod.from, prevPeriod.to],
    queryFn: () => getMetrics(selectedAccountId!, prevPeriod.from, prevPeriod.to),
    enabled: !!selectedAccountId,
    staleTime: 5 * 60 * 1000,
  })

  return { current, previous, prevPeriod }
}
