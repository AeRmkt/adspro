import { useState } from 'react'
import { Trophy, Image as ImageIcon } from 'lucide-react'
import { useAds } from '../hooks/useAds'
import { Skeleton } from './ui/Skeleton'
import { Badge } from './ui/Badge'
import { MagicCard } from './ui/MagicCard'
import { cn } from '../lib/utils'
import { fmtBRL, fmtNumber, fmtPct, fmtMultiplier } from '../lib/format'
import type { Ad, MetricInsights } from '@adspro/types'

type SortKey = 'results' | 'spend' | 'roas' | 'ctr'
const TABS: { key: SortKey; label: string; fmt: (m: MetricInsights) => string }[] = [
  { key: 'results', label: 'Resultados', fmt: (m) => fmtNumber(m.results) },
  { key: 'spend', label: 'Investido', fmt: (m) => fmtBRL(m.spend) },
  { key: 'roas', label: 'ROAS', fmt: (m) => fmtMultiplier(m.roas) },
  { key: 'ctr', label: 'CTR', fmt: (m) => fmtPct(m.ctr) },
]

export function BestAdsCard() {
  const { data: ads, isLoading } = useAds() // sem adsetId → anúncios da conta inteira
  const [sort, setSort] = useState<SortKey>('results')

  const fmt = TABS.find((t) => t.key === sort)!.fmt
  const top = (ads ?? [])
    .filter((a: Ad) => a.insights && (a.insights[sort] as number) > 0)
    .sort((a, b) => ((b.insights![sort] as number) ?? 0) - ((a.insights![sort] as number) ?? 0))
    .slice(0, 5)

  return (
    <MagicCard className="glass-card rounded-xl">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/50 flex-wrap">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Trophy className="h-4 w-4 text-yellow-400" /> Melhores Anúncios
        </h2>
        <div className="inline-flex rounded-lg bg-background/60 border border-border/50 p-0.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setSort(t.key)}
              className={cn('px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
                sort === t.key ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground')}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3 space-y-1.5">
        {isLoading ? (
          [...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
        ) : top.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Sem anúncios com dados no período.</p>
        ) : (
          top.map((ad, i) => (
            <div key={ad.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent/40 transition-colors">
              <span className={cn('flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold',
                i === 0 ? 'bg-yellow-400/20 text-yellow-400' : 'bg-muted-foreground/10 text-muted-foreground')}>
                {i + 1}
              </span>
              {ad.creative?.thumbnailUrl ? (
                <img src={ad.creative.thumbnailUrl} alt="" className="h-10 w-10 rounded-md object-cover flex-shrink-0 border border-border/50" />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary flex-shrink-0">
                  <ImageIcon className="h-4 w-4" />
                </span>
              )}
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{ad.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant={ad.status === 'ACTIVE' ? 'success' : 'muted'} className="text-[10px]">
                    {ad.status === 'ACTIVE' ? 'Ativo' : 'Pausado'}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground tabular-nums">{fmtBRL(ad.insights!.spend)} gastos</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-bold tabular-nums">{fmt(ad.insights!)}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
                  {TABS.find((t) => t.key === sort)!.label}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </MagicCard>
  )
}
