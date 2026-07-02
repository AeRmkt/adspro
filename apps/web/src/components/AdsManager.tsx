import { useState } from 'react'
import { ChevronRight, Megaphone, Layers, Image as ImageIcon, Loader2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCampaigns } from '../hooks/useCampaigns'
import { useAdSets } from '../hooks/useAdSets'
import { useAds } from '../hooks/useAds'
import { setEntityStatus } from '../services/api'
import { toast } from './ui/useToast'
import { Switch } from './ui/Switch'
import { Badge } from './ui/Badge'
import { Skeleton } from './ui/Skeleton'
import { MagicCard } from './ui/MagicCard'
import { cn } from '../lib/utils'
import { fmtBRL, fmtNumber, fmtPct } from '../lib/format'
import type { MetricInsights } from '@adspro/types'

// ─── Status helpers ───────────────────────────────────────────────────────────
function effLabel(s?: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'Ativo', PAUSED: 'Pausado', CAMPAIGN_PAUSED: 'Camp. pausada',
    ADSET_PAUSED: 'Conj. pausado', IN_PROCESS: 'Em processo', WITH_ISSUES: 'Com problemas',
    PENDING_REVIEW: 'Em análise', DISAPPROVED: 'Reprovado', PREAPPROVED: 'Pré-aprovado',
    PENDING_BILLING_INFO: 'Falta pagamento', ARCHIVED: 'Arquivado', DELETED: 'Excluído',
  }
  return map[s ?? ''] || 'Pausado'
}
function effVariant(s?: string): 'success' | 'muted' | 'destructive' | 'warning' {
  if (s === 'ACTIVE') return 'success'
  if (s === 'DISAPPROVED' || s === 'DELETED') return 'destructive'
  if (s === 'WITH_ISSUES' || s === 'PENDING_REVIEW' || s === 'PENDING_BILLING_INFO' || s === 'IN_PROCESS') return 'warning'
  return 'muted'
}

// ─── Toggle com mutation otimista ─────────────────────────────────────────────
function StatusToggle({
  id, status, size = 'md', invalidate,
}: {
  id: string
  status: string
  size?: 'sm' | 'md'
  invalidate: string[]
}) {
  const qc = useQueryClient()
  const [optimistic, setOptimistic] = useState<boolean | null>(null)

  const mut = useMutation({
    mutationFn: (next: boolean) => setEntityStatus(id, next ? 'ACTIVE' : 'PAUSED'),
    onSuccess: (_d, next) => {
      toast({
        title: next ? 'Ativado' : 'Pausado',
        description: next ? 'Voltou a rodar no Meta.' : 'Foi pausado no Meta.',
      })
      invalidate.forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
    },
    onError: (err) => {
      setOptimistic(null)
      toast({ title: 'Não foi possível alterar', description: (err as Error).message, variant: 'destructive' })
    },
  })

  const checked = optimistic ?? status === 'ACTIVE'
  return (
    <Switch
      size={size}
      checked={checked}
      loading={mut.isPending}
      title={checked ? 'Pausar' : 'Ativar'}
      onCheckedChange={(v) => { setOptimistic(v); mut.mutate(v) }}
    />
  )
}

