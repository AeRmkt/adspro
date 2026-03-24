import { useMemo } from 'react'
import {
  DollarSign, ShoppingCart, Target, Users, MousePointerClick,
  Eye, TrendingUp, Zap, MessageCircle, Mail, Phone, BarChart2,
  Activity, Star, Globe, Video, Heart, Hash, Award,
} from 'lucide-react'
import { MetricCard } from './MetricCard'
import { useMetrics } from '../hooks/useMetrics'
import { fmtBRL, fmtNumber, fmtPct, fmtMultiplier, calcDelta } from '../lib/format'
interface MetricDef {
  key: keyof MetricInsights
  label: string
  format: (v: number) => string
  icon: React.ReactNode
  iconColor: string
  tooltip: string
  higherIsBetter?: boolean
}

const METRIC_DEFS: MetricDef[] = [
  { key: 'spend', label: 'Investimento', format: fmtBRL, icon: <DollarSign className="h-4 w-4" />, iconColor: 'text-blue-400', tooltip: 'Total investido no período selecionado', higherIsBetter: false },
  { key: 'purchaseValue', label: 'Valor em Compras', format: fmtBRL, icon: <ShoppingCart className="h-4 w-4" />, iconColor: 'text-green-400', tooltip: 'Valor total das conversões de compra atribuídas aos anúncios' },
  { key: 'roas', label: 'ROAS', format: (v) => fmtMultiplier(v), icon: <TrendingUp className="h-4 w-4" />, iconColor: 'text-emerald-400', tooltip: 'Retorno sobre o investimento em anúncios (Receita / Gasto)' },
  { key: 'costPerPurchase', label: 'CPA Médio', format: (v) => v ? fmtBRL(v) : 'N/A', icon: <Target className="h-4 w-4" />, iconColor: 'text-orange-400', tooltip: 'Custo médio por compra (Gasto / Compras)', higherIsBetter: false },
  { key: 'ticketAverage', label: 'Ticket Médio', format: (v) => v ? fmtBRL(v) : 'N/A', icon: <Award className="h-4 w-4" />, iconColor: 'text-purple-400', tooltip: 'Valor médio por compra (Receita / Número de Compras)' },
  { key: 'addToCart', label: 'Adições ao Carrinho', format: fmtNumber, icon: <ShoppingCart className="h-4 w-4" />, iconColor: 'text-cyan-400', tooltip: 'Número de vezes que um produto foi adicionado ao carrinho' },
  { key: 'purchases', label: 'Compras', format: fmtNumber, icon: <Star className="h-4 w-4" />, iconColor: 'text-yellow-400', tooltip: 'Total de compras confirmadas atribuídas aos anúncios' },
  { key: 'conversations', label: 'Conversas', format: fmtNumber, icon: <MessageCircle className="h-4 w-4" />, iconColor: 'text-pink-400', tooltip: 'Conversas iniciadas via Messenger, WhatsApp ou Instagram' },
  { key: 'costPerConversation', label: 'Custo por Conversa', format: (v) => v ? fmtBRL(v) : 'N/A', icon: <Phone className="h-4 w-4" />, iconColor: 'text-rose-400', tooltip: 'Custo médio para iniciar uma conversa', higherIsBetter: false },
  { key: 'leads', label: 'Leads', format: fmtNumber, icon: <Mail className="h-4 w-4" />, iconColor: 'text-indigo-400', tooltip: 'Total de leads capturados pelos anúncios' },
  { key: 'costPerLead', label: 'Custo por Lead', format: (v) => v ? fmtBRL(v) : 'N/A', icon: <Users className="h-4 w-4" />, iconColor: 'text-violet-400', tooltip: 'Custo médio por lead gerado', higherIsBetter: false },
  { key: 'impressions', label: 'Impressões', format: fmtNumber, icon: <Eye className="h-4 w-4" />, iconColor: 'text-sky-400', tooltip: 'Número total de vezes que os anúncios foram exibidos' },
  { key: 'reach', label: 'Alcance', format: fmtNumber, icon: <Users className="h-4 w-4" />, iconColor: 'text-teal-400', tooltip: 'Número de pessoas únicas que viram os anúncios' },
  { key: 'clicks', label: 'Cliques', format: fmtNumber, icon: <MousePointerClick className="h-4 w-4" />, iconColor: 'text-lime-400', tooltip: 'Total de cliques nos anúncios' },
  { key: 'linkClicks', label: 'Cliques no Link', format: fmtNumber, icon: <Globe className="h-4 w-4" />, iconColor: 'text-green-500', tooltip: 'Cliques que levaram para fora do Facebook/Instagram' },
  { key: 'ctr', label: 'CTR Todos', format: (v) => fmtPct(v), icon: <Activity className="h-4 w-4" />, iconColor: 'text-amber-400', tooltip: 'Taxa de cliques sobre impressões (todos os cliques)' },
  { key: 'ctrLink', label: 'CTR Link', format: (v) => fmtPct(v), icon: <BarChart2 className="h-4 w-4" />, iconColor: 'text-orange-500', tooltip: 'Taxa de cliques no link em relação às impressões' },
  { key: 'cpm', label: 'CPM', format: fmtBRL, icon: <Hash className="h-4 w-4" />, iconColor: 'text-slate-400', tooltip: 'Custo por mil impressões', higherIsBetter: false },
  { key: 'cpc', label: 'CPC', format: fmtBRL, icon: <MousePointerClick className="h-4 w-4" />, iconColor: 'text-stone-400', tooltip: 'Custo médio por clique (todos os cliques)', higherIsBetter: false },
  { key: 'cpcLink', label: 'CPC Link', format: fmtBRL, icon: <Globe className="h-4 w-4" />, iconColor: 'text-neutral-400', tooltip: 'Custo médio por clique no link', higherIsBetter: false },
  { key: 'websiteViews', label: 'Visualizações do Site', format: fmtNumber, icon: <Globe className="h-4 w-4" />, iconColor: 'text-blue-500', tooltip: 'Número de visualizações de página de destino' },
  { key: 'videoViews', label: 'Visualizações de Vídeo', format: fmtNumber, icon: <Video className="h-4 w-4" />, iconColor: 'text-red-400', tooltip: 'Número de visualizações de vídeo (pelo menos 3 segundos)' },
  { key: 'frequency', label: 'Frequência', format: (v) => fmtMultiplier(v, 1), icon: <Zap className="h-4 w-4" />, iconColor: 'text-yellow-500', tooltip: 'Média de vezes que cada pessoa viu o anúncio', higherIsBetter: false },
  { key: 'pageEngagements', label: 'Engajamento de Página', format: fmtNumber, icon: <Heart className="h-4 w-4" />, iconColor: 'text-pink-500', tooltip: 'Total de engajamentos com a página (curtidas, comentários, etc.)' },
  { key: 'results', label: 'Resultados', format: fmtNumber, icon: <Target className="h-4 w-4" />, iconColor: 'text-emerald-500', tooltip: 'Total de resultados principais (baseado no objetivo da campanha)' },
  { key: 'costPerResult', label: 'Custo por Resultado', format: (v) => v ? fmtBRL(v) : 'N/A', icon: <DollarSign className="h-4 w-4" />, iconColor: 'text-red-500', tooltip: 'Custo médio por resultado principal', higherIsBetter: false },
  { key: 'revenueByUtm', label: 'Receita por UTM', format: fmtBRL, icon: <TrendingUp className="h-4 w-4" />, iconColor: 'text-green-600', tooltip: 'Receita rastreada via parâmetros UTM' },
  { key: 'roardByUtm', label: 'ROAS por UTM', format: (v) => fmtMultiplier(v), icon: <BarChart2 className="h-4 w-4" />, iconColor: 'text-teal-500', tooltip: 'ROAS calculado com base nos dados UTM' },
  { key: 'resultsByUtm', label: 'Resultados por UTM', format: fmtNumber, icon: <Award className="h-4 w-4" />, iconColor: 'text-indigo-500', tooltip: 'Resultados rastreados via parâmetros UTM' },
]

