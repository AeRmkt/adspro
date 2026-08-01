import { useEffect } from 'react'
import { Sparkles, Filter, X } from 'lucide-react'
import { DashboardFilters } from '../components/DashboardFilters'
import { CampaignSelector } from '../components/CampaignSelector'
import { HeroKpis } from '../components/bi/HeroKpis'
import { AttentionPanel } from '../components/bi/AttentionPanel'
import { PerformanceTrend } from '../components/bi/PerformanceTrend'
import { EfficiencyRanking } from '../components/bi/EfficiencyRanking'
import { AdsManager } from '../components/AdsManager'
import { useAdAccounts } from '../hooks/useAdAccounts'
import { useDashboardStore } from '../store/dashboardStore'
import { useEffectiveMetrics } from '../hooks/useEffectiveMetrics'

export default function DashboardBI() {
  const { data: accounts } = useAdAccounts()
  const { selectedAccountId, setSelectedAccount, setSelectedCampaignIds } = useDashboardStore()
  const { filtered, label } = useEffectiveMetrics()

  useEffect(() => {
    if (!selectedAccountId && accounts && accounts.length > 0) setSelectedAccount(accounts[0].id)
  }, [accounts, selectedAccountId, setSelectedAccount])

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl md:text-2xl font-bold">
            <span className="gradient-text">Painel de Performance</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary ring-1 ring-primary/20">BI</span>
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Do diagnóstico à decisão — não só os números, mas o que fazer com eles.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DashboardFilters />
          <CampaignSelector />
        </div>
      </div>

      {/* Aviso de filtro ativo */}
      {filtered && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/5 px-4 py-2.5 text-sm">
          <Filter className="h-4 w-4 flex-shrink-0 text-primary" />
          <span className="text-muted-foreground">
            Mostrando os números de <span className="font-semibold text-foreground">{label}</span> — não da conta inteira.
          </span>
          <button
            onClick={() => setSelectedCampaignIds([])}
            className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            <X className="h-3 w-3" /> Ver conta inteira
          </button>
        </div>
      )}

      {/* 1. KPIs-chave com tendência */}
      <HeroKpis />

      {/* 2. Diagnóstico + tendência */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1"><AttentionPanel /></div>
        <div className="lg:col-span-2"><PerformanceTrend /></div>
      </div>

      {/* 3. Para onde vai a verba */}
      <EfficiencyRanking />

      {/* 4. Controle operacional (secundário) */}
      <div>
        <h2 className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" /> Controle operacional
        </h2>
        <AdsManager />
      </div>
    </div>
  )
}
