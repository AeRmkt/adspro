// MODO DEMO — preview no localhost sem login/backend. Ativado por VITE_DEMO=true.
// Nao afeta producao: se VITE_DEMO != 'true', isDemo=false e nada disso roda.

export const isDemo = import.meta.env.VITE_DEMO === 'true'

const future = new Date(Date.now() + 60 * 864e5).toISOString()
const nowIso = new Date().toISOString()

const M = (o: Record<string, unknown> = {}) => ({
  spend: 0, impressions: 0, clicks: 0, reach: 0, purchases: 0, purchaseValue: 0,
  addToCart: 0, leads: 0, conversations: 0, linkClicks: 0, websiteViews: 0,
  videoViews: 0, pageEngagements: 0, results: 0, revenueByUtm: 0, resultsByUtm: 0,
  roas: 0, roardByUtm: 0, ctr: 0, ctrLink: 0, cpm: 0, cpp: 0, cpc: 0, cpcLink: 0,
  frequency: 0, costPerPurchase: null, costPerLead: null, costPerConversation: null,
  costPerResult: null, ticketAverage: null, ...o,
})

const account = {
  id: '1441341424027463', metaAccountId: '1441341424027463', accountName: 'Grupo 7Otoni',
  currency: 'BRL', timezone: 'America/Sao_Paulo', accountStatus: 1, isActive: true,
  balance: 18.5, amountSpent: 312480, spendCap: null,
  source: 'oauth', connectedAt: nowIso, lastSyncAt: nowIso,
}

const total = M({
  spend: 312480, impressions: 8240000, clicks: 198500, reach: 5430000, purchases: 2854,
  purchaseValue: 1843200, addToCart: 14300, leads: 318, linkClicks: 198500, results: 2854,
  revenueByUtm: 1843200, resultsByUtm: 2854, roas: 5.9, roardByUtm: 5.9, ctr: 2.41,
  ctrLink: 2.41, cpm: 37.92, cpp: 57.55, cpc: 1.57, cpcLink: 1.57, frequency: 1.52,
  costPerPurchase: 109.49, costPerResult: 109.49, ticketAverage: 645.83,
})

const prev = M({
  spend: 264000, impressions: 6750000, clicks: 166800, reach: 4600000, purchases: 2230,
  purchaseValue: 1374000, leads: 255, linkClicks: 166800, results: 2230, revenueByUtm: 1374000,
  resultsByUtm: 2230, roas: 5.2, roardByUtm: 5.2, ctr: 2.27, ctrLink: 2.27, cpm: 39.1,
  cpc: 1.58, cpcLink: 1.58, frequency: 1.47, costPerPurchase: 118.39, costPerResult: 118.39,
  ticketAverage: 616.14,
})

// frequência alta no período atual → dispara o alerta de fadiga de público
total.frequency = 3.34

const campaign = (id: string, name: string, objective: string, o: Record<string, unknown>) => ({
  id, name, status: 'ACTIVE', effectiveStatus: 'ACTIVE', objective,
  dailyBudget: null, lifetimeBudget: null, insights: M(o),
})

