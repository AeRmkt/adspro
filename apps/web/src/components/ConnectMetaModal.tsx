import { useState } from 'react'
import { X, ExternalLink, CheckCircle, AlertCircle, Loader2, Facebook, Unlink } from 'lucide-react'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { connectMeta, getMetaOAuthUrl, getMetaStatus, disconnectMeta } from '../services/api'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from './ui/useToast'

interface ConnectMetaModalProps {
  open: boolean
  onClose: () => void
}

export function ConnectMetaModal({ open, onClose }: ConnectMetaModalProps) {
  const [accessToken, setAccessToken] = useState('')
  const [adAccountId, setAdAccountId] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [error, setError] = useState('')
  const queryClient = useQueryClient()

  const { data: metaStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['meta-status'],
    queryFn: getMetaStatus,
    enabled: open,
    staleTime: 30_000,
  })

  if (!open) return null

  const isConnected = metaStatus?.connected ?? false
  const connection = metaStatus?.connection

  const handleOAuthConnect = async () => {
    setOauthLoading(true)
    setError('')
    try {
      const { url } = await getMetaOAuthUrl()
      window.location.href = url
    } catch (err) {
      setError((err as Error).message || 'Erro ao iniciar conexão com o Facebook.')
      setOauthLoading(false)
    }
  }

  const handleDisconnect = async () => {
    setDisconnecting(true)
    setError('')
    try {
      await disconnectMeta()
      toast({ title: 'Desconectado', description: 'Conta Meta desconectada com sucesso.', variant: 'default' })
      await queryClient.invalidateQueries({ queryKey: ['meta-status'] })
    } catch (err) {
      setError((err as Error).message || 'Erro ao desconectar conta Meta.')
    } finally {
      setDisconnecting(false)
    }
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accessToken.trim() || !adAccountId.trim()) {
      setError('Preencha todos os campos.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const result = await connectMeta({ accessToken: accessToken.trim(), adAccountId: adAccountId.trim() })
      toast({ title: 'Conta conectada!', description: `${result.accountName} foi conectada com sucesso.`, variant: 'success' })
      await queryClient.invalidateQueries({ queryKey: ['accounts'] })
      setAccessToken('')
      setAdAccountId('')
      onClose()
    } catch (err) {
      setError((err as Error).message || 'Erro ao conectar. Verifique suas credenciais.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card w-full max-w-lg p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold">Conectar Conta Meta Ads</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Adicione sua conta de anúncios do Facebook/Instagram</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Status da conexão OAuth */}
        {statusLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : isConnected && connection ? (
          <div className="mb-5">
            <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">Facebook conectado</p>
                  <p className="text-xs text-muted-foreground">{connection.fbUserName}</p>
                  <p className="text-xs text-muted-foreground">
                    Token válido até {new Date(connection.tokenExpiresAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-destructive border-destructive/40 hover:bg-destructive/10"
                onClick={handleDisconnect}
                disabled={disconnecting}
              >
                {disconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" />}
                Desconectar
              </Button>
            </div>
          </div>
        ) : (
          /* Botão OAuth */
          <div className="mb-5">
            <Button
              type="button"
              className="w-full gap-3 bg-[#1877F2] hover:bg-[#166FE5] text-white border-0"
              onClick={handleOAuthConnect}
              disabled={oauthLoading}
            >
              {oauthLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Facebook className="h-5 w-5" />
              )}
              {oauthLoading ? 'Redirecionando...' : 'Conectar com Facebook'}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Token de longa duração (60 dias) renovado automaticamente
            </p>
          </div>
        )}

        {/* Divisor */}
        {!isConnected && (
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-2 text-muted-foreground">ou conecte manualmente</span>
            </div>
          </div>
        )}

        {/* Formulário manual (só aparece se não conectado) */}
        {!isConnected && (
          <>
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-5">
              <h3 className="text-sm font-medium mb-2">Como obter o Access Token</h3>
              <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
                <li>Acesse o Graph API Explorer</li>
                <li>Selecione seu App e clique em <strong>Generate Access Token</strong></li>
                <li>Adicione as permissões: <code className="bg-background/50 px-1 rounded text-xs">ads_read</code>, <code className="bg-background/50 px-1 rounded text-xs">ads_management</code></li>
                <li>Copie o token gerado e cole abaixo</li>
              </ol>
              <a
                href="https://developers.facebook.com/tools/explorer/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary mt-3 hover:underline"
              >
                Abrir Graph API Explorer <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Access Token</label>
                <Input
                  placeholder="EAABsbCS..."
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  className="font-mono text-xs"
                  type="password"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Ad Account ID</label>
                <Input
                  placeholder="act_123456789 ou 123456789"
                  value={adAccountId}
                  onChange={(e) => setAdAccountId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Encontre em Gerenciador de Anúncios → Configurações da Conta
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Verificar e Conectar
                    </>
                  )}
                </Button>
              </div>
            </form>
          </>
        )}

        {/* Erros de disconnect */}
        {error && isConnected && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3 mt-4">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {isConnected && (
          <div className="mt-4 flex justify-end">
            <Button variant="outline" onClick={onClose}>Fechar</Button>
          </div>
        )}
      </div>
    </div>
  )
}
