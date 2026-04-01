import { RefreshCw, AlertTriangle, Building2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Button } from './ui/Button'
import { getMetaAdAccounts } from '../services/api'
import type { MetaAdAccount } from '@adspro/types'

// Mapeamento de status conforme documentação Meta
const ACCOUNT_STATUS_MAP: Record<number, { label: string; className: string }> = {
  1: { label: 'Ativo', className: 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30' },
  2: { label: 'Desativado', className: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30' },
  3: { label: 'Pendente', className: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30' },
  7: { label: 'Em revisão', className: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30' },
  8: { label: 'Aguardando', className: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30' },
  9: { label: 'Em carência', className: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30' },
  100: { label: 'Encerrando', className: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30' },
  101: { label: 'Encerrado', className: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30' },
}

function statusBadge(status: number | null) {
  if (status === null) return null
  const s = ACCOUNT_STATUS_MAP[status] ?? { label: `Status ${status}`, className: 'bg-muted text-muted-foreground border-border' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${s.className}`}>
      {s.label}
    </span>
  )
}

function SkeletonCard() {
  return (
    <div className="glass-card p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="h-4 bg-muted rounded w-2/3" />
        <div className="h-5 bg-muted rounded-full w-16" />
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-muted rounded w-1/3" />
        <div className="h-3 bg-muted rounded w-1/2" />
        <div className="h-3 bg-muted rounded w-2/5" />
      </div>
    </div>
  )
}

function AccountCard({ account }: { account: MetaAdAccount }) {
  return (
    <div className="glass-card p-4 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="font-medium text-sm truncate" title={account.accountName}>{account.accountName}</p>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">act_{account.metaAccountId}</p>
        </div>
        {statusBadge(account.accountStatus)}
      </div>
      <div className="space-y-1.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="w-14 shrink-0">Moeda</span>
          <span className="font-medium text-foreground">{account.currency}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-14 shrink-0">Fuso</span>
          <span className="font-medium text-foreground truncate" title={account.timezone}>{account.timezone}</span>
        </div>
        {account.lastSyncAt && (
          <div className="flex items-center gap-1.5">
            <span className="w-14 shrink-0">Sync</span>
            <span>{new Date(account.lastSyncAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
          </div>
        )}
      </div>
    </div>
  )
}

interface AdAccountsListProps {
  visible: boolean
}

export function AdAccountsList({ visible }: AdAccountsListProps) {
  const { data: accounts, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['meta-ad-accounts'],
    queryFn: getMetaAdAccounts,
    enabled: visible,
    staleTime: 5 * 60_000,
    retry: false,
  })

  if (!visible) return null

  const isTokenError = (error as { code?: string })?.code === 'TOKEN_INVALID' ||
    (error as Error)?.message?.includes('Token expirado')

  return (
    <div className="space-y-4">
      {/* Header da seção */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Contas de Anúncio</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Contas disponíveis na sua conta Meta Business
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => refetch()}
          disabled={isLoading || isFetching}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Sincronizar
        </Button>
      </div>

      {/* Estados */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {isError && (
        <div className="glass-card p-6 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">
              {isTokenError ? 'Token Meta expirado' : 'Erro ao buscar contas'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {isTokenError
                ? 'Seu token de acesso expirou. Desconecte e reconecte sua conta Meta para renovar.'
                : (error as Error)?.message ?? 'Erro desconhecido. Tente sincronizar novamente.'}
            </p>
          </div>
        </div>
      )}

      {!isLoading && !isError && accounts && accounts.length === 0 && (
        <div className="glass-card p-10 text-center">
          <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">Nenhuma conta de anúncio encontrada</p>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Verifique se sua conta Meta possui acesso a contas de anúncio ou se as permissões foram concedidas corretamente.
          </p>
        </div>
      )}

      {!isLoading && !isError && accounts && accounts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {accounts.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
        </div>
      )}
    </div>
  )
}
