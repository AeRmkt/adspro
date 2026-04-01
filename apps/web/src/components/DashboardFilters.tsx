import { useState } from 'react'
import { CalendarDays, ChevronDown, RefreshCw } from 'lucide-react'
import { Button } from './ui/Button'
import { useDashboardStore } from '../store/dashboardStore'
import { useAdAccounts } from '../hooks/useAdAccounts'
import { useQueryClient } from '@tanstack/react-query'
import { getDatePreset } from '@adspro/utils'
import { fmtDate } from '../lib/format'

const DATE_PRESETS = [
  { label: 'Hoje', value: 'today' },
  { label: 'Ontem', value: 'yesterday' },
  { label: 'Últimos 7 dias', value: 'last7' },
  { label: 'Últimos 14 dias', value: 'last14' },
  { label: 'Últimos 30 dias', value: 'last30' },
  { label: 'Este mês', value: 'thisMonth' },
  { label: 'Mês passado', value: 'lastMonth' },
] as const

interface DashboardFiltersProps {
  onCompare?: () => void
}

export function DashboardFilters({ onCompare }: DashboardFiltersProps) {
  const { selectedAccountId, dateRange, setSelectedAccount, setDateRange } = useDashboardStore()
  const { data: accounts, isLoading } = useAdAccounts()
  const queryClient = useQueryClient()
  const [showDateMenu, setShowDateMenu] = useState(false)
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showCustom, setShowCustom] = useState(false)
  const [customFrom, setCustomFrom] = useState(dateRange.from)
  const [customTo, setCustomTo] = useState(dateRange.to)

  const selectedAccount = accounts?.find((a) => a.id === selectedAccountId)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await queryClient.invalidateQueries()
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  const handlePreset = (preset: typeof DATE_PRESETS[number]['value']) => {
    setDateRange(getDatePreset(preset))
    setShowDateMenu(false)
    setShowCustom(false)
  }

  const handleApplyCustom = () => {
    if (!customFrom || !customTo || customFrom > customTo) return
    setDateRange({ from: customFrom, to: customTo })
    setShowDateMenu(false)
    setShowCustom(false)
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Seletor de Conta */}
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setShowAccountMenu(!showAccountMenu)}
        >
          <span className="w-2 h-2 rounded-full bg-success flex-shrink-0" />
          <span className="max-w-[160px] truncate">
            {isLoading
              ? 'Carregando...'
              : selectedAccount?.accountName || 'Selecionar conta'}
          </span>
          <ChevronDown className="h-3.5 w-3.5 opacity-50" />
        </Button>

        {showAccountMenu && (
          <div className="absolute top-full mt-1 left-0 z-50 glass-card border border-border/60 rounded-lg shadow-xl min-w-[220px] py-1">
            {accounts?.map((account) => (
              <button
                key={account.id}
                onClick={() => {
                  setSelectedAccount(account.id)
                  setShowAccountMenu(false)
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${
                  selectedAccountId === account.id ? 'text-primary' : 'text-foreground'
                }`}
              >
                <div className="font-medium">{account.accountName}</div>
                <div className="text-xs text-muted-foreground">ID: {account.metaAccountId}</div>
              </button>
            ))}
            {!accounts?.length && (
              <div className="px-3 py-2 text-sm text-muted-foreground">Nenhuma conta conectada</div>
            )}
          </div>
        )}
      </div>

      {/* Seletor de Período */}
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => { setShowDateMenu(!showDateMenu); setShowCustom(false) }}
        >
          <CalendarDays className="h-3.5 w-3.5 opacity-70" />
          <span>{fmtDate(dateRange.from)} — {fmtDate(dateRange.to)}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-50" />
        </Button>

        {showDateMenu && (
          <div className="absolute top-full mt-1 left-0 z-50 glass-card border border-border/60 rounded-lg shadow-xl min-w-[220px] py-1">
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => handlePreset(preset.value)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors text-foreground"
              >
                {preset.label}
              </button>
            ))}
            <div className="border-t border-border/40 my-1" />
            <button
              onClick={() => { setCustomFrom(dateRange.from); setCustomTo(dateRange.to); setShowCustom(!showCustom) }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors text-foreground"
            >
              Personalizado...
            </button>
            {showCustom && (
              <div className="px-3 pb-3 pt-1 flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">De</label>
                  <input
                    type="date"
                    value={customFrom}
                    max={customTo}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="w-full rounded-md border border-border/60 bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">Até</label>
                  <input
                    type="date"
                    value={customTo}
                    min={customFrom}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="w-full rounded-md border border-border/60 bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <Button
                  size="sm"
                  className="w-full mt-1"
                  disabled={!customFrom || !customTo || customFrom > customTo}
                  onClick={handleApplyCustom}
                >
                  Aplicar
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Botões de ação */}
      {onCompare && (
        <Button variant="outline" size="sm" onClick={onCompare}>
          Comparar Períodos
        </Button>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={handleRefresh}
        title="Atualizar dados"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  )
}
