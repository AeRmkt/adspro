import { useState } from 'react'
import { Trash2, Plus, RefreshCw, AlertTriangle } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAdAccounts } from '../hooks/useAdAccounts'
import { deleteAccount, invalidateCache } from '../services/api'
import { ConnectMetaModal } from '../components/ConnectMetaModal'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { toast } from '../components/ui/useToast'
import { fmtDate } from '../lib/format'

export default function Settings() {
  const { data: accounts, isLoading } = useAdAccounts()
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      toast({ title: 'Conta removida', description: 'A conta foi desconectada com sucesso.', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      setDeletingId(null)
    },
    onError: (err) => {
      toast({ title: 'Erro', description: (err as Error).message, variant: 'destructive' })
      setDeletingId(null)
    },
  })

  const cacheMutation = useMutation({
    mutationFn: invalidateCache,
    onSuccess: () => {
      toast({ title: 'Cache limpo', description: 'O cache da conta foi invalidado.', variant: 'success' })
    },
  })

  return (
    <div className="p-6 space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Gerencie suas contas e preferências</p>
      </div>

      {/* Contas Conectadas */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Contas Meta Ads</h2>
          <Button size="sm" className="gap-2" onClick={() => setShowConnectModal(true)}>
            <Plus className="h-4 w-4" />
            Adicionar Conta
          </Button>
        </div>

        <div className="glass-card divide-y divide-border/40">
          {isLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="p-4 flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))
          ) : accounts?.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>Nenhuma conta conectada.</p>
            </div>
          ) : (
            accounts?.map((account) => (
              <div key={account.id} className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-md flex items-center justify-center flex-shrink-0 text-primary font-bold text-sm">
                  {account.accountName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{account.accountName}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    ID: {account.metaAccountId} · Conectada em {fmtDate(account.connectedAt.split('T')[0])}
                    {account.lastSyncAt && ` · Sync: ${fmtDate(account.lastSyncAt.split('T')[0])}`}
                  </div>
                </div>
                <Badge variant={account.isActive ? 'success' : 'muted'}>
                  {account.isActive ? 'Ativa' : 'Inativa'}
                </Badge>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    title="Limpar cache"
                    onClick={() => cacheMutation.mutate(account.id)}
                    disabled={cacheMutation.isPending}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${cacheMutation.isPending ? 'animate-spin' : ''}`} />
                  </Button>

                  {deletingId === account.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-destructive">Confirmar?</span>
                      <Button size="sm" variant="destructive" className="h-7" onClick={() => deleteMutation.mutate(account.id)}>Sim</Button>
                      <Button size="sm" variant="ghost" className="h-7" onClick={() => setDeletingId(null)}>Não</Button>
                    </div>
                  ) : (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeletingId(account.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Aviso de segurança */}
      <section className="bg-warning/10 border border-warning/30 rounded-lg p-4 flex gap-3">
        <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-medium text-warning">Segurança dos Tokens</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Seus Access Tokens Meta são criptografados com AES-256-GCM antes de serem armazenados.
            Eles nunca são expostos ao frontend. Renove seus tokens periodicamente no Graph API Explorer.
          </p>
        </div>
      </section>

      <ConnectMetaModal open={showConnectModal} onClose={() => setShowConnectModal(false)} />
    </div>
  )
}
