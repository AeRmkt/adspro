import { useMemo } from 'react'
import { useMetrics } from './useMetrics'
import { useCampaigns } from './useCampaigns'
import { useDashboardStore } from '../store/dashboardStore'
import { aggregateCampaignMetrics } from '../lib/aggregate'
import type { MetricInsights } from '@adspro/types'

// Métricas "efetivas" para exibir: se o usuário filtrou campanha(s), agrega essas
// campanhas; senão usa o total da conta. Também diz se está filtrado e por quais.
export function useEffectiveMetrics() {
  const { current, previous } = useMetrics()
  const { data: campaigns } = useCampaigns()
  const { selectedCampaignIds } = useDashboardStore()

  const filtered = selectedCampaignIds.length > 0

  const data = useMemo<MetricInsights | null>(() => {
    if (!filtered) return current.data ?? null
    const selected = (campaigns ?? []).filter((c) => selectedCampaignIds.includes(c.id))
    const withIns = selected.map((c) => c.insights).filter(Boolean) as MetricInsights[]
    return withIns.length ? aggregateCampaignMetrics(withIns) : null
  }, [filtered, campaigns, selectedCampaignIds, current.data])

  const label = useMemo(() => {
    if (!filtered) return 'Conta inteira'
    if (selectedCampaignIds.length === 1) {
      return (campaigns ?? []).find((c) => c.id === selectedCampaignIds[0])?.name ?? '1 campanha'
    }
    return `${selectedCampaignIds.length} campanhas`
  }, [filtered, campaigns, selectedCampaignIds])

  return {
    data,
    // comparação vs período anterior só existe no nível da conta (Meta não dá prev por campanha aqui)
    previous: filtered ? null : previous.data ?? null,
    filtered,
    label,
    isLoading: current.isLoading,
  }
}