const campaigns = [
  campaign('c1', '[VENDAS] Black Friday · Advantage+', 'OUTCOME_SALES',
    { spend: 98400, purchaseValue: 684200, purchases: 1012, roas: 6.95, impressions: 2480000, clicks: 64200, ctr: 2.59, cpc: 1.53, cpm: 39.68, costPerPurchase: 97.23, costPerResult: 97.23, ticketAverage: 676.1, results: 1012, reach: 1720000, frequency: 1.44 }),
  campaign('c2', '[VENDAS] Remarketing 30 dias', 'OUTCOME_SALES',
    { spend: 52700, purchaseValue: 489300, purchases: 742, roas: 9.28, impressions: 1180000, clicks: 41300, ctr: 3.5, cpc: 1.28, cpm: 44.66, costPerPurchase: 71.02, costPerResult: 71.02, ticketAverage: 659.43, results: 742, reach: 690000, frequency: 1.71 }),
  campaign('c3', '[VENDAS] Broad · Aquisição', 'OUTCOME_SALES',
    { spend: 84300, purchaseValue: 386500, purchases: 560, roas: 4.58, impressions: 2620000, clicks: 52800, ctr: 2.02, cpc: 1.6, cpm: 32.17, costPerPurchase: 150.54, costPerResult: 150.54, ticketAverage: 690.18, results: 560, reach: 1980000, frequency: 1.32 }),
  campaign('c4', '[LEADS] Captação Topo de Funil', 'OUTCOME_LEADS',
    { spend: 41800, purchaseValue: 182400, purchases: 318, roas: 4.36, impressions: 1340000, clicks: 28900, ctr: 2.16, cpc: 1.45, cpm: 31.19, costPerPurchase: 131.45, costPerResult: 131.45, ticketAverage: 573.58, leads: 318, results: 318, reach: 980000, frequency: 1.37 }),
  campaign('c5', '[VENDAS] Lookalike Compradores 1%', 'OUTCOME_SALES',
    { spend: 35280, purchaseValue: 100800, purchases: 222, roas: 2.86, impressions: 620000, clicks: 11300, ctr: 1.82, cpc: 3.12, cpm: 56.9, costPerPurchase: 158.92, costPerResult: 158.92, ticketAverage: 454.05, results: 222, reach: 460000, frequency: 1.35 }),
  // Campanha "vazando verba": gastando sem nenhum resultado → alerta crítico
  campaign('c6', '[TESTE] Público Frio · Criativo NOVO', 'OUTCOME_SALES',
    { spend: 22850, purchaseValue: 0, purchases: 0, roas: 0, impressions: 540000, clicks: 6100, ctr: 1.13, cpc: 3.74, cpm: 42.31, costPerPurchase: null, ticketAverage: null, results: 0, reach: 430000, frequency: 1.26 }),
]

// 30 dias de série temporal subindo
const daily = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(Date.now() - (29 - i) * 864e5)
  const g = 0.55 + (i / 29) * 0.9 // fator crescente
  const spend = Math.round(7000 * g + (i % 3) * 380)
  return {
    date: d.toISOString().slice(0, 10),
    spend,
    impressions: Math.round(spend * 26.4),
    clicks: Math.round(spend * 0.63),
    purchases: Math.round(spend * 0.0091),
    purchaseValue: Math.round(spend * 5.9),
    revenueByUtm: Math.round(spend * 5.9),
    leads: Math.round(spend * 0.001),
  }
})

const metaStatus = {
  connected: true,
  connection: {
    id: '1', userId: 'demo', fbUserId: '1', fbUserName: 'Gabriel Otoni',
    fbUserEmail: 'seteotoni@gmail.com', tokenExpiresAt: future, tokenInvalid: false,
    createdAt: nowIso, updatedAt: nowIso,
  },
}

function isPreviousPeriod(path: string): boolean {
  const m = path.match(/[?&]to=([0-9]{4}-[0-9]{2}-[0-9]{2})/)
  if (!m) return false
  const until = new Date(m[1]).getTime()
  return until < Date.now() - 20 * 864e5
}

export function demoResponse(path: string, method = 'GET'): unknown {
  if (method !== 'GET') return { ok: true, success: true }
  if (path.startsWith('/api/accounts')) return { data: [account] }
  if (path.includes('/api/auth/meta/status')) return metaStatus
  if (path.startsWith('/api/campaigns')) return { data: campaigns }
  if (path.startsWith('/api/insights/metrics')) return { data: isPreviousPeriod(path) ? prev : total }
  if (path.startsWith('/api/insights/daily')) return { data: daily }
  if (path.startsWith('/api/insights/compare')) return { data: { current: total, previous: prev } }
  if (path.startsWith('/api/meta/ad-accounts')) return { data: [account] }
  if (path.startsWith('/api/business-managers')) return []
  if (path.startsWith('/api/reports')) return { data: [] }
  if (path.startsWith('/api/instagram')) return []
  if (path.startsWith('/api/adsets')) return { data: [] }
  if (path.startsWith('/api/ads')) return { data: [] }
  return { data: [] }
}
