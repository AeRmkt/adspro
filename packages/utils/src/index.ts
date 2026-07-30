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

export type DatePresetKey =
  | 'today' | 'yesterday' | 'last7' | 'last14' | 'last30' | 'thisMonth' | 'lastMonth'

/**
 * Fuso padrão das contas (o Gerenciador de Anúncios reporta no fuso da conta).
 * Usar UTC aqui desloca o período em 1 dia e faz os números divergirem do Meta.
 */
export const ACCOUNT_TIMEZONE = 'America/Sao_Paulo'

/** "YYYY-MM-DD" no fuso informado (nunca em UTC). */
export function formatDateInTz(d: Date, timeZone = ACCOUNT_TIMEZONE): string {
  // en-CA já produz YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

/**
 * Presets de período (retorna datas no formato YYYY-MM-DD, no fuso da conta).
 */
export function getDatePreset(preset: DatePresetKey, timeZone = ACCOUNT_TIMEZONE): { from: string; to: string } {
  // Descobre que dia é "hoje" no fuso da conta e passa a tratar tudo como data
  // de calendário ancorada em UTC-meia-noite. A partir daqui a formatação é
  // sempre UTC — reconverter para o fuso deslocaria o dia de volta.
  const [y, m, dd] = formatDateInTz(new Date(), timeZone).split('-').map(Number)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const today = new Date(Date.UTC(y, m - 1, dd))
  const shift = (days: number) => new Date(Date.UTC(y, m - 1, dd + days))

  switch (preset) {
    case 'today': {
      const f = fmt(today)
      return { from: f, to: f }
    }
    case 'yesterday': {
      const f = fmt(shift(-1))
      return { from: f, to: f }
    }
    case 'last7':
      return { from: fmt(shift(-6)), to: fmt(today) }
    case 'last14':
      return { from: fmt(shift(-13)), to: fmt(today) }
    case 'last30':
      return { from: fmt(shift(-29)), to: fmt(today) }
    case 'thisMonth':
      return { from: fmt(new Date(Date.UTC(y, m - 1, 1))), to: fmt(today) }
    case 'lastMonth':
      return {
        from: fmt(new Date(Date.UTC(y, m - 2, 1))),
        to: fmt(new Date(Date.UTC(y, m - 1, 0))),
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
