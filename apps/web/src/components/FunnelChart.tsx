import * as Popover from '@radix-ui/react-popover'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ChevronDown, Check } from 'lucide-react'
import { useMetrics } from '../hooks/useMetrics'
import { fmtNumber } from '../lib/format'
import { Skeleton } from './ui/Skeleton'
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card'
import { useDashboardStore } from '../store/dashboardStore'
import { METRIC_DEFS } from '../lib/metrics'
import { cn } from '../lib/utils'
import type { MetricInsights } from '@adspro/types'

const FUNNEL_COLORS = [
  'hsl(221 83% 53%)',
  'hsl(199 89% 48%)',
  'hsl(142 71% 45%)',
]

// Métricas que fazem sentido como etapa de funil (contagens, não taxas/custos).
const FUNNEL_OPTIONS = METRIC_DEFS.filter((m) =>
  ['impressions', 'reach', 'clicks', 'linkClicks', 'websiteViews', 'videoViews',
    'pageEngagements', 'leads', 'conversations', 'addToCart', 'purchases', 'results'].includes(m.key)
)

function StepPicker({ value, onChange }: { value: string; onChange: (k: string) => void }) {
  const def = METRIC_DEFS.find((m) => m.key === value)
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/60 px-2 py-1 text-xs font-medium hover:bg-accent transition-colors">
          {def?.label ?? value}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={4}
          className="z-50 w-56 max-h-[50vh] overflow-y-auto glass-card border border-border/60 rounded-lg shadow-2xl p-1 animate-fade-in">
          {FUNNEL_OPTIONS.map((m) => (
            <Popover.Close asChild key={m.key}>
              <button
                onClick={() => onChange(m.key)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent transition-colors"
              >
                <span className={cn('flex h-5 w-5 items-center justify-center', m.iconColor)}>{m.icon}</span>
                <span className="flex-1 truncate">{m.label}</span>
                {value === m.key && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            </Popover.Close>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

export function FunnelChart() {
  const { current: { data, isLoading } } = useMetrics()
  const { funnelSteps, setFunnelSteps } = useDashboardStore()

  const steps = funnelSteps.length ? funnelSteps : ['impressions', 'clicks', 'leads']

  const setStep = (i: number, key: string) => {
    const next = [...steps]
    next[i] = key
    setFunnelSteps(next)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Funil de Conversão</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-64 w-full" /></CardContent>
      </Card>
    )
  }

  const funnelData = steps.map((key) => {
    const def = METRIC_DEFS.find((m) => m.key === key)
    return {
      name: def?.label ?? key,
      value: (data?.[key as keyof MetricInsights] as number) ?? 0,
    }
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle>Funil de Conversão</CardTitle>
          <div className="flex items-center gap-1.5">
            {steps.map((s, i) => (
              <StepPicker key={i} value={s} onChange={(k) => setStep(i, k)} />
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={funnelData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 19% 22%)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(215 20% 55%)' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={fmtNumber} tick={{ fontSize: 11, fill: 'hsl(215 20% 55%)' }} axisLine={false} tickLine={false} width={60} />
            <Tooltip
              contentStyle={{ backgroundColor: 'hsl(215 25% 11%)', border: '1px solid hsl(217 19% 22%)', borderRadius: '8px', fontSize: '12px' }}
              formatter={(value: number) => [fmtNumber(value), 'Total']}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {funnelData.map((_, i) => (
                <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
