import { getAccessToken, supabase } from './auth'
import type {
  AdAccount,
  Campaign,
  AdSet,
  Ad,
  MetricInsights,
  DailyInsight,
  CompareResult,
  Report,
  ConnectMetaRequest,
  ConnectMetaResponse,
  GenerateReportRequest,
  MetaOAuthUrlResponse,
  MetaConnectionStatus,
  MetaDisconnectResponse,
  MetaAdAccount,
} from '@adspro/types'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken()

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (res.status === 401) {
    // Token expirado: redireciona para login
    await supabase.auth.signOut()
    window.location.href = '/login'
    throw new ApiError(401, 'Sessão expirada. Faça login novamente.')
  }

  if (res.status === 429) {
    throw new ApiError(429, 'Muitas requisições. Aguarde alguns instantes antes de tentar novamente.', 'RATE_LIMIT')
  }

  const data = await res.json()

  if (!res.ok) {
    throw new ApiError(res.status, data.error || 'Erro na requisição', data.code)
  }

  return data as T
}

// ─── Contas ───────────────────────────────────────────────────────────────────

export async function getAccounts(): Promise<AdAccount[]> {
  const res = await request<{ data: AdAccount[] }>('/api/accounts')
  return res.data
}

export async function connectMeta(body: ConnectMetaRequest): Promise<ConnectMetaResponse> {
  return request<ConnectMetaResponse>('/api/auth/connect-meta', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function deleteAccount(id: string): Promise<void> {
  await request(`/api/accounts/${id}`, { method: 'DELETE' })
}

export async function invalidateCache(accountId: string): Promise<void> {
  await request(`/api/accounts/cache/invalidate/${accountId}`, { method: 'POST' })
}

export async function getMetaOAuthUrl(): Promise<MetaOAuthUrlResponse> {
  return request<MetaOAuthUrlResponse>('/api/auth/meta/url')
}

export async function getMetaStatus(): Promise<MetaConnectionStatus> {
  return request<MetaConnectionStatus>('/api/auth/meta/status')
}

export async function disconnectMeta(): Promise<MetaDisconnectResponse> {
  return request<MetaDisconnectResponse>('/api/auth/meta', { method: 'DELETE' })
}

export async function getMetaAdAccounts(): Promise<MetaAdAccount[]> {
  const res = await request<{ data: MetaAdAccount[] }>('/api/meta/ad-accounts')
  return res.data
}

// ─── Campanhas ───────────────────────────────────────────────────────────────

export async function getCampaigns(
  accountId: string,
  from: string,
  to: string
): Promise<Campaign[]> {
  const params = new URLSearchParams({ accountId, from, to })
  const res = await request<{ data: Campaign[] }>(`/api/campaigns?${params}`)
  return res.data
}

// ─── Conjuntos de Anúncios ───────────────────────────────────────────────────

export async function getAdSets(
  accountId: string,
  from: string,
  to: string,
  campaignId?: string
): Promise<AdSet[]> {
  const params = new URLSearchParams({ accountId, from, to })
  if (campaignId) params.set('campaignId', campaignId)
  const res = await request<{ data: AdSet[] }>(`/api/adsets?${params}`)
  return res.data
}

// ─── Anúncios ─────────────────────────────────────────────────────────────────

export async function getAds(
  accountId: string,
  from: string,
  to: string,
  adsetId?: string
): Promise<Ad[]> {
  const params = new URLSearchParams({ accountId, from, to })
  if (adsetId) params.set('adsetId', adsetId)
  const res = await request<{ data: Ad[] }>(`/api/ads?${params}`)
  return res.data
}

// ─── Insights ─────────────────────────────────────────────────────────────────

export async function getMetrics(
  accountId: string,
  from: string,
  to: string
): Promise<MetricInsights> {
  const params = new URLSearchParams({ accountId, from, to })
  const res = await request<{ data: MetricInsights }>(`/api/insights/metrics?${params}`)
  return res.data
}

export async function getDailyInsights(
  accountId: string,
  from: string,
  to: string
): Promise<DailyInsight[]> {
  const params = new URLSearchParams({ accountId, from, to })
  const res = await request<{ data: DailyInsight[] }>(`/api/insights/daily?${params}`)
  return res.data
}

export async function compareInsights(
  accountId: string,
  from1: string,
  to1: string,
  from2: string,
  to2: string
): Promise<CompareResult> {
  const params = new URLSearchParams({ accountId, from1, to1, from2, to2 })
  const res = await request<{ data: CompareResult }>(`/api/insights/compare?${params}`)
  return res.data
}

// ─── Relatórios ───────────────────────────────────────────────────────────────

export async function generateReport(body: GenerateReportRequest): Promise<{ reportId: string }> {
  return request<{ reportId: string }>('/api/reports/generate', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function getReports(): Promise<Report[]> {
  const res = await request<{ data: Report[] }>('/api/reports')
  return res.data
}

export async function getReportDownload(id: string): Promise<{ downloadUrl: string }> {
  return request<{ downloadUrl: string }>(`/api/reports/${id}/download`)
}
