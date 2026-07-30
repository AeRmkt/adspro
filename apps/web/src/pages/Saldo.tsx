import { Wallet, TrendingUp, AlertTriangle, CircleDollarSign } from 'lucide-react'
import { useAdAccounts } from '../hooks/useAdAccounts'
import { LastDeliveryCard } from '../components/LastDeliveryCard'
import { MagicCard } from '../components/ui/MagicCard'
import { NumberTicker } from '../components/ui/NumberTicker'
import { Skeleton } from '../components/ui/Skeleton'
import { Badge } from '../components/ui/Badge'
import { fmtBRL } from '../lib/format'
import { cn } from '../lib/utils'
import type { AdAccount } from '@adspro/types'

function accStatusBadge(status?: number) {
  // 1 = ativa; 2 = desativada; 3 = não paga; outros = pendências
  if (status === 1) return <Badge variant="success" className="text-[10px]">Ativa</Badge>
  if (status === 2) return <Badge variant="muted" className="text-[10px]">Desativada</Badge>
  if (status === 3) return <Badge variant="destructive" className="text-[10px]">Não paga</Badge>
  return <Badge variant="warning" className="text-[10px]">Pendência</Badge>
}

function AccountCard({ acc }: { acc: AdAccount }) {
  const lowBalance = acc.balance != null && acc.balance >= 0 && acc.balance < 20
  return (
    <MagicCard className="glass-card rounded-xl p-5">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold truncate">{acc.accountName}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">act_{acc.metaAccountId} · {acc.currency}</p>
        </div>
        {accStatusBadge(acc.accountStatus)}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <CircleDollarSign className="h-4 w-4 text-primary" /> Saldo atual
          </span>
          <span className={cn('text-lg font-bold tabular-nums', lowBalance && 'text-amber-400')}>
            {acc.balance != null ? fmtBRL(acc.balance) : '—'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-emerald-500" /> Gasto acumulado
          </span>
          <span className="text-sm font-semibold tabular-nums">
            {acc.amountSpent != null ? fmtBRL(acc.amountSpent) : '—'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Limite de gasto</span>
          <span className="text-sm font-semibold tabular-nums">
            {acc.spendCap != null ? fmtBRL(acc.spendCap) : 'Sem limite'}
          </span>
        </div>
      </div>

      {lowBalance && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-400/10 border border-amber-400/30 px-3 py-2 text-xs text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" /> Saldo baixo — considere recarregar.
        </div>
      )}
    </MagicCard>
  )
}

export default function Saldo() {
  const { data: accounts, isLoading } = useAdAccounts()

  const totalSpent = (accounts ?? []).reduce((s, a) => s + (a.amountSpent ?? 0), 0)
  const totalBalance = (accounts ?? []).reduce((s, a) => s + (a.balance ?? 0), 0)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
          <Wallet className="h-6 w-6 text-primary" /> Saldo das Contas
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Saldo, gasto acumulado e limite de cada conta de anúncios conectada.
        </p>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MagicCard className="glass-card rounded-xl p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Saldo total</p>
          <p className="text-2xl font-bold mt-1 tabular-nums">
            <NumberTicker value={totalBalance} format={fmtBRL} />
          </p>
        </MagicCard>
        <MagicCard className="glass-card rounded-xl p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Gasto acumulado total</p>
          <p className="text-2xl font-bold mt-1 tabular-nums">
            <NumberTicker value={totalSpent} format={fmtBRL} />
          </p>
        </MagicCard>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
        </div>
      ) : !accounts?.length ? (
        <div className="glass-card p-10 text-center text-sm text-muted-foreground">
          Nenhuma conta conectada ainda.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {accounts.map((acc) => <AccountCard key={acc.id} acc={acc} />)}
          </div>
          <LastDeliveryCard accounts={accounts} />
        </>
      )}
    </div>
  )
}
