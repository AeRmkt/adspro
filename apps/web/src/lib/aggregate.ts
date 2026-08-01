import type { MetricInsights } from '@adspro/types'

// Soma as métricas de várias campanhas e recalcula os derivados (CPA, CTR, ROAS...).
// Usado quando o usuário filtra por campanha(s) — vira a base de "ler só essa campanha".
export function aggregateCampaignMetrics(insights: MetricInsights[]): MetricInsights {
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
    spend, impressions, clicks, reach, purchases, purchaseValue, addToCart, leads,
    conversations, linkClicks, websiteViews, videoViews, pageEngagements, results,
    revenueByUtm, resultsByUtm,
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
