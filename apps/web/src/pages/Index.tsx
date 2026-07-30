import { useState, useEffect, useMemo } from 'react'
import { Plus, LayoutGrid } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { DashboardFilters } from '../components/DashboardFilters'
import { MetricPicker } from '../components/MetricPicker'
import { MetricsGrid } from '../components/MetricsGrid'
import { SpendChart } from '../components/SpendChart'
import { FunnelChart } from '../components/FunnelChart'
import { AdsManager } from '../components/AdsManager'
import { DemographicsCard } from '../components/DemographicsCard'
import { BestAdsCard } from '../components/BestAdsCard'
import { TrialBanner } from '../components/TrialBanner'
import { ConnectMetaModal } from '../components/ConnectMetaModal'
import { OrganizeSectionsModal } from '../components/OrganizeSectionsModal'
import { AdAccountsList } from '../components/AdAccountsList'
import { CampaignSelector } from '../components/CampaignSelector'
import { Button } from '../components/ui/Button'
import { useAdAccounts } from '../hooks/useAdAccounts'
import { useCampaigns } from '../hooks/useCampaigns'
import { useDashboardStore } from '../store/dashboardStore'
import { sectionById } from '../lib/dashboardSections'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../services/auth'
import { getMetaStatus } from '../services/api'
import type { MetricInsights } from '@adspro/types'

function aggregateCampaignMetrics(insights: MetricInsights[]): MetricInsights {
  const sum = (key: keyof MetricInsights) =>
    insights.reduce((acc, m) => acc + ((m[key] as number) ?? 0), 0)

  const spend = sum('spend')
  const impressions = sum('impressions')
  const clicks = sum('clicks')
  const reach = sum('reach')
  const purchases = sum('purchases')
  const purchaseValue = sum('purchaseValue')
  const addToCart = sum('addToCart')
  const leads = sum('leads')
  const conversations = sum('conversations')
  const linkClicks = sum('linkClicks')
  const websiteViews = sum('websiteViews')
  const videoViews = sum('videoViews')
  const pageEngagements = sum('pageEngagements')
  const results = sum('results')
  const revenueByUtm = sum('revenueByUtm')
  const resultsByUtm = sum('resultsByUtm')

  return {
    spend,
    impressions,
    clicks,
    reach,
    purchases,
    purchaseValue,
    addToCart,
    leads,
    conversations,
    linkClicks,
    websiteViews,
    videoViews,
    pageEngagements,
    results,
    revenueByUtm,
    resultsByUtm,
    roas: spend > 0 ? purchaseValue / spend : 0,
    roardByUtm: spend > 0 ? revenueByUtm / spend : 0,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    ctrLink: impressions > 0 ? (linkClicks / impressions) * 100 : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    cpp: reach > 0 ? (spend / reach) * 1000 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    cpcLink: linkClicks > 0 ? spend / linkClicks : 0,
    frequency: reach > 0 ? impressions / reach : 0,
    costPerPurchase: purchases > 0 ? spend / purchases : null,
    costPerLead: leads > 0 ? spend / leads : null,
    costPerConversation: conversations > 0 ? spend / conversations : null,
    costPerResult: results > 0 ? spend / results : null,
    ticketAverage: purchases > 0 ? purchaseValue / purchases : null,
  }
}

