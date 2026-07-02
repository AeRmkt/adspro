import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Search, ArrowUpDown } from 'lucide-react'
import { useCampaigns } from '../hooks/useCampaigns'
import { useAdSets } from '../hooks/useAdSets'
import { Badge } from './ui/Badge'
import { Skeleton } from './ui/Skeleton'
import { Input } from './ui/Input'
import { fmtBRL, fmtNumber, fmtPct, fmtMultiplier } from '../lib/format'
import type { Campaign, AdSet } from '@adspro/types'

function statusVariant(status: string): 'success' | 'muted' | 'destructive' | 'warning' {
  switch (status) {
    case 'ACTIVE': return 'success'
    case 'PAUSED': return 'muted'
    case 'DELETED': return 'destructive'
    default: return 'warning'
  }
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'Ativo', PAUSED: 'Pausado', DELETED: 'Excluído',
    ARCHIVED: 'Arquivado', IN_PROCESS: 'Em processo', WITH_ISSUES: 'Com problemas',
  }
  return map[status] || status
}

const OBJECTIVE_LABELS: Record<string, string> = {
  OUTCOME_SALES: 'Vendas',
  OUTCOME_LEADS: 'Leads',
  OUTCOME_ENGAGEMENT: 'Engajamento',
  OUTCOME_TRAFFIC: 'Tráfego',
  OUTCOME_AWARENESS: 'Reconhecimento',
  OUTCOME_APP_PROMOTION: 'App',
}
function objectiveLabel(o?: string | null): string {
  if (!o) return '—'
  return OBJECTIVE_LABELS[o] || o.replace(/^OUTCOME_/, '').replace(/_/g, ' ')
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'spend', label: 'Gasto' },
  { key: 'roas', label: 'ROAS' },
  { key: 'purchases', label: 'Compras' },
  { key: 'clicks', label: 'Cliques' },
  { key: 'ctr', label: 'CTR' },
  { key: 'impressions', label: 'Impressões' },
  { key: 'reach', label: 'Alcance' },
  { key: 'name', label: 'Nome' },
]

function AdSetsRow({ campaignId }: { campaignId: string }) {
  const { data: adsets, isLoading } = useAdSets(campaignId)

  if (isLoading) {
    return (
      <tr>
        <td colSpan={14} className="px-6 py-3 bg-background/50">
          <Skeleton className="h-8 w-full" />
        </td>
      </tr>
    )
  }

  return (
    <>
      {(adsets || []).map((adset: AdSet) => (
        <tr key={adset.id} className="border-b border-border/20 bg-background/30 hover:bg-accent/30 transition-colors">
          <td className="px-6 py-2.5 pl-12">
            <div className="text-sm font-medium">{adset.name}</div>
            {adset.targeting && (
              <div className="text-xs text-muted-foreground mt-0.5">
                {[
                  adset.targeting.ageMin && `${adset.targeting.ageMin}-${adset.targeting.ageMax ?? '+'}`,
                  adset.targeting.genders?.join('/'),
                  adset.targeting.locations?.slice(0, 2).join(', '),
                ].filter(Boolean).join(' · ')}
              </div>
            )}
          </td>
          <td className="px-4 py-2.5">
            <Badge variant={statusVariant(adset.status)} className="text-xs">
              {statusLabel(adset.status)}
            </Badge>
          </td>
          <td className="px-4 py-2.5 text-sm text-right">{adset.dailyBudget ? fmtBRL(adset.dailyBudget) : '—'}</td>
          <td className="px-4 py-2.5 text-sm text-right">{fmtBRL(adset.insights?.spend ?? 0)}</td>
          <td className="px-4 py-2.5 text-sm text-right">{fmtNumber(adset.insights?.reach ?? 0)}</td>
          <td className="px-4 py-2.5 text-sm text-right">{fmtNumber(adset.insights?.impressions ?? 0)}</td>
          <td className="px-4 py-2.5 text-sm text-right">{fmtNumber(adset.insights?.clicks ?? 0)}</td>
          <td className="px-4 py-2.5 text-sm text-right">{fmtPct(adset.insights?.ctr ?? 0)}</td>
          <td className="px-4 py-2.5 text-sm text-right">{fmtBRL(adset.insights?.cpm ?? 0)}</td>
          <td className="px-4 py-2.5 text-sm text-right">{fmtBRL(adset.insights?.cpc ?? 0)}</td>
          <td className="px-4 py-2.5 text-sm text-right">{fmtNumber(adset.insights?.purchases ?? 0)}</td>
          <td className="px-4 py-2.5 text-sm text-right">{adset.insights?.costPerPurchase ? fmtBRL(adset.insights.costPerPurchase) : '—'}</td>
          <td className="px-4 py-2.5 text-sm text-right">{fmtMultiplier(adset.insights?.roas ?? 0)}</td>
          <td className="px-4 py-2.5 text-sm text-right">{fmtMultiplier(adset.insights?.frequency ?? 0, 1)}</td>
        </tr>
      ))}
    </>
  )
}

type SortKey = 'name' | 'spend' | 'reach' | 'impressions' | 'clicks' | 'ctr' | 'roas' | 'purchases'

