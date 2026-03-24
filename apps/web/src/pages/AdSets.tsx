import { useState } from 'react'
import { Search, ArrowUpDown } from 'lucide-react'
import { useAdSets } from '../hooks/useAdSets'
import { DashboardFilters } from '../components/DashboardFilters'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { Input } from '../components/ui/Input'
import { fmtBRL, fmtNumber, fmtPct, fmtMultiplier } from '../lib/format'

export default function AdSets() {
  const { data: adsets, isLoading } = useAdSets()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = (adsets || [])
    .filter((a) => a.name.toLowerCase().includes(search.toLowerCase()))
    .filter((a) => statusFilter === 'all' || a.status === statusFilter)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Conjuntos de Anúncios</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Analise o desempenho dos seus conjuntos</p>
        </div>
        <DashboardFilters />
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar conjunto..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="all">Todos os status</option>
          <option value="ACTIVE">Ativos</option>
          <option value="PAUSED">Pausados</option>
        </select>
      </div>

      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Conjunto</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Segmentação</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Gasto</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Alcance</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Impressões</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">CTR</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">CPM</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Compras</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">ROAS</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-b border-border/20">
                {Array.from({ length: 10 }).map((_, j) => (
                  <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                ))}
              </tr>
            )) : filtered.map((adset) => (
              <tr key={adset.id} className="border-b border-border/20 hover:bg-accent/30 transition-colors">
                <td className="px-4 py-3 font-medium max-w-[200px]">
                  <div className="truncate">{adset.name}</div>
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge variant={adset.status === 'ACTIVE' ? 'success' : 'muted'}>
                    {adset.status === 'ACTIVE' ? 'Ativo' : 'Pausado'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground max-w-[160px]">
                  {adset.targeting
                    ? [adset.targeting.ageMin && `${adset.targeting.ageMin}-${adset.targeting.ageMax ?? '+'}`, adset.targeting.genders?.join('/'), adset.targeting.locations?.slice(0,2).join(', ')].filter(Boolean).join(' · ')
                    : '—'}
                </td>
                <td className="px-4 py-3 text-right">{fmtBRL(adset.insights?.spend ?? 0)}</td>
                <td className="px-4 py-3 text-right">{fmtNumber(adset.insights?.reach ?? 0)}</td>
                <td className="px-4 py-3 text-right">{fmtNumber(adset.insights?.impressions ?? 0)}</td>
                <td className="px-4 py-3 text-right">{fmtPct(adset.insights?.ctr ?? 0)}</td>
                <td className="px-4 py-3 text-right">{fmtBRL(adset.insights?.cpm ?? 0)}</td>
                <td className="px-4 py-3 text-right">{fmtNumber(adset.insights?.purchases ?? 0)}</td>
                <td className="px-4 py-3 text-right text-emerald-400 font-medium">{fmtMultiplier(adset.insights?.roas ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">Nenhum conjunto encontrado.</div>
        )}
      </div>
    </div>
  )
}
