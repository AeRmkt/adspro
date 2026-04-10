import { useState } from 'react'
import { X, CheckCircle, Loader2, Facebook, Unlink } from 'lucide-react'
import { Button } from './ui/Button'
import { getMetaOAuthUrl, getMetaStatus, disconnectMeta } from '../services/api'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from './ui/useToast'

interface ConnectMetaModalProps {
  open: boolean
  onClose: () => void
}

export function ConnectMetaModal({ open, onClose }: ConnectMetaModalProps) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-card w-full max-w-md p-6 shadow-2xl">
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

        {statusLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : isConnected && connection ? (
          /* Conta conectada */
          <div className="space-y-4">
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

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                {error}
              </p>
            )}

            <div className="flex justify-end">
              <Button variant="outline" onClick={onClose}>Fechar</Button>
            </div>
          </div>
        ) : (
          /* Não conectado */
          <div className="space-y-4">
            <Button
              type="button"
              className="w-full gap-3 bg-[#1877F2] hover:bg-[#166FE5] text-white border-0 h-11"
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

            <p className="text-xs text-muted-foreground text-center">
              Token de longa duração (60 dias) renovado automaticamente
            </p>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                {error}
              </p>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
