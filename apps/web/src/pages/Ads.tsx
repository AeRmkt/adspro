import { useState } from 'react'
import { Search } from 'lucide-react'
import { useAds } from '../hooks/useAds'
import { DashboardFilters } from '../components/DashboardFilters'
import { AdPreviewModal } from '../components/AdPreviewModal'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { Input } from '../components/ui/Input'
import { fmtBRL, fmtNumber, fmtPct, fmtMultiplier } from '../lib/format'
import type { Ad } from '@adspro/types'

export default function Ads() {
  const { data: ads, isLoading } = useAds()
  const [search, setSearch] = useState('')
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null)

  const filtered = (ads || []).filter((a) => a.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Anúncios</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Visualize o desempenho de cada anúncio</p>
        </div>
        <DashboardFilters />
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar anúncio..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground w-14">Thumb</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Anúncio</th>
              <th className="px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Gasto</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Impressões</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Cliques</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">CTR</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Compras</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">ROAS</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-b border-border/20">
                {Array.from({ length: 9 }).map((_, j) => (
                  <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                ))}
              </tr>
            )) : filtered.map((ad) => (
              <tr key={ad.id} className="border-b border-border/20 hover:bg-accent/30 transition-colors cursor-pointer" onClick={() => setSelectedAd(ad)}>
                <td className="px-4 py-2">
                  {ad.creative?.thumbnailUrl ? (
                    <img src={ad.creative.thumbnailUrl} alt="" className="w-10 h-10 rounded object-cover border border-border/40" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-muted/30 border border-border/40" />
                  )}
                </td>
                <td className="px-4 py-2 font-medium max-w-[220px]">
                  <div className="truncate">{ad.name}</div>
                  {ad.creative?.title && <div className="text-xs text-muted-foreground truncate mt-0.5">{ad.creative.title}</div>}
                </td>
                <td className="px-4 py-2 text-center">
                  <Badge variant={ad.status === 'ACTIVE' ? 'success' : 'muted'}>
                    {ad.status === 'ACTIVE' ? 'Ativo' : 'Pausado'}
                  </Badge>
                </td>
                <td className="px-4 py-2 text-right">{fmtBRL(ad.insights?.spend ?? 0)}</td>
                <td className="px-4 py-2 text-right">{fmtNumber(ad.insights?.impressions ?? 0)}</td>
                <td className="px-4 py-2 text-right">{fmtNumber(ad.insights?.clicks ?? 0)}</td>
                <td className="px-4 py-2 text-right">{fmtPct(ad.insights?.ctr ?? 0)}</td>
                <td className="px-4 py-2 text-right">{fmtNumber(ad.insights?.purchases ?? 0)}</td>
                <td className="px-4 py-2 text-right text-emerald-400 font-medium">{fmtMultiplier(ad.insights?.roas ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">Nenhum anúncio encontrado.</div>
        )}
      </div>

      <AdPreviewModal ad={selectedAd} onClose={() => setSelectedAd(null)} />
    </div>
  )
}
