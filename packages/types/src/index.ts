// ─── Usuário ─────────────────────────────────────────────────────────────────
export interface User {
  id: string
  supabaseId: string
  email: string
  name: string | null
  plan: 'trial' | 'pro' | 'enterprise'
  trialEndsAt: string | null
  createdAt: string
}

// ─── Conta de Anúncio ─────────────────────────────────────────────────────────
export interface AdAccount {
  id: string
  userId: string
  metaAccountId: string
  accountName: string
  currency: string
  timezone: string
  isActive: boolean
  connectedAt: string
  lastSyncAt: string | null
}

// ─── Campanha ─────────────────────────────────────────────────────────────────
export type CampaignStatus = 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED' | 'IN_PROCESS' | 'WITH_ISSUES'

export interface Campaign {
  id: string
  name: string
  status: CampaignStatus
  objective: string
  dailyBudget: number | null
  lifetimeBudget: number | null
  startTime: string | null
  stopTime: string | null
  insights: MetricInsights | null
}

// ─── Conjunto de Anúncios ─────────────────────────────────────────────────────
export interface AdSet {
  id: string
  campaignId: string
  name: string
  status: CampaignStatus
  dailyBudget: number | null
  lifetimeBudget: number | null
  targeting: TargetingSummary | null
  insights: MetricInsights | null
}

export interface TargetingSummary {
  ageMin: number | null
  ageMax: number | null
  genders: string[]
  locations: string[]
}

// ─── Anúncio ─────────────────────────────────────────────────────────────────
export interface Ad {
  id: string
  adsetId: string
  name: string
  status: CampaignStatus
  creative: AdCreative | null
  insights: MetricInsights | null
}

export interface AdCreative {
  thumbnailUrl: string | null
  title: string | null
  body: string | null
  callToAction: string | null
}

// ─── Insights e Métricas ──────────────────────────────────────────────────────
export interface MetricInsights {
  spend: number
  impressions: number
  clicks: number
  reach: number
  frequency: number
  ctr: number
  cpm: number
  cpp: number
  cpc: number
  purchases: number
  purchaseValue: number
  roas: number
  addToCart: number
  leads: number
  costPerLead: number | null
  costPerPurchase: number | null
  linkClicks: number
  ctrLink: number
  cpcLink: number
  websiteViews: number
  videoViews: number
  pageEngagements: number
  conversations: number
  costPerConversation: number | null
  results: number
  costPerResult: number | null
  revenueByUtm: number
  roardByUtm: number
  resultsByUtm: number
  ticketAverage: number | null
}

export interface DailyInsight {
  date: string
  spend: number
  impressions: number
  clicks: number
  reach: number
  purchases: number
  purchaseValue: number
  roas: number
  leads: number
  conversations: number
}

export interface ComparePeriod {
  from: string
  to: string
}

export interface CompareResult {
  period1: { from: string; to: string; metrics: MetricInsights }
  period2: { from: string; to: string; metrics: MetricInsights }
  deltas: Record<keyof MetricInsights, number>
}

// ─── Relatório ────────────────────────────────────────────────────────────────
export type ReportStatus = 'pending' | 'processing' | 'done' | 'error'
export type ReportType = 'pdf' | 'csv'

export interface Report {
  id: string
  userId: string
  adAccountId: string
  name: string
  dateFrom: string
  dateTo: string
  type: ReportType
  fileUrl: string | null
  status: ReportStatus
  createdAt: string
}

// ─── API Request/Response ─────────────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface ApiError {
  error: string
  code?: string
  statusCode: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export interface DateRange {
  from: string
  to: string
}

export interface ConnectMetaRequest {
  accessToken: string
  adAccountId: string
}

export interface ConnectMetaResponse {
  success: boolean
  accountName: string
}

export interface GenerateReportRequest {
  accountId: string
  dateFrom: string
  dateTo: string
  type: ReportType
  name: string
}

export interface GenerateReportResponse {
  reportId: string
}

// ─── Meta API ─────────────────────────────────────────────────────────────────
export interface MetaApiAction {
  action_type: string
  value: string
}

export interface MetaInsightsData {
  spend: string
  impressions: string
  clicks: string
  reach: string
  frequency: string
  ctr: string
  cpm: string
  cpp: string
  cpc: string
  actions?: MetaApiAction[]
  action_values?: MetaApiAction[]
  cost_per_action_type?: MetaApiAction[]
  website_ctr?: MetaApiAction[]
  outbound_clicks?: MetaApiAction[]
  outbound_clicks_ctr?: MetaApiAction[]
  date_start: string
  date_stop: string
}

export interface MetaCampaign {
  id: string
  name: string
  status: string
  objective: string
  daily_budget?: string
  lifetime_budget?: string
  start_time?: string
  stop_time?: string
  insights?: { data: MetaInsightsData[] }
}

export interface MetaAdSet {
  id: string
  campaign_id: string
  name: string
  status: string
  daily_budget?: string
  lifetime_budget?: string
  targeting?: Record<string, unknown>
  insights?: { data: MetaInsightsData[] }
}

export interface MetaAd {
  id: string
  adset_id: string
  name: string
  status: string
  creative?: {
    thumbnail_url?: string
    title?: string
    body?: string
    call_to_action_type?: string
  }
  insights?: { data: MetaInsightsData[] }
}
