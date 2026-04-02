import { useState, useRef } from 'react'
import { Building2, RefreshCw, Unlink, AlertTriangle, Plus, Trash2, Star, Search, CheckCircle, Loader2, Facebook } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAdAccounts } from '../hooks/useAdAccounts'
import {
  deleteAccount, invalidateCache, getMetaStatus, disconnectMeta,
  getMetaOAuthUrl, setPrincipalAccount,
} from '../services/api'
import { ConnectMetaModal } from '../components/ConnectMetaModal'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { toast } from '../components/ui/useToast'
import { fmtDate, fmtNumber } from '../lib/format'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'hoje'
  if (days === 1) return 'há 1 dia'
  if (days < 30) return `há ${days} dias`
  const months = Math.floor(days / 30)
  if (months === 1) return 'há cerca de 1 mês'
  return `há ${months} meses`
}

export default function Settings() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: accounts, isLoading: accountsLoading } = useAdAccounts()
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [search, setSearch] = useState('')
  const [oauthLoading, setOauthLoading] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const accountsSectionRef = useRef<HTMLDivElement>(null)

  const { data: metaStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['meta-status'],
    queryFn: getMetaStatus,
    staleTime: 30_000,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      toast({ title: 'Conta removida', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
    onError: (err) => toast({ title: 'Erro', description: (err as Error).message, variant: 'destructive' }),
  })

  const principalMutation = useMutation({
    mutationFn: setPrincipalAccount,
    onSuccess: () => {
      toast({ title: 'Conta principal definida', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
    onError: (err) => toast({ title: 'Erro', description: (err as Error).message, variant: 'destructive' }),
  })

  const cacheMutation = useMutation({
    mutationFn: invalidateCache,
    onSuccess: () => toast({ title: 'Cache limpo', variant: 'success' }),
  })

  const handleOAuth = async () => {
    setOauthLoading(true)
    try {
      const { url } = await getMetaOAuthUrl()
      window.location.href = url
    } catch (err) {
      toast({ title: 'Erro', description: (err as Error).message, variant: 'destructive' })
      setOauthLoading(false)
    }
  }

  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      await disconnectMeta()
      toast({ title: 'Conta Meta desconectada', variant: 'default' })
      queryClient.invalidateQueries({ queryKey: ['meta-status'] })
    } catch (err) {
      toast({ title: 'Erro ao desconectar', description: (err as Error).message, variant: 'destructive' })
    } finally {
      setDisconnecting(false)
    }
  }

  const isConnected = metaStatus?.connected ?? false
  const connection = metaStatus?.connection
  const isTokenNearExpiry = connection
    ? new Date(connection.tokenExpiresAt).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000
    : false

  const filtered = (accounts ?? []).filter(a =>
    a.accountName.toLowerCase().includes(search.toLowerCase()) ||
    a.metaAccountId.includes(search)
  )

  const currencyLabel = (c: string) => {
    const map: Record<string, string> = { BRL: 'Real (R$)', USD: 'Dólar (US$)', EUR: 'Euro (€)' }
    return map[c] ?? c
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Gerencie suas conexões e contas de anúncio</p>
      </div>

      {/* ─── Autenticação Meta Business ──────────────────────────────────── */}
      <section className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
            <Facebook className="h-3.5 w-3.5 text-blue-400" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">Autenticação do Meta Business</h2>
            <p className="text-xs text-muted-foreground">Gerencie sua conexão com o Meta Business para acessar dados das campanhas</p>
          </div>
        </div>

        {statusLoading ? (
          <Skeleton className="h-20 rounded-lg" />
        ) : isConnected && connection ? (
          <>
            <div className="border border-border/40 rounded-lg p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Facebook className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">Conta {connection.fbUserId}</p>
                  <p className="text-xs text-muted-foreground">
                    Conectado {timeAgo(connection.createdAt)}
                  </p>
                  <p className="text-xs text-muted-foreground">Conta: {connection.fbUserName}</p>
                  {isTokenNearExpiry && (
                    <p className="text-xs text-yellow-400 mt-0.5">Problemas na conexão? Clique para reconectar</p>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 flex-shrink-0"
                onClick={handleDisconnect}
                disabled={disconnecting}
              >
                {disconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" />}
                Desconectar
              </Button>
            </div>

            {(connection.tokenInvalid || isTokenNearExpiry) && (
              <div className="border border-yellow-500/30 bg-yellow-500/5 rounded-lg p-3 flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-400">Conexão pendente com o Meta</p>
                  <p className="text-xs text-muted-foreground">Problema na conexão. Reconecte sua conta.</p>
                </div>
                <Button
                  size="sm"
                  className="gap-1.5 bg-yellow-500 hover:bg-yellow-600 text-black flex-shrink-0"
                  onClick={handleOAuth}
                  disabled={oauthLoading}
                >
                  {oauthLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Clique para reconectar
                </Button>
              </div>
            )}
          </>
        ) : (
          <Button
            className="w-full gap-3 bg-[#1877F2] hover:bg-[#166FE5] text-white border-0 h-11"
            onClick={handleOAuth}
            disabled={oauthLoading}
          >
            {oauthLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Facebook className="h-5 w-5" />}
            {oauthLoading ? 'Redirecionando...' : 'Conectar com Facebook'}
          </Button>
        )}
      </section>

      {/* ─── Business Manager ────────────────────────────────────────────── */}
      <section className="glass-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
            <Building2 className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">Conexão com Meta Business Manager (BM)</h2>
            <p className="text-xs text-muted-foreground">
              Adicione BMs para gerenciar campanhas de diferentes contas
            </p>
          </div>
        </div>
        <Button
          className="gap-2 bg-[#1877F2] hover:bg-[#166FE5] text-white border-0"
          onClick={() => navigate('/gerenciadores')}
        >
          <Building2 className="h-4 w-4" />
          Gerenciar Business Managers
        </Button>

        <div
          className="border border-primary/20 rounded-lg p-3 flex items-center justify-between cursor-pointer hover:bg-primary/5 transition-colors"
          onClick={() => accountsSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
        >
          <span className="text-sm text-muted-foreground">Conecte suas contas de anúncios abaixo</span>
          <span className="text-muted-foreground">↓</span>
        </div>
      </section>

      {/* ─── Contas de Anúncios ──────────────────────────────────────────── */}
      <section ref={accountsSectionRef} className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
            <CheckCircle className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">Contas de Anúncios do Meta</h2>
            <p className="text-xs text-muted-foreground">Conecte e gerencie suas contas de anúncios</p>
          </div>
        </div>

        <Button
          className="w-full h-11 text-sm font-semibold"
          onClick={() => setShowConnectModal(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Conta de Anúncios
        </Button>

        {/* Search + heading */}
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium">Contas conectadas Meta Ads</p>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" disabled>
            Verificar Saldos
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Busque suas contas já conectadas"
            className="w-full h-9 pl-9 pr-3 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {accountsLoading ? (
          <div className="space-y-3">
            {[0, 1].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {accounts?.length === 0 ? 'Nenhuma conta conectada ainda.' : 'Nenhuma conta encontrada.'}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((account) => (
              <div
                key={account.id}
                className={`border rounded-lg p-4 transition-colors ${
                  account.isPrincipal ? 'border-primary/50 bg-primary/5' : 'border-border/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate">{account.accountName}</p>
                      {account.isPrincipal && (
                        <Badge variant="success" className="text-xs gap-1 flex-shrink-0">
                          <Star className="h-2.5 w-2.5" /> Principal
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">ID: {account.metaAccountId}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!account.isPrincipal && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs h-8"
                        onClick={() => principalMutation.mutate(account.id)}
                        disabled={principalMutation.isPending}
                      >
                        <Star className="h-3 w-3" />
                        Tornar Principal
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs h-8 text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => deleteMutation.mutate(account.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                      Remover
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Facebook className="h-3 w-3" />
                    <span>Conta {connection?.fbUserId ?? '—'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>$ {currencyLabel(account.currency)}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-muted-foreground px-2 ml-auto"
                    onClick={() => cacheMutation.mutate(account.id)}
                    disabled={cacheMutation.isPending}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Limpar cache
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Aviso de segurança */}
      <section className="bg-muted/30 border border-border/40 rounded-lg p-4 flex gap-3">
        <AlertTriangle className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Seus Access Tokens Meta são criptografados com AES-256-GCM e nunca expostos ao frontend.
        </p>
      </section>

      <ConnectMetaModal open={showConnectModal} onClose={() => setShowConnectModal(false)} />
    </div>
  )
}
