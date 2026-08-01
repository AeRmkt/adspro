import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Wallet } from 'lucide-react'
import { useCampaigns } from '../../hooks/useCampaigns'
import { useMetrics } from '../../hooks/useMetrics'
import { MagicCard } from '../ui/MagicCard'
import { Skeleton } from '../ui/Skeleton'
import { cn } from '../../lib/utils'
import { fmtBRL, fmtNumber } from '../../lib/format'

type Eff = 'good' | 'avg' | 'bad' | 'none'
const EFF: Record<Eff, { dot: string; label: string; text: string }> = {
  good: { dot: 'bg-emerald-500', label: 'Eficiente', text: 'text-emerald-500' },
  avg: { dot: 'bg-sky-500', label: 'Na média', text: 'text-sky-500' },
  bad: { dot: 'bg-red-500', label: 'Caro', text: 'text-red-500' },
  none: { dot: 'bg-muted-foreground/50', label: 'Sem resultado', text: 'text-muted-foreground' },
}

export function EfficiencyRanking() {
  const { data: campaigns, isLoading } = useCampaigns()
  const { current } = useMetrics()
  const avgCpr = current.data?.costPerResult ?? null

  const rows = useMemo(() => {
    const list = (campaigns ?? []).filter((c) => c.insights && c.insights.spend > 0)
      .sort((a, b) => b.insights!.spend - a.insights!.spend).slice(0, 8)
    const max = Math.max(1, ...list.map((c) => c.insights!.spend))
    return list.map((c) => {
      const ins = c.insights!
      let eff: Eff = 'none'
      if (ins.results > 0 && ins.costPerResult != null && avgCpr) {
        eff = ins.costPerResult <= avgCpr * 0.85 ? 'good' : ins.costPerResult >= avgCpr * 1.15 ? 'bad' : 'avg'
      } else if (ins.results > 0) eff = 'avg'
      return { id: c.id, name: c.name, spend: ins.spend, results: ins.results, cpr: ins.costPerResult, pct: (ins.spend / max) * 100, eff }
    })
  }, [campaigns, avgCpr])

  return (
    <MagicCard className="glass-card rounded-2xl">
      <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
            <Wallet className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">Onde está indo o dinheiro</h2>
            <p className="text-[11px] text-muted-foreground">Campanhas por gasto · eficiência vs. média da conta</p>
          </div>
        </div>
      </div>

      <div className="p-3">
        {isLoading ? (
          <div className="space-y-2 p-1">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}</div>
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Sem campanhas com gasto no período.</p>
        ) : (
          <div className="space-y-1">
            {rows.map((r, i) => {
              const e = EFF[r.eff]
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: i * 0.03 }}
                  className="group relative rounded-xl px-3 py-2.5 hover:bg-accent/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={cn('h-2 w-2 flex-shrink-0 rounded-full', e.dot)} title={e.label} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.name}</span>
                    <div className="hidden sm:block w-28 text-right tabular-nums">
                      <div className="text-xs text-muted-foreground">{fmtNumber(r.results)} result.</div>
                    </div>
                    <div className="w-24 text-right tabular-nums">
                      <div className="text-sm font-semibold">{fmtBRL(r.spend)}</div>
                      <div className={cn('text-[11px]', e.text)}>{r.cpr != null ? `${fmtBRL(r.cpr)}/res` : e.label}</div>
                    </div>
                  </div>
                  {/* barra de gasto */}
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-background/60">
                    <div className={cn('h-full rounded-full', r.eff === 'bad' ? 'bg-red-500/70' : r.eff === 'good' ? 'bg-emerald-500/70' : 'bg-primary/60')} style={{ width: `${r.pct}%` }} />
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </MagicCard>
  )
}