export function CampaignsTable() {
  const { data: campaigns, isLoading } = useCampaigns()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [objectiveFilter, setObjectiveFilter] = useState<string>('all')
  const [sortKey, setSortKey] = useState<SortKey>('spend')
  const [sortAsc, setSortAsc] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const objectives = useMemo(
    () => Array.from(new Set((campaigns || []).map((c) => c.objective).filter(Boolean))) as string[],
    [campaigns]
  )

  const filtered = (campaigns || [])
    .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    .filter((c) => statusFilter === 'all' || c.status === statusFilter)
    .filter((c) => objectiveFilter === 'all' || c.objective === objectiveFilter)
    .sort((a, b) => {
      let av: number, bv: number
      if (sortKey === 'name') {
        return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
      }
      const getVal = (c: Campaign): number => {
        const m = c.insights
        if (!m) return 0
        switch (sortKey) {
          case 'spend': return m.spend
          case 'reach': return m.reach
          case 'impressions': return m.impressions
          case 'clicks': return m.clicks
          case 'ctr': return m.ctr
          case 'roas': return m.roas
          case 'purchases': return m.purchases
          default: return 0
        }
      }
      av = getVal(a); bv = getVal(b)
      return sortAsc ? av - bv : bv - av
    })

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(false) }
  }

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const SortBtn = ({ col, label }: { col: SortKey; label: string }) => (
    <button
      onClick={() => toggleSort(col)}
      className="flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
    >
      {label}
      <ArrowUpDown className={`h-3 w-3 ${sortKey === col ? 'text-primary' : 'opacity-40'}`} />
    </button>
  )

  return (
    <div className="space-y-3">
      {/* Filtros */}
      <div className="glass-card p-3 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar campanha..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">Todos os status</option>
          <option value="ACTIVE">Ativos</option>
          <option value="PAUSED">Pausados</option>
          <option value="ARCHIVED">Arquivados</option>
        </select>
        <select
          value={objectiveFilter}
          onChange={(e) => setObjectiveFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">Todos os objetivos</option>
          {objectives.map((o) => (
            <option key={o} value={o}>{objectiveLabel(o)}</option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>Ordenar: {o.label}</option>
            ))}
          </select>
          <button
            onClick={() => setSortAsc((v) => !v)}
            title={sortAsc ? 'Crescente' : 'Decrescente'}
            className="h-10 w-10 rounded-md border border-input bg-background flex items-center justify-center hover:bg-accent transition-colors"
          >
            <ArrowUpDown className="h-4 w-4" />
          </button>
        </div>
        <div className="ml-auto flex items-center gap-4 text-sm pr-1">
          <span className="text-muted-foreground">
            <strong className="text-foreground">{filtered.length}</strong> campanhas
          </span>
          <span className="text-muted-foreground">
            Gasto: <strong className="text-foreground">{fmtBRL(filtered.reduce((s, c) => s + (c.insights?.spend ?? 0), 0))}</strong>
          </span>
        </div>
      </div>

      {/* Tabela */}
      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground w-8" />
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                <SortBtn col="name" label="Campanha" />
              </th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Orçamento/dia</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                <SortBtn col="spend" label="Gasto" />
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                <SortBtn col="reach" label="Alcance" />
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                <SortBtn col="impressions" label="Impressões" />
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                <SortBtn col="clicks" label="Cliques" />
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                <SortBtn col="ctr" label="CTR" />
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">CPM</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">CPC</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                <SortBtn col="purchases" label="Compras" />
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">CPP</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">
                <SortBtn col="roas" label="ROAS" />
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Frequência</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/20">
                    {Array.from({ length: 15 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              : filtered.map((campaign) => (
                  <>
                    <tr
                      key={campaign.id}
                      className="border-b border-border/20 hover:bg-accent/30 transition-colors cursor-pointer"
                      onClick={() => toggleRow(campaign.id)}
                    >
                      <td className="px-4 py-3">
                        {expandedRows.has(campaign.id)
                          ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </td>
                      <td className="px-4 py-3 max-w-[240px]">
                        <div className="font-medium truncate">{campaign.name}</div>
                        {campaign.objective && (
                          <div className="text-xs text-muted-foreground mt-0.5">{objectiveLabel(campaign.objective)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={statusVariant(campaign.status)}>
                          {statusLabel(campaign.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">{campaign.dailyBudget ? fmtBRL(campaign.dailyBudget) : '—'}</td>
                      <td className="px-4 py-3 text-right font-medium">{fmtBRL(campaign.insights?.spend ?? 0)}</td>
                      <td className="px-4 py-3 text-right">{fmtNumber(campaign.insights?.reach ?? 0)}</td>
                      <td className="px-4 py-3 text-right">{fmtNumber(campaign.insights?.impressions ?? 0)}</td>
                      <td className="px-4 py-3 text-right">{fmtNumber(campaign.insights?.clicks ?? 0)}</td>
                      <td className="px-4 py-3 text-right">{fmtPct(campaign.insights?.ctr ?? 0)}</td>
                      <td className="px-4 py-3 text-right">{fmtBRL(campaign.insights?.cpm ?? 0)}</td>
                      <td className="px-4 py-3 text-right">{fmtBRL(campaign.insights?.cpc ?? 0)}</td>
                      <td className="px-4 py-3 text-right">{fmtNumber(campaign.insights?.purchases ?? 0)}</td>
                      <td className="px-4 py-3 text-right">{campaign.insights?.costPerPurchase ? fmtBRL(campaign.insights.costPerPurchase) : '—'}</td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-400">{fmtMultiplier(campaign.insights?.roas ?? 0)}</td>
                      <td className="px-4 py-3 text-right">{fmtMultiplier(campaign.insights?.frequency ?? 0, 1)}</td>
                    </tr>
                    {expandedRows.has(campaign.id) && (
                      <AdSetsRow key={`adsets-${campaign.id}`} campaignId={campaign.id} />
                    )}
                  </>
                ))}
          </tbody>
        </table>
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Nenhuma campanha encontrada.
          </div>
        )}
      </div>
    </div>
  )
}
