import type { Campaign, MetricInsights, AdAccount, DailyInsight } from '@adspro/types'
import { fmtBRL, fmtPct, fmtMultiplier, fmtNumber } from './format'

export type Severity = 'critical' | 'warning' | 'good' | 'info'

export interface Insight {
  id: string
  severity: Severity
  title: string
  detail: string
}

const SEV_ORDER: Record<Severity, number> = { critical: 0, warning: 1, good: 2, info: 3 }

interface Ctx {
  campaigns: Campaign[]
  cur: MetricInsights | null | undefined
  prev: MetricInsights | null | undefined
  account: AdAccount | undefined
  daily: DailyInsight[]
}

// Motor de insights: converte números em sinais acionáveis (o "cérebro" do BI).
export function computeInsights({ campaigns, cur, prev, account }: Ctx): Insight[] {
  const out: Insight[] = []
  const totalSpend = cur?.spend ?? 0

  // 1. Saldo baixo — risco operacional imediato
  if (account?.balance != null && account.balance >= 0 && account.balance < 30) {
    out.push({
      id: 'saldo',
      severity: 'critical',
      title: 'Saldo da conta acabando',
      detail: `Restam ${fmtBRL(account.balance)}. As campanhas podem pausar sozinhas — recarregue para não perder tração.`,
    })
  }

  // 2. Vazamento de verba — campanha ativa gastando sem resultado
  const leaks = campaigns
    .filter((c) => c.status === 'ACTIVE' && c.insights && c.insights.spend >= Math.max(20, totalSpend * 0.03) && c.insights.results === 0)
    .sort((a, b) => (b.insights!.spend) - (a.insights!.spend))
  if (leaks.length) {
    const l = leaks[0]
    out.push({
      id: 'leak',
      severity: 'critical',
      title: 'Verba indo pro ralo',
      detail: `"${l.name}" gastou ${fmtBRL(l.insights!.spend)} e trouxe 0 resultado no período. Reveja ou pause.${leaks.length > 1 ? ` (+${leaks.length - 1} outra${leaks.length > 2 ? 's' : ''} na mesma situação)` : ''}`,
    })
  }

  // 3. Custo por resultado subindo vs período anterior
  if (cur?.costPerResult && prev?.costPerResult && prev.costPerResult > 0) {
    const delta = (cur.costPerResult - prev.costPerResult) / prev.costPerResult
    if (delta > 0.15) {
      out.push({
        id: 'cpa-up',
        severity: 'warning',
        title: 'Custo por resultado subindo',
        detail: `Seu custo por resultado subiu ${fmtPct(delta * 100)} vs o período anterior (${fmtBRL(prev.costPerResult)} → ${fmtBRL(cur.costPerResult)}). Vale investigar criativos e público.`,
      })
    } else if (delta < -0.15) {
      out.push({
        id: 'cpa-down',
        severity: 'good',
        title: 'Custo por resultado caindo',
        detail: `Ótimo: seu custo por resultado caiu ${fmtPct(Math.abs(delta) * 100)} (${fmtBRL(prev.costPerResult)} → ${fmtBRL(cur.costPerResult)}). O que mudou está funcionando.`,
      })
    }
  }

  // 4. Fadiga de público (frequência alta)
  if (cur?.frequency && cur.frequency > 3) {
    out.push({
      id: 'fatigue',
      severity: 'warning',
      title: 'Sinal de fadiga de público',
      detail: `Frequência média de ${fmtMultiplier(cur.frequency, 1)} — as mesmas pessoas estão vendo o anúncio muitas vezes. Renove criativos ou amplie o público.`,
    })
  }

  // 5. CTR baixo com gasto relevante
  if (cur && cur.ctr < 1 && cur.spend > 100) {
    out.push({
      id: 'ctr-low',
      severity: 'warning',
      title: 'CTR abaixo do saudável',
      detail: `CTR de ${fmtPct(cur.ctr)} (referência ~1%+). O criativo ou a segmentação não estão prendendo atenção.`,
    })
  }

  // 6. Melhor campanha (menor custo por resultado com volume)
  const winners = campaigns
    .filter((c) => c.insights && c.insights.results > 0 && c.insights.costPerResult != null && c.insights.spend > 0)
    .sort((a, b) => (a.insights!.costPerResult!) - (b.insights!.costPerResult!))
  if (winners.length) {
    const w = winners[0]
    out.push({
      id: 'winner',
      severity: 'good',
      title: 'Sua campanha mais eficiente',
      detail: `"${w.name}" está entregando ao menor custo: ${fmtBRL(w.insights!.costPerResult!)} por resultado (${fmtNumber(w.insights!.results)} resultados). Considere escalar.`,
    })
  }

  // 7. Concentração de verba
  if (campaigns.length > 1 && totalSpend > 0) {
    const top = [...campaigns].filter((c) => c.insights).sort((a, b) => b.insights!.spend - a.insights!.spend)[0]
    if (top && top.insights!.spend / totalSpend > 0.6) {
      out.push({
        id: 'concentration',
        severity: 'info',
        title: 'Verba concentrada em uma campanha',
        detail: `"${top.name}" concentra ${fmtPct((top.insights!.spend / totalSpend) * 100)} do investimento. Diversificar reduz risco se ela cair.`,
      })
    }
  }

  return out.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity])
}
