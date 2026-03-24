import { useState } from 'react'
import { LayoutGrid, ChevronDown, X } from 'lucide-react'
import { Button } from './ui/Button'
import { useCampaigns } from '../hooks/useCampaigns'
import { useDashboardStore } from '../store/dashboardStore'

export function CampaignSelector() {
  const [open, setOpen] = useState(false)
  const { selectedCampaignIds, setSelectedCampaignIds } = useDashboardStore()
  const { data: campaigns, isLoading } = useCampaigns()

  if (isLoading || !campaigns?.length) return null

  const count = selectedCampaignIds.length
  const label = count === 0
    ? 'Todas as campanhas'
    : count === 1
      ? (campaigns.find(c => c.id === selectedCampaignIds[0])?.name ?? '1 campanha')
      : `${count} campanhas`

  function toggle(id: string) {
    setSelectedCampaignIds(
      selectedCampaignIds.includes(id)
        ? selectedCampaignIds.filter(x => x !== id)
        : [...selectedCampaignIds, id]
    )
  }

  function toggleAll() {
    if (selectedCampaignIds.length === campaigns!.length) {
      setSelectedCampaignIds([])
    } else {
      setSelectedCampaignIds(campaigns!.map(c => c.id))
    }
  }

  function clearAll() {
    setSelectedCampaignIds([])
    setOpen(false)
  }

  const allSelected = selectedCampaignIds.length === campaigns.length
  const someSelected = selectedCampaignIds.length > 0 && !allSelected

  return (
    <div className="relative">
      <Button
        variant={count > 0 ? 'default' : 'outline'}
        size="sm"
        className="gap-2 max-w-[220px]"
        onClick={() => setOpen(!open)}
      >
        <LayoutGrid className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="truncate">{label}</span>
        {count > 0 ? (
          <span
            className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary-foreground/20 text-[10px] font-bold flex-shrink-0"
            onClick={(e) => { e.stopPropagation(); clearAll() }}
          >
            <X className="h-2.5 w-2.5" />
          </span>
        ) : (
          <ChevronDown className="h-3.5 w-3.5 opacity-50 flex-shrink-0" />
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 z-50 glass-card border border-border/60 rounded-lg shadow-xl min-w-[280px] max-h-80 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/40">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Filtrar campanhas</span>
              {count > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs text-primary hover:underline"
                >
                  Limpar ({count})
                </button>
              )}
            </div>

            {/* Selecionar todas */}
            <label className="flex items-center gap-3 px-3 py-2 hover:bg-accent transition-colors cursor-pointer border-b border-border/20">
              <div className={`h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                allSelected
                  ? 'bg-primary border-primary'
                  : someSelected
                    ? 'bg-primary/30 border-primary'
                    : 'border-border'
              }`}>
                {allSelected && (
                  <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {someSelected && <div className="h-1.5 w-1.5 bg-white rounded-sm" />}
              </div>
              <span className="text-sm font-medium" onClick={toggleAll}>
                {allSelected ? 'Desmarcar todas' : 'Selecionar todas'}
              </span>
            </label>

            {/* Lista de campanhas */}
            <div className="overflow-y-auto flex-1 py-1">
              {campaigns.map((campaign) => {
                const checked = selectedCampaignIds.includes(campaign.id)
                return (
                  <label
                    key={campaign.id}
                    className="flex items-start gap-3 px-3 py-2 hover:bg-accent transition-colors cursor-pointer"
                    onClick={() => toggle(campaign.id)}
                  >
                    <div className={`mt-0.5 h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                      checked ? 'bg-primary border-primary' : 'border-border'
                    }`}>
                      {checked && (
                        <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium leading-tight">{campaign.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs ${campaign.status === 'ACTIVE' ? 'text-success' : 'text-muted-foreground'}`}>
                          ● {campaign.status === 'ACTIVE' ? 'Ativo' : campaign.status === 'PAUSED' ? 'Pausado' : campaign.status}
                        </span>
                        {campaign.insights?.spend != null && campaign.insights.spend > 0 && (
                          <span className="text-xs text-muted-foreground">
                            R$ {campaign.insights.spend.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
