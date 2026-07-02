import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getDatePreset } from '@adspro/utils'
import { DEFAULT_VISIBLE_METRICS } from '../lib/metrics'

export interface DateRange {
  from: string
  to: string
}

interface DashboardStore {
  selectedAccountId: string | null
  selectedCampaignIds: string[]
  dateRange: DateRange
  metricsOrder: string[]
  visibleMetrics: string[]
  funnelSteps: string[]
  sidebarCollapsed: boolean

  setSelectedAccount: (id: string | null) => void
  setSelectedCampaignIds: (ids: string[]) => void
  setDateRange: (range: DateRange) => void
  setMetricsOrder: (order: string[]) => void
  setVisibleMetrics: (keys: string[]) => void
  setFunnelSteps: (keys: string[]) => void
  toggleSidebar: () => void
}

// Funil padrão: topo → fundo (o usuário troca cada etapa)
export const DEFAULT_FUNNEL_STEPS = ['impressions', 'clicks', 'leads']

const defaultDateRange = getDatePreset('last30')

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set) => ({
      selectedAccountId: null,
      selectedCampaignIds: [],
      dateRange: defaultDateRange,
      metricsOrder: [],
      visibleMetrics: DEFAULT_VISIBLE_METRICS,
      funnelSteps: DEFAULT_FUNNEL_STEPS,
      sidebarCollapsed: false,

      setSelectedAccount: (id) => set({ selectedAccountId: id, selectedCampaignIds: [] }),
      setSelectedCampaignIds: (ids) => set({ selectedCampaignIds: ids }),
      setDateRange: (range) => set({ dateRange: range, selectedCampaignIds: [] }),
      setMetricsOrder: (order) => set({ metricsOrder: order }),
      setVisibleMetrics: (keys) => set({ visibleMetrics: keys }),
      setFunnelSteps: (keys) => set({ funnelSteps: keys.slice(0, 3) }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    {
      name: 'adspro-dashboard',
      partialize: (state) => ({
        selectedAccountId: state.selectedAccountId,
        dateRange: state.dateRange,
        metricsOrder: state.metricsOrder,
        visibleMetrics: state.visibleMetrics,
        funnelSteps: state.funnelSteps,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
)
