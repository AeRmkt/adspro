import { useQuery } from '@tanstack/react-query'
import { getLastDelivery } from '../services/api'
import { useAuth } from './useAuth'

/**
 * Última veiculação das contas. Sob demanda (enabled), porque varre até 90 dias
 * de série diária por conta — é caro para rodar a cada abertura de página.
 */
export function useLastDelivery(accountIds: string[], enabled: boolean, lookbackDays = 90) {
  const { user } = useAuth()
  const key = [...accountIds].sort().join(',')

  return useQuery({
    queryKey: ['last-delivery', key, lookbackDays],
    queryFn: () => getLastDelivery(accountIds, lookbackDays),
    enabled: !!user && enabled && accountIds.length > 0,
    staleTime: 10 * 60 * 1000,
  })
}
