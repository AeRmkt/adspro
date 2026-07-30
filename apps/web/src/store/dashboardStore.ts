import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getDatePreset, type DatePresetKey } from '@adspro/utils'
import { DEFAULT_VISIBLE_METRICS } from '../lib/metrics'
import { DEFAULT_SECTION_ORDER, normalizeSectionOrder } from '../lib/dashboardSections'

export interface DateRange {
  from: string
  to: string
}

/** 'custom' = datas escolhidas à mão; qualquer outro valor é recalculado a cada carga. */
export type DatePreset = DatePresetKey | 'custom'

interface DashboardStore {
  selectedAccountId: string | null
  selectedCampaignIds: string[]
  dateRange: DateRange
  datePreset: DatePreset
  metricsOrder: string[]
  visibleMetrics: string[]
  funnelSteps: string[]
  /** Ordem das seções do dashboard (ids de dashboardSections). */
  sectionOrder: string[]
  sidebarCollapsed: boolean

  setSelectedAccount: (id: string | null) => void
  setSelectedCampaignIds: (ids: string[]) => void
  setDateRange: (range: DateRange) => void
  setDatePreset: (preset: DatePresetKey) => void
  setMetricsOrder: (order: string[]) => void
  setVisibleMetrics: (keys: string[]) => void
  setFunnelSteps: (keys: string[]) => void
  setSectionOrder: (ids: string[]) => void
  resetSectionOrder: () => void
  toggleSidebar: () => void
}

// Funil padrão: topo → fundo (o usuário troca cada etapa)
export const DEFAULT_FUNNEL_STEPS = ['impressions', 'clicks', 'leads']

const DEFAULT_PRESET: DatePreset = 'last30'

type PersistedState = Pick<
  DashboardStore,
  | 'selectedAccountId'
  | 'dateRange'
  | 'datePreset'
  | 'metricsOrder'
  | 'visibleMetrics'
  | 'funnelSteps'
  | 'sectionOrder'
  | 'sidebarCollapsed'
>

const PERSIST_DEFAULTS: PersistedState = {
  selectedAccountId: null,
  dateRange: getDatePreset('last30'),
  datePreset: DEFAULT_PRESET,
  metricsOrder: [],
  visibleMetrics: DEFAULT_VISIBLE_METRICS,
  funnelSteps: DEFAULT_FUNNEL_STEPS,
  sectionOrder: DEFAULT_SECTION_ORDER,
  sidebarCollapsed: false,
}

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set) => ({
      selectedAccountId: null,
      selectedCampaignIds: [],
      dateRange: getDatePreset('last30'),
      datePreset: DEFAULT_PRESET,
      metricsOrder: [],
      visibleMetrics: DEFAULT_VISIBLE_METRICS,
      funnelSteps: DEFAULT_FUNNEL_STEPS,
      sectionOrder: DEFAULT_SECTION_ORDER,
      sidebarCollapsed: false,

      setSelectedAccount: (id) => set({ selectedAccountId: id, selectedCampaignIds: [] }),
      setSelectedCampaignIds: (ids) => set({ selectedCampaignIds: ids }),
      setDateRange: (range) => set({ dateRange: range, datePreset: 'custom', selectedCampaignIds: [] }),
      setDatePreset: (preset) =>
        set({ dateRange: getDatePreset(preset), datePreset: preset, selectedCampaignIds: [] }),
      setMetricsOrder: (order) => set({ metricsOrder: order }),
      setVisibleMetrics: (keys) => set({ visibleMetrics: keys }),
      setFunnelSteps: (keys) => set({ funnelSteps: keys.slice(0, 3) }),
      setSectionOrder: (ids) => set({ sectionOrder: normalizeSectionOrder(ids) }),
      resetSectionOrder: () => set({ sectionOrder: DEFAULT_SECTION_ORDER }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    {
      name: 'adspro-dashboard',
      version: 2,
      partialize: (state) => ({
        selectedAccountId: state.selectedAccountId,
        // Guardamos as datas só para o caso 'custom'. Para presets, o período é
        // recalculado no rehydrate — senão "Últimos 30 dias" congela no dia em
        // que foi escolhido e os números param de bater com o Gerenciador.
        dateRange: state.dateRange,
        datePreset: state.datePreset,
        metricsOrder: state.metricsOrder,
        visibleMetrics: state.visibleMetrics,
        funnelSteps: state.funnelSteps,
        sectionOrder: state.sectionOrder,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
      // Storage da v1 não tinha datePreset: descarta o período salvo e volta ao padrão.
      migrate: (persisted): PersistedState => ({
        ...PERSIST_DEFAULTS,
        ...(persisted as Partial<PersistedState>),
        datePreset: DEFAULT_PRESET,
        dateRange: getDatePreset('last30'),
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        if (state.datePreset && state.datePreset !== 'custom') {
          state.dateRange = getDatePreset(state.datePreset)
        }
        state.sectionOrder = normalizeSectionOrder(state.sectionOrder)
      },
    }
  )
)