// ─── Métricas compactas de uma linha ──────────────────────────────────────────
function RowMetrics({ insights }: { insights: MetricInsights | null }) {
  const m = insights
  const cell = (label: string, value: string) => (
    <div className="w-20 flex-shrink-0 text-right tabular-nums">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground/70">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  )
  return (
    <div className="hidden md:flex items-center gap-4">
      {cell('Investido', m ? fmtBRL(m.spend) : '—')}
      {cell('Resultados', m ? fmtNumber(m.results) : '—')}
      {cell('Custo/Res.', m?.costPerResult ? fmtBRL(m.costPerResult) : '—')}
      {cell('CTR', m ? fmtPct(m.ctr) : '—')}
    </div>
  )
}

// ─── Linha genérica (usada nos 3 níveis) ──────────────────────────────────────
function Row({
  icon, name, effectiveStatus, insights, toggle, expandable, expanded, onToggleExpand, depth, thumbnail,
}: {
  icon: React.ReactNode
  name: string
  effectiveStatus?: string
  insights: MetricInsights | null
  toggle: React.ReactNode
  expandable?: boolean
  expanded?: boolean
  onToggleExpand?: () => void
  depth: number
  thumbnail?: string | null
}) {
  return (
    <div
      className={cn(
        'group flex items-center gap-3 py-2.5 pr-3 border-b border-border/40 hover:bg-accent/40 transition-colors',
        depth === 0 ? 'pl-3' : depth === 1 ? 'pl-8 bg-background/40' : 'pl-14 bg-background/60'
      )}
    >
      {toggle}

      <button
        onClick={onToggleExpand}
        disabled={!expandable}
        className={cn('flex items-center justify-center h-5 w-5 rounded flex-shrink-0 transition-colors',
          expandable ? 'hover:bg-accent text-muted-foreground' : 'opacity-0')}
      >
        <ChevronRight className={cn('h-4 w-4 transition-transform', expanded && 'rotate-90')} />
      </button>

      {thumbnail ? (
        <img src={thumbnail} alt="" className="h-8 w-8 rounded object-cover flex-shrink-0 border border-border/50" />
      ) : (
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary flex-shrink-0">
          {icon}
        </span>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{name}</span>
        </div>
        <Badge variant={effVariant(effectiveStatus)} className="mt-0.5 text-[10px]">
          {effLabel(effectiveStatus)}
        </Badge>
      </div>

      <RowMetrics insights={insights} />
    </div>
  )
}

// ─── Nível 3: anúncios ────────────────────────────────────────────────────────
function AdList({ adsetId }: { adsetId: string }) {
  const { data: ads, isLoading } = useAds(adsetId)
  if (isLoading) return <div className="pl-14 py-2"><Skeleton className="h-8 w-full" /></div>
  if (!ads?.length) return <div className="pl-14 py-3 text-xs text-muted-foreground">Nenhum anúncio neste conjunto.</div>
  return (
    <>
      {ads.map((ad) => (
        <Row
          key={ad.id}
          depth={2}
          icon={<ImageIcon className="h-4 w-4" />}
          thumbnail={ad.creative?.thumbnailUrl}
          name={ad.name}
          effectiveStatus={ad.effectiveStatus ?? ad.status}
          insights={ad.insights}
          toggle={<StatusToggle id={ad.id} status={ad.status} size="sm" invalidate={['ads']} />}
        />
      ))}
    </>
  )
}

// ─── Nível 2: conjuntos ───────────────────────────────────────────────────────
function AdSetList({ campaignId }: { campaignId: string }) {
  const { data: adsets, isLoading } = useAdSets(campaignId)
  const [open, setOpen] = useState<Set<string>>(new Set())
  if (isLoading) return <div className="pl-8 py-2"><Skeleton className="h-8 w-full" /></div>
  if (!adsets?.length) return <div className="pl-8 py-3 text-xs text-muted-foreground">Nenhum conjunto nesta campanha.</div>
  return (
    <>
      {adsets.map((s) => {
        const isOpen = open.has(s.id)
        return (
          <div key={s.id}>
            <Row
              depth={1}
              icon={<Layers className="h-4 w-4" />}
              name={s.name}
              effectiveStatus={s.effectiveStatus ?? s.status}
              insights={s.insights}
              expandable
              expanded={isOpen}
              onToggleExpand={() => setOpen((prev) => {
                const n = new Set(prev); n.has(s.id) ? n.delete(s.id) : n.add(s.id); return n
              })}
              toggle={<StatusToggle id={s.id} status={s.status} size="sm" invalidate={['adsets']} />}
            />
            {isOpen && <AdList adsetId={s.id} />}
          </div>
        )
      })}
    </>
  )
}

// ─── Nível 1: campanhas ───────────────────────────────────────────────────────
export function AdsManager() {
  const { data: campaigns, isLoading } = useCampaigns()
  const [open, setOpen] = useState<Set<string>>(new Set())

  return (
    <MagicCard className="glass-card rounded-xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-primary" /> Gerenciador de Anúncios
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Campanhas → conjuntos → anúncios. Ative ou pause direto pelo AdsPro.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : !campaigns?.length ? (
          <div className="p-10 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
            <Loader2 className="h-5 w-5 opacity-40" />
            Nenhuma campanha encontrada nesta conta e período.
          </div>
        ) : (
          <div className="min-w-[560px]">
            {campaigns.map((c) => {
              const isOpen = open.has(c.id)
              return (
                <div key={c.id}>
                  <Row
                    depth={0}
                    icon={<Megaphone className="h-4 w-4" />}
                    name={c.name}
                    effectiveStatus={c.effectiveStatus ?? c.status}
                    insights={c.insights}
                    expandable
                    expanded={isOpen}
                    onToggleExpand={() => setOpen((prev) => {
                      const n = new Set(prev); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n
                    })}
                    toggle={<StatusToggle id={c.id} status={c.status} invalidate={['campaigns']} />}
                  />
                  {isOpen && <AdSetList campaignId={c.id} />}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </MagicCard>
  )
}
