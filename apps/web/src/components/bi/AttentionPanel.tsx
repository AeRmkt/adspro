import { motion } from 'framer-motion'
import { AlertTriangle, AlertOctagon, CheckCircle2, Info, Sparkles } from 'lucide-react'
import { useCampaigns } from '../../hooks/useCampaigns'
import { useMetrics } from '../../hooks/useMetrics'
import { useDailyInsights } from '../../hooks/useDailyInsights'
import { useAdAccounts } from '../../hooks/useAdAccounts'
import { useDashboardStore } from '../../store/dashboardStore'
import { MagicCard } from '../ui/MagicCard'
import { Skeleton } from '../ui/Skeleton'
import { cn } from '../../lib/utils'
import { computeInsights, type Severity } from '../../lib/insights'

const STYLE: Record<Severity, { icon: React.ReactNode; ring: string; text: string; bg: string }> = {
  critical: { icon: <AlertOctagon className="h-4 w-4" />, ring: 'ring-red-500/25', text: 'text-red-500', bg: 'bg-red-500/5' },
  warning: { icon: <AlertTriangle className="h-4 w-4" />, ring: 'ring-amber-500/25', text: 'text-amber-500', bg: 'bg-amber-500/5' },
  good: { icon: <CheckCircle2 className="h-4 w-4" />, ring: 'ring-emerald-500/25', text: 'text-emerald-500', bg: 'bg-emerald-500/5' },
  info: { icon: <Info className="h-4 w-4" />, ring: 'ring-sky-500/25', text: 'text-sky-500', bg: 'bg-sky-500/5' },
}

export function AttentionPanel() {
  const { data: campaigns, isLoading: cLoad } = useCampaigns()
  const { current, previous } = useMetrics()
  const { data: daily } = useDailyInsights()
  const { data: accounts } = useAdAccounts()
  const { selectedAccountId } = useDashboardStore()

  const account = accounts?.find((a) => a.id === selectedAccountId)
  const loading = cLoad || current.isLoading

  const insights = computeInsights({
    campaigns: campaigns ?? [],
    cur: current.data,
    prev: previous.data,
    account,
    daily: daily ?? [],
  })

  return (
    <MagicCard className="glass-card rounded-2xl h-full flex flex-col" spotlightColor="hsl(38 92% 50% / 0.10)">
      <div className="flex items-center gap-2 border-b border-border/50 px-5 py-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/15">
          <Sparkles className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-sm font-semibold">Precisa de Atenção</h2>
          <p className="text-[11px] text-muted-foreground">Sinais automáticos do período — o que decidir hoje</p>
        </div>
      </div>

      <div className="flex-1 space-y-2 p-3">
        {loading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
        ) : insights.length === 0 ? (
          <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 p-6 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500/60" />
            <p className="text-sm text-muted-foreground">Tudo tranquilo por aqui. Sem alertas no período.</p>
          </div>
        ) : (
          insights.map((ins, i) => {
            const s = STYLE[ins.severity]
            return (
              <motion.div
                key={ins.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: i * 0.04 }}
                className={cn('flex gap-3 rounded-xl p-3 ring-1', s.ring, s.bg)}
              >
                <span className={cn('mt-0.5 flex-shrink-0', s.text)}>{s.icon}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{ins.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{ins.detail}</p>
                </div>
              </motion.div>
            )
          })
        )}
      </div>
    </MagicCard>
  )
}
