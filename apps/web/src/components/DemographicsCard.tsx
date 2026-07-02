import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import { getDemographics, type DemographicBreakdown } from '../services/api'
import { useDashboardStore } from '../store/dashboardStore'
import { Skeleton } from './ui/Skeleton'
import { MagicCard } from './ui/MagicCard'
import { cn } from '../lib/utils'
import { fmtBRL, fmtNumber } from '../lib/format'

const GENDER_LABEL: Record<string, string> = { male: 'Homens', female: 'Mulheres', unknown: 'Não informado' }

type MetricKey = 'spend' | 'results'
const METRIC_TABS: { key: MetricKey; label: string; fmt: (v: number) => string }[] = [
  { key: 'spend', label: 'Investido', fmt: fmtBRL },
  { key: 'results', label: 'Resultados', fmt: fmtNumber },
]
const BD_TABS: { key: DemographicBreakdown; label: string }[] = [
  { key: 'age', label: 'Idade' },
  { key: 'gender', label: 'Gênero' },
  { key: 'age_gender', label: 'Idade + Gênero' },
]

function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { key: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-lg bg-background/60 border border-border/50 p-0.5">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={cn('px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
            value === t.key ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground')}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function DemographicsCard() {
  const { selectedAccountId, dateRange } = useDashboardStore()
  const [metric, setMetric] = useState<MetricKey>('spend')
  const [breakdown, setBreakdown] = useState<DemographicBreakdown>('age')

  const { data, isLoading } = useQuery({
    queryKey: ['demographics', selectedAccountId, dateRange.from, dateRange.to, breakdown],
    queryFn: () => getDemographics(selectedAccountId!, dateRange.from, dateRange.to, breakdown),
    enabled: !!selectedAccountId,
    staleTime: 5 * 60 * 1000,
  })

  const fmt = METRIC_TABS.find((t) => t.key === metric)!.fmt
  const rows = (data ?? [])
    .map((r) => ({ label: breakdown === 'gender' ? (GENDER_LABEL[r.key] ?? r.key) : r.key, value: r[metric] }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
  const max = Math.max(1, ...rows.map((r) => r.value))

  return (
    <MagicCard className="glass-card rounded-xl">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/50 flex-wrap">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" /> Dados Demográficos
        </h2>
        <div className="flex items-center gap-2">
          <Tabs tabs={BD_TABS} value={breakdown} onChange={setBreakdown} />
          <Tabs tabs={METRIC_TABS} value={metric} onChange={setMetric} />
        </div>
      </div>

      <div className="p-4 space-y-2.5">
        {isLoading ? (
          [...Array(5)].map((_, i) => <Skeleton key={i} className="h-7 w-full" />)
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Sem dados demográficos no período.</p>
        ) : (
          rows.map((r) => (
            <div key={r.label} className="flex items-center gap-3">
              <span className="w-28 flex-shrink-0 truncate text-xs text-muted-foreground">{r.label}</span>
              <div className="flex-1 h-6 rounded-md bg-background/60 overflow-hidden">
                <div
                  className="h-full rounded-md bg-gradient-to-r from-primary/80 to-primary transition-all duration-500"
                  style={{ width: `${(r.value / max) * 100}%` }}
                />
              </div>
              <span className="w-20 flex-shrink-0 text-right text-xs font-semibold tabular-nums">{fmt(r.value)}</span>
            </div>
          ))
        )}
      </div>
    </MagicCard>
  )
}
