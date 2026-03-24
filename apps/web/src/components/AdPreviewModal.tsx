import { X, ExternalLink, TrendingUp, TrendingDown } from 'lucide-react'
import { Badge } from './ui/Badge'
import { useAds } from '../hooks/useAds'
import { fmtBRL, fmtNumber, fmtPct, fmtMultiplier } from '../lib/format'
import type { Ad } from '@adspro/types'

interface AdPreviewModalProps {
  ad: Ad | null
  onClose: () => void
}

function MetricRow({ label, value, isGood }: { label: string; value: string; isGood?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium ${isGood === true ? 'text-success' : isGood === false ? 'text-destructive' : ''}`}>
        {value}
      </span>
    </div>
  )
}

export function AdPreviewModal({ ad, onClose }: AdPreviewModalProps) {
  if (!ad) return null

  const ins = ad.insights

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/40 sticky top-0 bg-card z-10">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="font-semibold truncate">{ad.name}</h2>
            <Badge variant={ad.status === 'ACTIVE' ? 'success' : 'muted'} className="mt-1 text-xs">
              {ad.status === 'ACTIVE' ? 'Ativo' : ad.status === 'PAUSED' ? 'Pausado' : ad.status}
            </Badge>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-accent transition-colors flex-shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Preview do criativo */}
          <div>
            <h3 className="text-sm font-medium mb-3">Criativo</h3>
            {ad.creative?.thumbnailUrl ? (
              <img
                src={ad.creative.thumbnailUrl}
                alt="Thumbnail do anúncio"
                className="w-full aspect-video object-cover rounded-lg border border-border/40"
              />
            ) : (
              <div className="w-full aspect-video bg-muted/30 rounded-lg border border-border/40 flex items-center justify-center">
                <span className="text-sm text-muted-foreground">Sem preview disponível</span>
              </div>
            )}

            {ad.creative?.title && (
              <div className="mt-3 p-3 bg-muted/20 rounded-md">
                <p className="text-sm font-medium">{ad.creative.title}</p>
                {ad.creative.body && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{ad.creative.body}</p>
                )}
                {ad.creative.callToAction && (
                  <span className="inline-flex items-center gap-1 mt-2 text-xs text-primary">
                    <ExternalLink className="h-3 w-3" />
                    {ad.creative.callToAction}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Métricas */}
          <div>
            <h3 className="text-sm font-medium mb-3">Métricas do Período</h3>
            <div className="glass-card p-4">
              <MetricRow label="Investimento" value={fmtBRL(ins?.spend ?? 0)} />
              <MetricRow label="Receita em Compras" value={fmtBRL(ins?.purchaseValue ?? 0)} />
              <MetricRow label="ROAS" value={fmtMultiplier(ins?.roas ?? 0)} isGood={(ins?.roas ?? 0) >= 2} />
              <MetricRow label="Compras" value={fmtNumber(ins?.purchases ?? 0)} />
              <MetricRow label="CPA" value={ins?.costPerPurchase ? fmtBRL(ins.costPerPurchase) : '—'} isGood={!ins?.costPerPurchase || ins.costPerPurchase < 100} />
              <MetricRow label="Impressões" value={fmtNumber(ins?.impressions ?? 0)} />
              <MetricRow label="Alcance" value={fmtNumber(ins?.reach ?? 0)} />
              <MetricRow label="Cliques" value={fmtNumber(ins?.clicks ?? 0)} />
              <MetricRow label="CTR" value={fmtPct(ins?.ctr ?? 0)} isGood={(ins?.ctr ?? 0) > 1} />
              <MetricRow label="CPM" value={fmtBRL(ins?.cpm ?? 0)} />
              <MetricRow label="CPC" value={fmtBRL(ins?.cpc ?? 0)} />
              <MetricRow label="Frequência" value={fmtMultiplier(ins?.frequency ?? 0, 1)} isGood={(ins?.frequency ?? 0) < 3} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
