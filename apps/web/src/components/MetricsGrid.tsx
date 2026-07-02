import { useMemo } from 'react'
import { MetricCard } from './MetricCard'
import { useMetrics } from '../hooks/useMetrics'
import { calcDelta } from '../lib/format'
import { METRIC_DEFS } from '../lib/metrics'
import { useDashboardStore } from '../store/dashboardStore'
import type { MetricInsights } from '@adspro/types'

interface MetricsGridProps {
  campaignData?: MetricInsights | null
  campaignLoading?: boolean
}

export function MetricsGrid({ campaignData, campaignLoading }: MetricsGridProps) {
  const { current, previous } = useMetrics()
  const { metricsOrder, visibleMetrics } = useDashboardStore()

  const isCampaignView = campaignData !== undefined
  const effectiveData = isCampaignView ? campaignData : current.data
  const effectiveLoading = isCampaignView ? (campaignLoading ?? false) : current.isLoading

  const shownMetrics = useMemo(() => {
    const visible = METRIC_DEFS.filter((m) => visibleMetrics.includes(m.key))
    if (!metricsOrder.length) return visible
    const orderMap = new Map(metricsOrder.map((key, i) => [key, i]))
    return [...visible].sort((a, b) => (orderMap.get(a.key) ?? 999) - (orderMap.get(b.key) ?? 999))
  }, [metricsOrder, visibleMetrics])

  if (!effectiveLoading && shownMetrics.length === 0) {
    return (
      <div className="glass-card p-8 text-center text-sm text-muted-foreground">
        Nenhuma métrica selecionada. Use o botão <strong>Métricas</strong> para escolher o que exibir.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {shownMetrics.map((metric, idx) => {
        const currentVal = effectiveData ? ((effectiveData[metric.key] as number | null) ?? 0) : 0
        const previousVal = previous.data ? ((previous.data[metric.key] as number | null) ?? 0) : 0
        const delta = !isCampaignView && previous.data ? calcDelta(currentVal ?? 0, previousVal ?? 0) : null
        const adjustedDelta = metric.higherIsBetter === false && delta != null ? -delta : delta

        return (
          <MetricCard
            key={metric.key}
            label={metric.label}
            value={effectiveData ? (effectiveData[metric.key] as number | null) : 0}
            format={metric.format}
            delta={adjustedDelta}
            icon={metric.icon}
            iconColor={metric.iconColor}
            tooltip={metric.tooltip}
            loading={effectiveLoading}
            index={idx}
          />
        )
      })}
    </div>
  )
}