import type { MetricInsights } from '@adspro/types'

interface MetricsGridProps {
  metricsOrder?: string[]
  campaignData?: MetricInsights | null
  campaignLoading?: boolean
}

export function MetricsGrid({ metricsOrder = [], campaignData, campaignLoading }: MetricsGridProps) {
  const { current, previous } = useMetrics()

  const isCampaignView = campaignData !== undefined
  const effectiveData = isCampaignView ? campaignData : current.data
  const effectiveLoading = isCampaignView ? (campaignLoading ?? false) : current.isLoading

  const orderedMetrics = useMemo(() => {
    if (!metricsOrder.length) return METRIC_DEFS
    const orderMap = new Map(metricsOrder.map((key, i) => [key, i]))
    return [...METRIC_DEFS].sort((a, b) => {
      const ai = orderMap.get(a.key) ?? 999
      const bi = orderMap.get(b.key) ?? 999
      return ai - bi
    })
  }, [metricsOrder])

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {orderedMetrics.map((metric, idx) => {
        const currentVal = effectiveData ? (effectiveData[metric.key] as number) ?? 0 : 0
        const previousVal = previous.data ? (previous.data[metric.key] as number) ?? 0 : 0
        const delta = !isCampaignView && previous.data ? calcDelta(currentVal, previousVal) : null
        const adjustedDelta = metric.higherIsBetter === false && delta != null ? -delta : delta

        return (
          <MetricCard
            key={metric.key}
            label={metric.label}
            value={metric.format(currentVal)}
            delta={adjustedDelta}
            icon={metric.icon}
            iconColor={metric.iconColor}
            tooltip={metric.tooltip}
            loading={effectiveLoading}
            style={{ animationDelay: `${idx * 30}ms` }}
          />
        )
      })}
    </div>
  )
}
