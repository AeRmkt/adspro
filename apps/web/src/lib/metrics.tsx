import {
  DollarSign, ShoppingCart, Target, Users, MousePointerClick,
  Eye, TrendingUp, Zap, MessageCircle, Mail, Phone, BarChart2,
  Activity, Star, Globe, Video, Heart, Hash, Award,
} from 'lucide-react'
import type { MetricInsights } from '@adspro/types'
import { fmtBRL, fmtNumber, fmtPct, fmtMultiplier } from './format'

export interface MetricDef {
  key: keyof MetricInsights
  label: string
  group: 'Resultado' | 'Custo' | 'Tráfego' | 'UTM'
  format: (v: number) => string
  icon: React.ReactNode
  iconColor: string
  tooltip: string
  higherIsBetter?: boolean
}

export const METRIC_DEFS: MetricDef[] = [
  { key: 'spend', label: 'Investimento', group: 'Resultado', format: fmtBRL, icon: <DollarSign className="h-4 w-4" />, iconColor: 'text-blue-400', tooltip: 'Total investido no período selecionado', higherIsBetter: false },
  { key: 'results', label: 'Resultados', group: 'Resultado', format: fmtNumber, icon: <Target className="h-4 w-4" />, iconColor: 'text-emerald-500', tooltip: 'Total de resultados principais (baseado no objetivo da campanha)' },
  { key: 'costPerResult', label: 'Custo por Resultado', group: 'Custo', format: (v) => v ? fmtBRL(v) : 'N/A', icon: <DollarSign className="h-4 w-4" />, iconColor: 'text-red-500', tooltip: 'Custo médio por resultado principal', higherIsBetter: false },
  { key: 'leads', label: 'Leads', group: 'Resultado', format: fmtNumber, icon: <Mail className="h-4 w-4" />, iconColor: 'text-indigo-400', tooltip: 'Total de leads capturados pelos anúncios' },
  { key: 'costPerLead', label: 'Custo por Lead', group: 'Custo', format: (v) => v ? fmtBRL(v) : 'N/A', icon: <Users className="h-4 w-4" />, iconColor: 'text-violet-400', tooltip: 'Custo médio por lead gerado', higherIsBetter: false },
  { key: 'purchases', label: 'Compras', group: 'Resultado', format: fmtNumber, icon: <Star className="h-4 w-4" />, iconColor: 'text-yellow-400', tooltip: 'Total de compras confirmadas atribuídas aos anúncios' },
  { key: 'purchaseValue', label: 'Valor em Compras', group: 'Resultado', format: fmtBRL, icon: <ShoppingCart className="h-4 w-4" />, iconColor: 'text-green-400', tooltip: 'Valor total das conversões de compra atribuídas aos anúncios' },
  { key: 'roas', label: 'ROAS', group: 'Resultado', format: (v) => fmtMultiplier(v), icon: <TrendingUp className="h-4 w-4" />, iconColor: 'text-emerald-400', tooltip: 'Retorno sobre o investimento em anúncios (Receita / Gasto)' },
  { key: 'costPerPurchase', label: 'CPA Médio', group: 'Custo', format: (v) => v ? fmtBRL(v) : 'N/A', icon: <Target className="h-4 w-4" />, iconColor: 'text-orange-400', tooltip: 'Custo médio por compra (Gasto / Compras)', higherIsBetter: false },
  { key: 'ticketAverage', label: 'Ticket Médio', group: 'Resultado', format: (v) => v ? fmtBRL(v) : 'N/A', icon: <Award className="h-4 w-4" />, iconColor: 'text-purple-400', tooltip: 'Valor médio por compra (Receita / Número de Compras)' },
  { key: 'addToCart', label: 'Adições ao Carrinho', group: 'Resultado', format: fmtNumber, icon: <ShoppingCart className="h-4 w-4" />, iconColor: 'text-cyan-400', tooltip: 'Número de vezes que um produto foi adicionado ao carrinho' },
  { key: 'conversations', label: 'Conversas', group: 'Resultado', format: fmtNumber, icon: <MessageCircle className="h-4 w-4" />, iconColor: 'text-pink-400', tooltip: 'Conversas iniciadas via Messenger, WhatsApp ou Instagram' },
  { key: 'costPerConversation', label: 'Custo por Conversa', group: 'Custo', format: (v) => v ? fmtBRL(v) : 'N/A', icon: <Phone className="h-4 w-4" />, iconColor: 'text-rose-400', tooltip: 'Custo médio para iniciar uma conversa', higherIsBetter: false },
  { key: 'impressions', label: 'Impressões', group: 'Tráfego', format: fmtNumber, icon: <Eye className="h-4 w-4" />, iconColor: 'text-sky-400', tooltip: 'Número total de vezes que os anúncios foram exibidos' },
  { key: 'reach', label: 'Alcance', group: 'Tráfego', format: fmtNumber, icon: <Users className="h-4 w-4" />, iconColor: 'text-teal-400', tooltip: 'Número de pessoas únicas que viram os anúncios' },
  { key: 'clicks', label: 'Cliques', group: 'Tráfego', format: fmtNumber, icon: <MousePointerClick className="h-4 w-4" />, iconColor: 'text-lime-400', tooltip: 'Total de cliques nos anúncios' },
  { key: 'linkClicks', label: 'Cliques no Link', group: 'Tráfego', format: fmtNumber, icon: <Globe className="h-4 w-4" />, iconColor: 'text-green-500', tooltip: 'Cliques que levaram para fora do Facebook/Instagram' },
  { key: 'ctr', label: 'CTR Todos', group: 'Tráfego', format: (v) => fmtPct(v), icon: <Activity className="h-4 w-4" />, iconColor: 'text-amber-400', tooltip: 'Taxa de cliques sobre impressões (todos os cliques)' },
  { key: 'ctrLink', label: 'CTR Link', group: 'Tráfego', format: (v) => fmtPct(v), icon: <BarChart2 className="h-4 w-4" />, iconColor: 'text-orange-500', tooltip: 'Taxa de cliques no link em relação às impressões' },
  { key: 'cpm', label: 'CPM', group: 'Custo', format: fmtBRL, icon: <Hash className="h-4 w-4" />, iconColor: 'text-slate-400', tooltip: 'Custo por mil impressões', higherIsBetter: false },
  { key: 'cpc', label: 'CPC', group: 'Custo', format: fmtBRL, icon: <MousePointerClick className="h-4 w-4" />, iconColor: 'text-stone-400', tooltip: 'Custo médio por clique (todos os cliques)', higherIsBetter: false },
  { key: 'cpcLink', label: 'CPC Link', group: 'Custo', format: fmtBRL, icon: <Globe className="h-4 w-4" />, iconColor: 'text-neutral-400', tooltip: 'Custo médio por clique no link', higherIsBetter: false },
  { key: 'websiteViews', label: 'Visualizações do Site', group: 'Tráfego', format: fmtNumber, icon: <Globe className="h-4 w-4" />, iconColor: 'text-blue-500', tooltip: 'Número de visualizações de página de destino' },
  { key: 'videoViews', label: 'Visualizações de Vídeo', group: 'Tráfego', format: fmtNumber, icon: <Video className="h-4 w-4" />, iconColor: 'text-red-400', tooltip: 'Número de visualizações de vídeo (pelo menos 3 segundos)' },
  { key: 'frequency', label: 'Frequência', group: 'Tráfego', format: (v) => fmtMultiplier(v, 1), icon: <Zap className="h-4 w-4" />, iconColor: 'text-yellow-500', tooltip: 'Média de vezes que cada pessoa viu o anúncio', higherIsBetter: false },
  { key: 'pageEngagements', label: 'Engajamento de Página', group: 'Tráfego', format: fmtNumber, icon: <Heart className="h-4 w-4" />, iconColor: 'text-pink-500', tooltip: 'Total de engajamentos com a página (curtidas, comentários, etc.)' },
  { key: 'revenueByUtm', label: 'Receita por UTM', group: 'UTM', format: fmtBRL, icon: <TrendingUp className="h-4 w-4" />, iconColor: 'text-green-600', tooltip: 'Receita rastreada via parâmetros UTM' },
  { key: 'roardByUtm', label: 'ROAS por UTM', group: 'UTM', format: (v) => fmtMultiplier(v), icon: <BarChart2 className="h-4 w-4" />, iconColor: 'text-teal-500', tooltip: 'ROAS calculado com base nos dados UTM' },
  { key: 'resultsByUtm', label: 'Resultados por UTM', group: 'UTM', format: fmtNumber, icon: <Award className="h-4 w-4" />, iconColor: 'text-indigo-500', tooltip: 'Resultados rastreados via parâmetros UTM' },
]

// Métricas visíveis por padrão (curadas pra não poluir). O usuário ajusta no seletor.
export const DEFAULT_VISIBLE_METRICS: string[] = [
  'spend', 'results', 'costPerResult', 'leads', 'costPerLead',
  'roas', 'purchases', 'impressions', 'clicks', 'ctr', 'cpc', 'cpm',
]

export const METRIC_GROUPS: MetricDef['group'][] = ['Resultado', 'Custo', 'Tráfego', 'UTM']
