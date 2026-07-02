import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, Megaphone, Layers, Image as ImageIcon, Search } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCampaigns } from '../hooks/useCampaigns'
import { useAdSets } from '../hooks/useAdSets'
import { useAds } from '../hooks/useAds'
import { setEntityStatus } from '../services/api'
import { toast } from './ui/useToast'
import { Switch } from './ui/Switch'
import { Input } from './ui/Input'
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
function statusPill(s?: string): string {
  if (s === 'ACTIVE') return 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20'
  if (s === 'DISAPPROVED' || s === 'DELETED') return 'bg-red-500/10 text-red-500 ring-red-500/20'
  if (s === 'WITH_ISSUES' || s === 'PENDING_REVIEW' || s === 'PENDING_BILLING_INFO' || s === 'IN_PROCESS')
    return 'bg-amber-500/10 text-amber-500 ring-amber-500/20'
  return 'bg-muted-foreground/10 text-muted-foreground ring-border'
}

function StatusPill({ status }: { status?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset', statusPill(status))}>
      <span className={cn('h-1.5 w-1.5 rounded-full', status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-current opacity-60')} />
      {effLabel(status)}
    </span>
  )
}

// ─── Toggle com mutation otimista ─────────────────────────────────────────────
function StatusToggle({ id, status, size = 'md', invalidate }: {
  id: string; status: string; size?: 'sm' | 'md'; invalidate: string[]
}) {
  const qc = useQueryClient()
  const [optimistic, setOptimistic] = useState<boolean | null>(null)
  const mut = useMutation({
    mutationFn: (next: boolean) => setEntityStatus(id, next ? 'ACTIVE' : 'PAUSED'),
    onSuccess: (_d, next) => {
      toast({ title: next ? 'Ativado' : 'Pausado', description: next ? 'Voltou a rodar no Meta.' : 'Foi pausado no Meta.' })
      invalidate.forEach((k) => qc.invalidateQueries({ queryKey: [k] }))
    },
    onError: (err) => {
      setOptimistic(null)
      toast({ title: 'Não foi possível alterar', description: (err as Error).message, variant: 'destructive' })
    },
  })
  const checked = optimistic ?? status === 'ACTIVE'
  return (
    <Switch size={size} checked={checked} loading={mut.isPending}
      title={checked ? 'Pausar' : 'Ativar'}
      onCheckedChange={(v) => { setOptimistic(v); mut.mutate(v) }} />
  )
}

// ─── Métricas compactas ───────────────────────────────────────────────────────
function RowMetrics({ insights }: { insights: MetricInsights | null }) {
  const m = insights
  const cell = (label: string, value: string, accent?: boolean) => (
    <div className="w-[76px] flex-shrink-0 text-right tabular-nums">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground/60">{label}</div>
      <div className={cn('text-sm font-semibold', accent && 'text-primary')}>{value}</div>
    </div>
  )
  return (
    <div className="hidden md:flex items-center gap-3">
      {cell('Investido', m ? fmtBRL(m.spend) : '—')}
      {cell('Resultados', m ? fmtNumber(m.results) : '—', true)}
      {cell('Custo/Res.', m?.costPerResult ? fmtBRL(m.costPerResult) : '—')}
      {cell('CTR', m ? fmtPct(m.ctr) : '—')}
    </div>
  )
}

// ─── Linha genérica ───────────────────────────────────────────────────────────
function Row({
  icon, name, effectiveStatus, insights, toggle, expandable, expanded, onToggleExpand, depth, thumbnail,
}: {
  icon: React.ReactNode; name: string; effectiveStatus?: string; insights: MetricInsights | null
  toggle: React.ReactNode; expandable?: boolean; expanded?: boolean; onToggleExpand?: () => void
  depth: number; thumbnail?: string | null
}) {
  return (
    <div
      className={cn(
        'group flex items-center gap-3 py-2.5 pr-3 transition-colors',
        depth === 0 ? 'pl-3 hover:bg-accent/40' : depth === 1 ? 'pl-9 bg-muted/20 hover:bg-accent/30' : 'pl-16 bg-muted/40 hover:bg-accent/20',
      )}
    >
      {toggle}
      <button
        onClick={onToggleExpand}
        disabled={!expandable}
        className={cn('flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md transition-colors',
          expandable ? 'text-muted-foreground hover:bg-accent hover:text-foreground' : 'opacity-0')}
      >
        <motion.span animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronRight className="h-4 w-4" />
        </motion.span>
      </button>

      {thumbnail ? (
        <img src={thumbnail} alt="" className="h-8 w-8 flex-shrink-0 rounded-lg border border-border/50 object-cover" />
      ) : (
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/10">
          {icon}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{name}</div>
        <div className="mt-1"><StatusPill status={effectiveStatus} /></div>
      </div>

      <RowMetrics insights={insights} />
    </div>
  )
}

// Wrapper de expansão animado (altura + fade)
function Expand({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Nível 3: anúncios ────────────────────────────────────────────────────────
function AdList({ adsetId }: { adsetId: string }) {
  const { data: ads, isLoading } = useAds(adsetId)
  if (isLoading) return <div className="py-2 pl-16 pr-3"><Skeleton className="h-8 w-full" /></div>
  if (!ads?.length) return <div className="py-3 pl-16 text-xs text-muted-foreground">Nenhum anúncio neste conjunto.</div>
  return (
    <div className="divide-y divide-border/30">
      {ads.map((ad) => (
        <Row key={ad.id} depth={2} icon={<ImageIcon className="h-4 w-4" />} thumbnail={ad.creative?.thumbnailUrl}
          name={ad.name} effectiveStatus={ad.effectiveStatus ?? ad.status} insights={ad.insights}
          toggle={<StatusToggle id={ad.id} status={ad.status} size="sm" invalidate={['ads']} />} />
      ))}
    </div>
  )
}

// ─── Nível 2: conjuntos ───────────────────────────────────────────────────────
function AdSetList({ campaignId }: { campaignId: string }) {
  const { data: adsets, isLoading } = useAdSets(campaignId)
  const [open, setOpen] = useState<Set<string>>(new Set())
  if (isLoading) return <div className="py-2 pl-9 pr-3"><Skeleton className="h-8 w-full" /></div>
  if (!adsets?.length) return <div className="py-3 pl-9 text-xs text-muted-foreground">Nenhum conjunto nesta campanha.</div>
  return (
    <div className="divide-y divide-border/30">
      {adsets.map((s) => {
        const isOpen = open.has(s.id)
        return (
          <div key={s.id}>
            <Row depth={1} icon={<Layers className="h-4 w-4" />} name={s.name}
              effectiveStatus={s.effectiveStatus ?? s.status} insights={s.insights}
              expandable expanded={isOpen}
              onToggleExpand={() => setOpen((p) => { const n = new Set(p); n.has(s.id) ? n.delete(s.id) : n.add(s.id); return n })}
              toggle={<StatusToggle id={s.id} status={s.status} size="sm" invalidate={['adsets']} />} />
            <Expand show={isOpen}><AdList adsetId={s.id} /></Expand>
          </div>
        )
      })}
    </div>
  )
}

// ─── Nível 1: campanhas ───────────────────────────────────────────────────────
export function AdsManager() {
  const { data: campaigns, isLoading } = useCampaigns()
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return (campaigns ?? []).filter((c) => !q || c.name.toLowerCase().includes(q))
  }, [campaigns, query])

  const activeCount = (campaigns ?? []).filter((c) => c.status === 'ACTIVE').length

  return (
    <MagicCard className="glass-card overflow-hidden rounded-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
              <Megaphone className="h-4 w-4" />
            </span>
            Gerenciador de Anúncios
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {activeCount} ativa{activeCount === 1 ? '' : 's'} · campanha → conjunto → anúncio · ative/pause pelo AdsPro
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar campanha..." value={query} onChange={(e) => setQuery(e.target.value)} className="h-9 pl-9 text-sm" />
        </div>
      </div>

      {/* Corpo */}
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {query ? 'Nenhuma campanha corresponde à busca.' : 'Nenhuma campanha nesta conta e período.'}
          </div>
        ) : (
          <div className="min-w-[600px] divide-y divide-border/40">
            <AnimatePresence initial={false} mode="popLayout">
              {filtered.map((c, i) => {
                const isOpen = open.has(c.id)
                return (
                  <motion.div
                    key={c.id}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2, delay: Math.min(i, 12) * 0.025 }}
                  >
                    <Row depth={0} icon={<Megaphone className="h-4 w-4" />} name={c.name}
                      effectiveStatus={c.effectiveStatus ?? c.status} insights={c.insights}
                      expandable expanded={isOpen}
                      onToggleExpand={() => setOpen((p) => { const n = new Set(p); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n })}
                      toggle={<StatusToggle id={c.id} status={c.status} invalidate={['campaigns']} />} />
                    <Expand show={isOpen}><AdSetList campaignId={c.id} /></Expand>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </MagicCard>
  )
}
