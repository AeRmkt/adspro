import { useQuery } from '@tanstack/react-query'
import { CreditCard, AlertCircle } from 'lucide-react'
import { AdAccountsList } from '../components/AdAccountsList'
import { getMetaStatus } from '../services/api'
import { useAuth } from '../hooks/useAuth'

export default function Contas() {
  const { user } = useAuth()

  const { data: metaStatus, isLoading } = useQuery({
    queryKey: ['meta-status'],
    queryFn: getMetaStatus,
    enabled: !!user,
    staleTime: 60_000,
  })

  const isMetaConnected = !!metaStatus?.connected && !metaStatus?.connection?.tokenInvalid

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" />
          Contas de Anúncio
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Contas disponíveis na sua conta Meta Business
        </p>
      </div>

      {/* Sem conexão o AdAccountsList não renderiza nada, então o aviso fica aqui. */}
      {!isLoading && !isMetaConnected && (
        <div className="glass-card p-4 flex items-center gap-3 border border-warning/30 bg-warning/5">
          <AlertCircle className="h-5 w-5 text-warning flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">Conta Meta não conectada</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Conecte sua conta nas <a href="/configuracoes" className="text-primary underline">Configurações</a> para listar suas contas de anúncio.
            </p>
          </div>
        </div>
      )}

      <AdAccountsList visible={isMetaConnected} showHeading={false} />
    </div>
  )
}
