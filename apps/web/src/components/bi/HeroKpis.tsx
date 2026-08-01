import { TrendingUp, TrendingDown, DollarSign, Target, Coins, Percent } from 'lucide-react'
import { useEffectiveMetrics } from '../../hooks/useEffectiveMetrics'
import { useDailyInsights } from '../../hooks/useDailyInsights'
import { MagicCard } from '../ui/MagicCard'
import { NumberTicker } from '../ui/NumberTicker'
import { Sparkline } from '../ui/Sparkline'
import { Skeleton } from '../ui/Skeleton'
import { cn } from '../../lib/utils'
import { fmtBRL, fmtNumber, fmtMultiplier, calcDelta } from '../../lib/format'

interface Kpi {
  key: string
  label: string
  icon: React.ReactNode
  value: number | null
  prev: number | null
  format: (n: number) => string
  series: number[]
  higherIsBetter: boolean
  color: string
  neutral?: boolean
}

function DeltaChip({ delta, higherIsBetter, neutral }: { delta: number | null; higherIsBetter: boolean; neutral?: boolean }) {
  if (delta == null || !Number.isFinite(delta)) return null
  const up = delta >= 0
  const good = neutral ? null : higherIsBetter ? up : !up
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold',
      good == null ? 'bg-muted text-muted-foreground' : good ? 'bg-emerald-500/12 text-emerald-500' : 'bg-red-500/12 text-red-500',
    )}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? '+' : ''}{(delta * 100).toFixed(1)}%
    </span>
  )
}

export function HeroKpis() {
  const { data: cur, previous: prev, filtered, isLoading } = useEffectiveMetrics()
  const { data: daily } = useDailyInsights()
  const d = filtered ? [] : (daily ?? []) // série diária só no nível da conta

  const resultsDay = d.map((x) => (x.purchases || 0) + (x.leads || 0))
  const cprDay = d.map((x) => { const r = (x.purchases || 0) + (x.leads || 0); return r > 0 ? x.spend / r : 0 })

  const kpis: Kpi[] = [
    { key: 'spend', label: 'Investido', icon: <DollarSign className="h-4 w-4" />, value: cur?.spend ?? null, prev: prev?.spend ?? null, format: fmtBRL, series: d.map((x) => x.spend), higherIsBetter: true, neutral: true, color: 'hsl(221 83% 60%)' },
    { key: 'results', label: 'Resultados', icon: <Target className="h-4 w-4" />, value: cur?.results ?? null, prev: prev?.results ?? null, format: fmtNumber, series: resultsDay, higherIsBetter: true, color: 'hsl(142 71% 45%)' },
    { key: 'cpr', label: 'Custo / Resultado', icon: <Coins className="h-4 w-4" />, value: cur?.costPerResult ?? null, prev: prev?.costPerResult ?? null, format: fmtBRL, series: cprDay, higherIsBetter: false, color: 'hsl(38 92% 50%)' },
    { key: 'roas', label: 'ROAS', icon: <Percent className="h-4 w-4" />, value: cur?.roas ?? null, prev: prev?.roas ?? null, format: (v) => fmtMultiplier(v), series: d.map((x) => x.roas), higherIsBetter: true, color: 'hsl(199 89% 48%)' },
  ]

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {kpis.map((k) => {
        const delta = k.value != null && k.prev != null && k.prev !== 0 ? calcDelta(k.value, k.prev) : null
        return (
          <MagicCard key={k.key} className="glass-card rounded-2xl p-4 flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <span style={{ color: k.color }}>{k.icon}</span>{k.label}
              </span>
              <DeltaChip delta={delta} higherIsBetter={k.higherIsBetter} neutral={k.neutral} />
            </div>
            <div className="mt-2 text-2xl md:text-3xl font-bold tracking-tight tabular-nums">
              {k.value == null ? '—' : <NumberTicker value={k.value} format={k.format} />}
            </div>
            <div className="mt-2 -mx-1 h-8 flex items-end">
              {filtered
                ? <span className="px-1 text-[10px] text-muted-foreground/70">no período · campanha filtrada</span>
                : <Sparkline data={k.series} color={k.color} height={32} />}
            </div>
          </MagicCard>
        )
      })}
    </div>
  )
}
