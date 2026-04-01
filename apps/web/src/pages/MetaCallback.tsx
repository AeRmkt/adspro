import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

export default function MetaCallback() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const success = params.get('success')
    const error = params.get('error')
    const name = params.get('name')

    if (success === 'true') {
      setStatus('success')
      setMessage(name ? `Olá, ${name}! Sua conta Meta foi conectada.` : 'Conta Meta conectada com sucesso!')
      queryClient.invalidateQueries({ queryKey: ['meta-status'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      const timer = setTimeout(() => navigate('/'), 2500)
      return () => clearTimeout(timer)
    }

    if (error) {
      setStatus('error')
      setMessage(error)
      const timer = setTimeout(() => navigate('/'), 4000)
      return () => clearTimeout(timer)
    }

    // Sem parâmetros — redireciona para home
    navigate('/')
  }, [params, navigate, queryClient])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="glass-card p-10 text-center max-w-sm w-full shadow-2xl">
        {status === 'loading' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Conectando com o Facebook...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Conectado!</h2>
            <p className="text-sm text-muted-foreground">{message}</p>
            <p className="text-xs text-muted-foreground mt-3">Redirecionando para o dashboard...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Falha na conexão</h2>
            <p className="text-sm text-muted-foreground">{message}</p>
            <p className="text-xs text-muted-foreground mt-3">Redirecionando...</p>
          </>
        )}
      </div>
    </div>
  )
}