export default function Index() {
  const { data: accounts, isLoading: accountsLoading } = useAdAccounts()
  const { data: campaigns, isLoading: campaignsLoading } = useCampaigns()
  const { selectedAccountId, selectedCampaignIds, setSelectedAccount, sectionOrder } = useDashboardStore()
  const { user } = useAuth()
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [showOrganize, setShowOrganize] = useState(false)
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null)

  const { data: metaStatus } = useQuery({
    queryKey: ['meta-status'],
    queryFn: getMetaStatus,
    enabled: !!user,
    staleTime: 60_000,
  })
  const isMetaConnected = metaStatus?.connected && !metaStatus?.connection?.tokenInvalid

  // Agrega métricas das campanhas selecionadas
  const campaignData = useMemo<MetricInsights | null | undefined>(() => {
    if (selectedCampaignIds.length === 0) return undefined // usa métricas da conta
    if (!campaigns) return null
    const selected = campaigns.filter(c => selectedCampaignIds.includes(c.id))
    const withInsights = selected.map(c => c.insights).filter(Boolean) as MetricInsights[]
    if (withInsights.length === 0) return null
    return aggregateCampaignMetrics(withInsights)
  }, [selectedCampaignIds, campaigns])

  // Seleciona a primeira conta automaticamente
  useEffect(() => {
    if (!selectedAccountId && accounts && accounts.length > 0) {
      setSelectedAccount(accounts[0].id)
    }
  }, [accounts, selectedAccountId, setSelectedAccount])

  // Abre modal se não tem conta conectada
  useEffect(() => {
    if (!accountsLoading && accounts && accounts.length === 0) {
      setShowConnectModal(true)
    }
  }, [accounts, accountsLoading])

  // Busca trialEndsAt do usuário
  useEffect(() => {
    if (user) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user?.user_metadata?.trialEndsAt) {
          setTrialEndsAt(session.user.user_metadata.trialEndsAt)
        }
      })
    }
  }, [user])

  const selectedCount = selectedCampaignIds.length

  return (
    <div className="min-h-screen">
      <TrialBanner trialEndsAt={trialEndsAt} />

      <div className="p-4 md:p-6 space-y-5 md:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3 md:gap-4">
          <div>
            <h1 className="text-2xl font-bold gradient-text">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Visão geral das suas campanhas Meta Ads
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <DashboardFilters />
            <CampaignSelector />
            <MetricPicker />
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setShowConnectModal(true)}
            >
              <Plus className="h-4 w-4" />
              Conectar Conta
            </Button>
          </div>
        </div>

        {/* Contas de Anúncio via OAuth */}
        <AdAccountsList visible={!!isMetaConnected} />

        {/* Métricas */}
        {!accountsLoading && accounts?.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Conecte sua primeira conta</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Adicione sua conta Meta Ads para começar a visualizar suas métricas em tempo real.
            </p>
            <Button onClick={() => setShowConnectModal(true)}>
              Conectar Conta Meta Ads
            </Button>
          </div>
        ) : (
          <>
            {selectedCount > 0 && (
              <div className="flex items-center gap-2 text-sm bg-primary/5 border border-primary/20 rounded-lg px-4 py-2">
                <span className="text-primary font-medium">
                  {selectedCount === 1 ? '1 campanha selecionada' : `${selectedCount} campanhas selecionadas`}
                </span>
                <span className="text-muted-foreground">— métricas agregadas do período</span>
              </div>
            )}

            {/* Seções na ordem definida pelo usuário (Organizar seções).
                'half' adjacentes pareiam sozinhas no grid de 2 colunas. */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {sectionOrder.map((id) => {
                const section = sectionById(id)
                if (!section) return null
                const node: Record<string, JSX.Element> = {
                  metrics: (
                    <MetricsGrid
                      campaignData={campaignData}
                      campaignLoading={selectedCount > 0 && campaignsLoading}
                    />
                  ),
                  adsManager: <AdsManager />,
                  spend: <SpendChart />,
                  funnel: <FunnelChart />,
                  demographics: <DemographicsCard />,
                  bestAds: <BestAdsCard />,
                }
                const el = node[id]
                if (!el) return null
                return (
                  <div key={id} className={section.span === 'full' ? 'lg:col-span-2' : undefined}>
                    {el}
                  </div>
                )
              })}
            </div>

            <div className="flex justify-center pt-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowOrganize(true)}>
                <LayoutGrid className="h-4 w-4" />
                Organizar seções
              </Button>
            </div>
          </>
        )}
      </div>

      <ConnectMetaModal open={showConnectModal} onClose={() => setShowConnectModal(false)} />
      <OrganizeSectionsModal open={showOrganize} onClose={() => setShowOrganize(false)} />
    </div>
  )
}
