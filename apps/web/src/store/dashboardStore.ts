import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getDatePreset } from '@adspro/utils'

export interface DateRange {
  from: string
  to: string
}

interface DashboardStore {
  selectedAccountId: string | null
  selectedCampaignIds: string[]
  dateRange: DateRange
  metricsOrder: string[]
  sidebarCollapsed: boolean

  setSelectedAccount: (id: string | null) => void
  setSelectedCampaignIds: (ids: string[]) => void
  setDateRange: (range: DateRange) => void
  setMetricsOrder: (order: string[]) => void
  toggleSidebar: () => void
}

const defaultDateRange = getDatePreset('last30')

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set) => ({
      selectedAccountId: null,
      selectedCampaignIds: [],
      dateRange: defaultDateRange,
      metricsOrder: [],
      sidebarCollapsed: false,

      setSelectedAccount: (id) => set({ selectedAccountId: id, selectedCampaignIds: [] }),
      setSelectedCampaignIds: (ids) => set({ selectedCampaignIds: ids }),
      setDateRange: (range) => set({ dateRange: range, selectedCampaignIds: [] }),
      setMetricsOrder: (order) => set({ metricsOrder: order }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    {
      name: 'adspro-dashboard',
      partialize: (state) => ({
        selectedAccountId: state.selectedAccountId,
        dateRange: state.dateRange,
        metricsOrder: state.metricsOrder,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
)
