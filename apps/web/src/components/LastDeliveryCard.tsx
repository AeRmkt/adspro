import { useMemo, useState } from 'react'
import { Activity, AlertTriangle, ChevronRight, RefreshCw, Radio } from 'lucide-react'
import { MagicCard } from './ui/MagicCard'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { Skeleton } from './ui/Skeleton'
import { useLastDelivery } from '../hooks/useLastDelivery'
import { fmtBRL, fmtDate } from '../lib/format'
import { cn } from '../lib/utils'
import type { AdAccount, AccountLastDelivery, CampaignLastDelivery } from '@adspro/types'

/** Filtros de inatividade. `min` = dias parados a partir de. */
const FILTERS = [
  { label: 'Todas', min: 0 },
  { label: 'Inativa 3d+', min: 3 },
  { label: 'Inativa 7d+', min: 7 },
  { label: 'Inativa 14d+', min: 14 },
  { label: 'Inativa 30d+', min: 30 },
] as const

/** Verde entregando, âmbar folga curta, vermelho parou de verdade. */
function severity(daysSince: number | null) {
  if (daysSince == null) return 'dead'
  if (daysSince <= 1) return 'live'
  if (daysSince < 7) return 'warn'
  return 'dead'
}

function StatusDot({ daysSince }: { daysSince: number | null }) {
  const s = severity(daysSince)
  return (
    <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
      {s === 'live' && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
      )}
      <span
        className={cn(
          'relative inline-flex h-2.5 w-2.5 rounded-full',
          s === 'live' && 'bg-emerald-500',
          s === 'warn' && 'bg-amber-400',
          s === 'dead' && 'bg-red-500'
        )}
      />
    </span>
  )
}

function sinceLabel(daysSince: number | null, lookback = 90) {
  if (daysSince == null) return `sem entrega há ${lookback}+ dias`
  if (daysSince === 0) return 'entregando hoje'
  if (daysSince === 1) return 'ontem'
  return `parada há ${daysSince} dias`
}

function CampaignRow({ c }: { c: CampaignLastDelivery }) {
  return (
    <div className="flex items-center gap-3 py-2 pl-6 pr-1 border-t border-border/30">
      <StatusDot daysSince={c.daysSince} />
      <span className="flex-1 truncate text-sm" title={c.name}>{c.name}</span>
      <span className="text-xs text-muted-foreground tabular-nums hidden sm:inline">
        {fmtBRL(c.spend)}
      </span>
      <span
        className={cn(
          'text-xs tabular-nums w-32 text-right',
          severity(c.daysSince) === 'dead' ? 'text-red-400' : 'text-muted-foreground'
        )}
      >
        {sinceLabel(c.daysSince)}
      </span>
    </div>
  )
}

function AccountRow({
  row,
  name,
  minDays,
}: {
  row: AccountLastDelivery
  name: string
  minDays: number
}) {
  const [open, setOpen] = useState(false)

  // O filtro vale para as campanhas; a conta aparece se alguma sobreviver.
  const campaigns = useMemo(
    () => row.campaigns.filter((c) => c.daysSince >= minDays),
    [row.campaigns, minDays]
  )

  if (row.error) {
    return (
      <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-amber-400/5 border border-amber-400/20">
        <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
        <span className="flex-1 truncate text-sm">{name}</span>
        <span className="text-xs text-amber-400 truncate max-w-[50%]" title={row.error}>
          {row.error}
        </span>
      </div>
    )
  }

  if (minDays > 0 && campaigns.length === 0) return null

  return (
    <div className="rounded-lg border border-border/40 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-accent/50 transition-colors"
      >
        <StatusDot daysSince={row.daysSince} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{name}</p>
          <p className="text-xs text-muted-foreground">
            {row.lastDelivery ? `última entrega em ${fmtDate(row.lastDelivery)}` : 'nenhuma entrega no período'}
          </p>
        </div>
        {minDays > 0 && campaigns.length > 0 && (
          <Badge variant="destructive" className="text-[10px]">
            {campaigns.length} parada{campaigns.length === 1 ? '' : 's'}
          </Badge>
        )}
        <span
          className={cn(
            'text-xs tabular-nums hidden sm:inline',
            severity(row.daysSince) === 'dead' ? 'text-red-400' : 'text-muted-foreground'
          )}
        >
          {sinceLabel(row.daysSince, row.lookbackDays)}
        </span>
        <ChevronRight className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-90')} />
      </button>

      {open && (
        <div className="bg-background/40">
          {campaigns.length === 0 ? (
            <p className="py-3 pl-6 text-xs text-muted-foreground border-t border-border/30">
              Nenhuma campanha com entrega no período varrido.
            </p>
          ) : (
            campaigns.map((c) => <CampaignRow key={c.id} c={c} />)
          )}
        </div>
      )}
    </div>
  )
}

export function LastDeliveryCard({ accounts }: { accounts: AdAccount[] }) {
  const [checked, setChecked] = useState(false)
  const [minDays, setMinDays] = useState<number>(0)

  const ids = useMemo(() => accounts.map((a) => a.metaAccountId), [accounts])
  const { data, isFetching, refetch, error } = useLastDelivery(ids, checked)

  const nameOf = (id: string) =>
    accounts.find((a) => a.metaAccountId === id)?.accountName ?? `act_${id}`

  const stopped = useMemo(
    () => (data ?? []).filter((r) => !r.error && (r.daysSince == null || r.daysSince >= 3)).length,
    [data]
  )

  return (
    <MagicCard className="glass-card rounded-xl p-5">
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Radio className="h-4 w-4 text-primary" /> Última veiculação
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Detecta conta ou campanha que parou de entregar — saldo zerado, rejeição ou pausa esquecida.
          </p>
        </div>
        <Button
          variant={checked ? 'outline' : 'default'}
          size="sm"
          className="gap-2"
          disabled={isFetching || ids.length === 0}
          onClick={() => (checked ? refetch() : setChecked(true))}
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          {checked ? 'Verificar novamente' : 'Verificar'}
        </Button>
      </div>

      {!checked ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <Activity className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Clique em <strong className="text-foreground">Verificar</strong> para varrer os últimos 90 dias
            de cada conta.
          </p>
        </div>
      ) : error ? (
        <p className="py-8 text-center text-sm text-destructive">
          {(error as Error).message}
        </p>
      ) : isFetching && !data ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {FILTERS.map((f) => (
              <button
                key={f.label}
                onClick={() => setMinDays(f.min)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs transition-colors',
                  minDays === f.min
                    ? 'border-primary/40 bg-primary/15 text-primary'
                    : 'border-border/50 text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                {f.label}
              </button>
            ))}
            {stopped > 0 && (
              <span className="ml-auto self-center text-xs text-red-400">
                {stopped} conta{stopped === 1 ? '' : 's'} sem entregar há 3+ dias
              </span>
            )}
          </div>

          <div className="space-y-2">
            {(data ?? []).map((row) => (
              <AccountRow key={row.accountId} row={row} name={nameOf(row.accountId)} minDays={minDays} />
            ))}
          </div>
        </>
      )}
    </MagicCard>
  )
}
