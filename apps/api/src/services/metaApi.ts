import type { FastifyBaseLogger } from 'fastify'
import type {
  MetaCampaign,
  MetaAdSet,
  MetaAd,
  MetaInsightsData,
  MetricInsights,
  DailyInsight,
  Campaign,
  AdSet,
  Ad,
} from '@adspro/types'
import { requestQueue } from './queue.js'

const META_API_BASE = 'https://graph.facebook.com/v19.0'
const RATE_LIMIT_CODES = [17, 80004, 4, 80000, 80001, 80002, 80003]

export interface MetaRawAdAccount {
  id: string             // "act_XXXXXXXX"
  name: string
  account_status: number // 1=ACTIVE 2=DISABLED 3=UNSETTLED 7=PENDING_RISK_REVIEW 101=CLOSED
  currency: string
  timezone_name: string
  spend_cap?: string
  amount_spent?: string
}

export class MetaTokenInvalidError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MetaTokenInvalidError'
  }
}

interface MetaApiPage<T> {
  data: T[]
  paging?: {
    cursors?: { after?: string }
    next?: string
  }
}

export class MetaApiService {
  private logger?: FastifyBaseLogger

  constructor(logger?: FastifyBaseLogger) {
    this.logger = logger
  }

  private async request<T>(
    endpoint: string,
    params: Record<string, string>,
    accessToken: string,
    retries = 3
  ): Promise<T> {
    const url = new URL(`${META_API_BASE}/${endpoint}`)
    url.searchParams.set('access_token', accessToken)
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v)
    }

    const start = Date.now()
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30_000)

      const res = await fetch(url.toString(), { signal: controller.signal })
      clearTimeout(timeout)
      const duration = Date.now() - start

      const json = await res.json() as { error?: { code?: number; message?: string } } & T

      if (json.error) {
        const code = json.error.code ?? 0
        const isRateLimit = RATE_LIMIT_CODES.includes(code)
        this.logger?.warn({ endpoint, code, duration }, `Meta API erro: ${json.error.message}`)

        if (code === 190) {
          throw new MetaTokenInvalidError(json.error.message ?? 'Token inválido ou expirado')
        }

        if (isRateLimit && retries > 0) {
          const delay = Math.pow(2, 4 - retries) * 1000 // exponential backoff
          this.logger?.info({ delay, retries }, 'Rate limit Meta API, aguardando...')
          await new Promise((r) => setTimeout(r, delay))
          return this.request<T>(endpoint, params, accessToken, retries - 1)
        }

        throw new Error(`Meta API erro ${code}: ${json.error.message}`)
      }

      this.logger?.debug({ endpoint, duration }, 'Meta API request concluído')
      return json
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        throw new Error(`Timeout na Meta API: ${endpoint}`)
      }
      throw err
    }
  }

  private async requestAllPages<T>(
    endpoint: string,
    params: Record<string, string>,
    accessToken: string
  ): Promise<T[]> {
    const allData: T[] = []
    let afterCursor: string | undefined

    do {
      const pageParams = { ...params }
      if (afterCursor) pageParams['after'] = afterCursor

      const page = await this.request<MetaApiPage<T>>(endpoint, pageParams, accessToken)
      allData.push(...page.data)
      afterCursor = page.paging?.cursors?.after
    } while (afterCursor)

    return allData
  }

  private parseInsights(data: MetaInsightsData): MetricInsights {
    const num = (v: string | undefined) => parseFloat(v || '0') || 0

    const getAction = (actions: { action_type: string; value: string }[] | undefined, type: string) =>
      num(actions?.find((a) => a.action_type === type)?.value)

    const spend = num(data.spend)
    const impressions = num(data.impressions)
    const clicks = num(data.clicks)
    const reach = num(data.reach)
    const frequency = num(data.frequency)
    const ctr = num(data.ctr)
    const cpm = num(data.cpm)
    const cpp = num(data.cpp)
    const cpc = num(data.cpc)

    const purchases = getAction(data.actions, 'purchase')
    const purchaseValue = getAction(data.action_values, 'purchase')
    const addToCart = getAction(data.actions, 'add_to_cart')
    const leads = getAction(data.actions, 'lead')
    const conversations = getAction(data.actions, 'onsite_conversion.messaging_conversation_started_7d')
    const pageEngagements = getAction(data.actions, 'page_engagement')
    const videoViews = getAction(data.actions, 'video_view')

    const linkClicks = getAction(data.outbound_clicks, 'outbound_click') || getAction(data.actions, 'link_click')
    const websiteViews = getAction(data.actions, 'landing_page_view')

    const roas = purchaseValue > 0 && spend > 0 ? purchaseValue / spend : 0
    const costPerPurchase = purchases > 0 ? spend / purchases : null
    const costPerLead = leads > 0 ? spend / leads : null
    const costPerConversation = conversations > 0 ? spend / conversations : null
    const costPerResult = (purchases || leads) > 0 ? spend / (purchases || leads) : null
    const ticketAverage = purchases > 0 ? purchaseValue / purchases : null

    const ctrLink = num(data.outbound_clicks_ctr?.find((a) => a.action_type === 'outbound_click')?.value)
    const cpcLink = linkClicks > 0 ? spend / linkClicks : 0

    return {
      spend,
      impressions,
      clicks,
      reach,
      frequency,
      ctr,
      cpm,
      cpp,
      cpc,
      purchases,
      purchaseValue,
      roas,
      addToCart,
      leads,
      costPerLead,
      costPerPurchase,
      linkClicks,
      ctrLink,
      cpcLink,
      websiteViews,
      videoViews,
      pageEngagements,
      conversations,
      costPerConversation,
      results: purchases || leads || 0,
      costPerResult,
      revenueByUtm: purchaseValue,
      roardByUtm: roas,
      resultsByUtm: purchases || leads || 0,
      ticketAverage,
    }
  }

  async getCampaigns(accessToken: string, adAccountId: string, dateFrom: string, dateTo: string): Promise<Campaign[]> {
    const insightsFields = 'spend,impressions,clicks,reach,frequency,ctr,cpm,cpp,cpc,actions,action_values,cost_per_action_type,outbound_clicks,outbound_clicks_ctr'

    const raw = await requestQueue.enqueue(
      accessToken.slice(0, 20),
      () => this.requestAllPages<MetaCampaign>(
        `act_${adAccountId}/campaigns`,
        {
          fields: `id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time,insights.time_range({"since":"${dateFrom}","until":"${dateTo}"}){${insightsFields}}`,
          limit: '100',
        },
        accessToken
      ),
      10
    )

    return raw.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status as Campaign['status'],
      objective: c.objective,
      dailyBudget: c.daily_budget ? parseFloat(c.daily_budget) / 100 : null,
      lifetimeBudget: c.lifetime_budget ? parseFloat(c.lifetime_budget) / 100 : null,
      startTime: c.start_time || null,
      stopTime: c.stop_time || null,
      insights: c.insights?.data?.[0] ? this.parseInsights(c.insights.data[0]) : null,
    }))
  }

  async getAdSets(accessToken: string, adAccountId: string, dateFrom: string, dateTo: string, campaignId?: string): Promise<AdSet[]> {
    const insightsFields = 'spend,impressions,clicks,reach,frequency,ctr,cpm,cpp,cpc,actions,action_values,cost_per_action_type,outbound_clicks,outbound_clicks_ctr'
    const endpoint = campaignId ? `${campaignId}/adsets` : `act_${adAccountId}/adsets`

    const raw = await requestQueue.enqueue(
      accessToken.slice(0, 20),
      () => this.requestAllPages<MetaAdSet>(
        endpoint,
        {
          fields: `id,campaign_id,name,status,daily_budget,lifetime_budget,targeting,insights.time_range({"since":"${dateFrom}","until":"${dateTo}"}){${insightsFields}}`,
          limit: '100',
        },
        accessToken
      ),
      8
    )

    return raw.map((s) => {
      const targeting = s.targeting as Record<string, unknown> | undefined
      return {
        id: s.id,
        campaignId: s.campaign_id,
        name: s.name,
        status: s.status as AdSet['status'],
        dailyBudget: s.daily_budget ? parseFloat(s.daily_budget) / 100 : null,
        lifetimeBudget: s.lifetime_budget ? parseFloat(s.lifetime_budget) / 100 : null,
        targeting: targeting ? {
          ageMin: (targeting.age_min as number) || null,
          ageMax: (targeting.age_max as number) || null,
          genders: ((targeting.genders as number[]) || []).map((g) => g === 1 ? 'Masculino' : 'Feminino'),
          locations: ((targeting.geo_locations as { countries?: string[] })?.countries || []),
        } : null,
        insights: s.insights?.data?.[0] ? this.parseInsights(s.insights.data[0]) : null,
      }
    })
  }

  async getAds(accessToken: string, adAccountId: string, dateFrom: string, dateTo: string, adsetId?: string): Promise<Ad[]> {
    const insightsFields = 'spend,impressions,clicks,reach,frequency,ctr,cpm,cpp,cpc,actions,action_values,cost_per_action_type,outbound_clicks,outbound_clicks_ctr'
    const endpoint = adsetId ? `${adsetId}/ads` : `act_${adAccountId}/ads`

    const raw = await requestQueue.enqueue(
      accessToken.slice(0, 20),
      () => this.requestAllPages<MetaAd>(
        endpoint,
        {
          fields: `id,adset_id,name,status,creative{thumbnail_url,title,body,call_to_action_type},insights.time_range({"since":"${dateFrom}","until":"${dateTo}"}){${insightsFields}}`,
          limit: '100',
        },
        accessToken
      ),
      5
    )

    return raw.map((a) => ({
      id: a.id,
      adsetId: a.adset_id,
      name: a.name,
      status: a.status as Ad['status'],
      creative: a.creative ? {
        thumbnailUrl: a.creative.thumbnail_url || null,
        title: a.creative.title || null,
        body: a.creative.body || null,
        callToAction: a.creative.call_to_action_type || null,
      } : null,
      insights: a.insights?.data?.[0] ? this.parseInsights(a.insights.data[0]) : null,
    }))
  }

  async getDailyInsights(accessToken: string, adAccountId: string, dateFrom: string, dateTo: string): Promise<DailyInsight[]> {
    const data = await requestQueue.enqueue(
      accessToken.slice(0, 20),
      () => this.requestAllPages<MetaInsightsData>(
        `act_${adAccountId}/insights`,
        {
          fields: 'spend,impressions,clicks,reach,actions,action_values,outbound_clicks',
          time_increment: '1',
          time_range: JSON.stringify({ since: dateFrom, until: dateTo }),
          limit: '90',
        },
        accessToken
      ),
      10
    )

    return data.map((d) => {
      const num = (v: string | undefined) => parseFloat(v || '0') || 0
      const getAction = (actions: { action_type: string; value: string }[] | undefined, type: string) =>
        num(actions?.find((a) => a.action_type === type)?.value)

      const spend = num(d.spend)
      const purchaseValue = getAction(d.action_values, 'purchase')
      const purchases = getAction(d.actions, 'purchase')

      return {
        date: d.date_start,
        spend,
        impressions: num(d.impressions),
        clicks: num(d.clicks),
        reach: num(d.reach),
        purchases,
        purchaseValue,
        roas: purchaseValue > 0 && spend > 0 ? purchaseValue / spend : 0,
        leads: getAction(d.actions, 'lead'),
        conversations: getAction(d.actions, 'onsite_conversion.messaging_conversation_started_7d'),
      }
    })
  }

  async getAggregatedMetrics(accessToken: string, adAccountId: string, dateFrom: string, dateTo: string): Promise<MetricInsights> {
    const data = await requestQueue.enqueue(
      accessToken.slice(0, 20),
      () => this.request<{ data: MetaInsightsData[] }>(
        `act_${adAccountId}/insights`,
        {
          fields: 'spend,impressions,clicks,reach,frequency,ctr,cpm,cpp,cpc,actions,action_values,cost_per_action_type,outbound_clicks,outbound_clicks_ctr,website_ctr',
          time_range: JSON.stringify({ since: dateFrom, until: dateTo }),
        },
        accessToken
      ),
      10
    )

    if (!data.data || data.data.length === 0) {
      return this.parseInsights({
        spend: '0', impressions: '0', clicks: '0', reach: '0',
        frequency: '0', ctr: '0', cpm: '0', cpp: '0', cpc: '0',
        date_start: dateFrom, date_stop: dateTo,
      })
    }

    return this.parseInsights(data.data[0])
  }

  async getAdAccounts(accessToken: string): Promise<MetaRawAdAccount[]> {
    return this.requestAllPages<MetaRawAdAccount>(
      'me/adaccounts',
      { fields: 'id,name,account_status,currency,timezone_name,spend_cap,amount_spent', limit: '100' },
      accessToken
    )
  }

  async validateToken(accessToken: string, adAccountId: string): Promise<{ valid: boolean; accountName: string }> {
    try {
      const data = await this.request<{ name: string; id: string }>(
        `act_${adAccountId}`,
        { fields: 'name,id,account_status' },
        accessToken
      )
      return { valid: true, accountName: data.name }
    } catch {
      return { valid: false, accountName: '' }
    }
  }
}

export const metaApiService = new MetaApiService()
