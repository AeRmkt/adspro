import { useState } from 'react'
import {
  Building2, RefreshCw, Loader2, Trash2, ChevronRight,
  Users, CheckCircle, AlertCircle, Plus,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getBusinessManagers, syncBusinessManagers, syncBMAccounts, deleteBusinessManager,
  getMetaStatus,
} from '../services/api'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { toast } from '../components/ui/useToast'
import { fmtDate } from '../lib/format'

export default function BusinessManagers() {
  const queryClient = useQueryClient()
  const [syncingBmId, setSyncingBmId] = useState<string | null>(null)

  const { data: metaStatus } = useQuery({
    queryKey: ['meta-status'],
    queryFn: getMetaStatus,
  })

  const { data: bms, isLoading } = useQuery({
    queryKey: ['business-managers'],
    queryFn: getBusinessManagers,
  })

  const syncMutation = useMutation({
    mutationFn: syncBusinessManagers,
    onSuccess: (res) => {
      toast({ title: `${res.synced} Business Manager(s) sincronizado(s)`, variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['business-managers'] })
    },
    onError: (err) => toast({ title: 'Erro', description: (err as Error).message, variant: 'destructive' }),
  })

  const syncAccountsMutation = useMutation({
    mutationFn: (bmId: string) => syncBMAccounts(bmId),
    onMutate: (bmId) => setSyncingBmId(bmId),
    onSuccess: (res) => {
      toast({ title: `${res.synced} conta(s) importada(s) com sucesso`, variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['business-managers'] })
    },
    onError: (err) => toast({ title: 'Erro ao sincronizar contas', description: (err as Error).message, variant: 'destructive' }),
    onSettled: () => setSyncingBmId(null),
  })

  const deleteMutation = useMutation({
    mutationFn: (bmId: string) => deleteBusinessManager(bmId),
    onSuccess: () => {
      toast({ title: 'Business Manager removido', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['business-managers'] })
    },
    onError: (err) => toast({ title: 'Erro', description: (err as Error).message, variant: 'destructive' }),
  })

  const notConnected = !metaStatus?.connected

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Business Managers
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie suas contas do Facebook Business Manager
          </p>
        </div>
        <Button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending || notConnected}
          className="gap-2"
        >
          {syncMutation.isPending
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <RefreshCw className="h-4 w-4" />}
          Sincronizar BMs
        </Button>
      </div>

      {/* Aviso sem conexão */}
      {notConnected && (
        <div className="glass-card p-4 flex items-center gap-3 border border-warning/30 bg-warning/5">
          <AlertCircle className="h-5 w-5 text-warning flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">Conta Meta não conectada</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Conecte sua conta nas <a href="/configuracoes" className="text-primary underline">Configurações</a> para sincronizar Business Managers.
            </p>
          </div>
        </div>
      )}

      {/* Lista de BMs */}
      <div className="glass-card divide-y divide-border/40">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-8 w-32" />
            </div>
          ))
        ) : bms?.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhum Business Manager encontrado</p>
            <p className="text-sm mt-1">
              {notConnected
                ? 'Conecte sua conta Meta primeiro.'
                : 'Clique em "Sincronizar BMs" para importar.'}
            </p>
          </div>
        ) : (
          bms?.map((bm) => (
            <div
              key={bm.id}
              className="p-4 flex items-center gap-4 hover:bg-accent/20 transition-colors"
            >
              <div className="w-10 h-10 bg-primary/10 rounded-md flex items-center justify-center flex-shrink-0">
                <Building2 className="h-5 w-5 text-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{bm.bmName}</div>
                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                  <span>ID: {bm.bmId}</span>
                  {bm.syncedAt && (
                    <>
                      <ChevronRight className="h-3 w-3" />
                      <span>Última sync: {fmtDate(bm.syncedAt.split('T')[0])}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {bm.syncedAt ? (
                  <Badge variant="success" className="text-xs gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Sincronizado
                  </Badge>
                ) : (
                  <Badge variant="muted" className="text-xs">
                    Não sincronizado
                  </Badge>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={syncingBmId === bm.bmId}
                  onClick={() => syncAccountsMutation.mutate(bm.bmId)}
                >
                  {syncingBmId === bm.bmId
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Users className="h-3.5 w-3.5" />}
                  Importar Contas
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive h-8 w-8"
                  onClick={() => deleteMutation.mutate(bm.bmId)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Info card */}
      <div className="glass-card p-4 flex items-start gap-3">
        <Plus className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-sm">Como funciona?</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Sincronize seus Business Managers para importar automaticamente todas as contas de anúncio
            vinculadas — incluindo contas de clientes. Use <strong>"Importar Contas"</strong> em cada BM
            para adicionar as contas ao seu painel.
          </p>
        </div>
      </div>
    </div>
  )
}
