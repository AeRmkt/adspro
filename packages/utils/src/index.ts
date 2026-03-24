// ─── Formatadores de Moeda ────────────────────────────────────────────────────

/**
 * Formata valor em Reais (BRL)
 * Ex: 1234.56 → "R$ 1.234,56"
 */
export function fmtBRL(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Formata número compacto (K, M)
 * Ex: 1234567 → "1,2M"
 */
export function fmtNumber(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '0'
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}M`
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}K`
  }
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

/**
 * Formata porcentagem
 * Ex: 0.0354 → "3,54%"
 */
export function fmtPct(value: number | null | undefined, decimals = 2): string {
  if (value == null || isNaN(value)) return '0%'
  return `${value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}%`
}

/**
 * Formata multiplicador (ROAS)
 * Ex: 3.45 → "3,45x"
 */
export function fmtMultiplier(value: number | null | undefined, decimals = 2): string {
  if (value == null || isNaN(value)) return '0x'
  return `${value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}x`
}

/**
 * Formata delta percentual com sinal
 * Ex: 0.15 → "+15,00%" | -0.08 → "-8,00%"
 */
export function fmtDelta(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '0%'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${fmtPct(value)}`
}

// ─── Helpers de Data ──────────────────────────────────────────────────────────

/**
 * Formata data para exibição
 * Ex: "2024-01-15" → "15/01/2024"
 */
export function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

/**
 * Calcula delta percentual entre dois valores
 * Ex: (150, 100) → 0.5 (50%)
 */
export function calcDelta(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 1 : 0
  return (current - previous) / Math.abs(previous)
}

/**
 * Retorna período anterior com o mesmo intervalo
 */
export function getPreviousPeriod(from: string, to: string): { from: string; to: string } {
  const fromDate = new Date(from)
  const toDate = new Date(to)
  const diffMs = toDate.getTime() - fromDate.getTime()
  const prevTo = new Date(fromDate.getTime() - 1)
  const prevFrom = new Date(prevTo.getTime() - diffMs)
  return {
    from: prevFrom.toISOString().split('T')[0],
    to: prevTo.toISOString().split('T')[0],
  }
}

/**
 * Presets de período (retorna datas no formato YYYY-MM-DD)
 */
export function getDatePreset(preset: 'today' | 'yesterday' | 'last7' | 'last14' | 'last30' | 'thisMonth' | 'lastMonth'): { from: string; to: string } {
  const today = new Date()
  const fmt = (d: Date) => d.toISOString().split('T')[0]

  switch (preset) {
    case 'today': {
      const f = fmt(today)
      return { from: f, to: f }
    }
    case 'yesterday': {
      const y = new Date(today)
      y.setDate(y.getDate() - 1)
      const f = fmt(y)
      return { from: f, to: f }
    }
    case 'last7': {
      const from = new Date(today)
      from.setDate(from.getDate() - 6)
      return { from: fmt(from), to: fmt(today) }
    }
    case 'last14': {
      const from = new Date(today)
      from.setDate(from.getDate() - 13)
      return { from: fmt(from), to: fmt(today) }
    }
    case 'last30': {
      const from = new Date(today)
      from.setDate(from.getDate() - 29)
      return { from: fmt(from), to: fmt(today) }
    }
    case 'thisMonth': {
      const from = new Date(today.getFullYear(), today.getMonth(), 1)
      return { from: fmt(from), to: fmt(today) }
    }
    case 'lastMonth': {
      const from = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const to = new Date(today.getFullYear(), today.getMonth(), 0)
      return { from: fmt(from), to: fmt(to) }
    }
  }
}

// ─── Helpers de Cálculo de Métricas ──────────────────────────────────────────

export function safeDiv(numerator: number, denominator: number): number {
  if (!denominator || isNaN(denominator)) return 0
  return numerator / denominator
}

export function calcRoas(purchaseValue: number, spend: number): number {
  return safeDiv(purchaseValue, spend)
}

export function calcCpa(spend: number, conversions: number): number {
  return safeDiv(spend, conversions)
}

export function calcCpm(spend: number, impressions: number): number {
  return safeDiv(spend * 1000, impressions)
}

export function calcCtr(clicks: number, impressions: number): number {
  return safeDiv(clicks * 100, impressions)
}
