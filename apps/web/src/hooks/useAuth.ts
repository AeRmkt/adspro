import { useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../services/auth'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
}

const DEMO = import.meta.env.VITE_DEMO === 'true'
const DEMO_USER = { id: 'demo', email: 'seteotoni@gmail.com', user_metadata: {} } as unknown as User

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>(
    DEMO
      ? { user: DEMO_USER, session: null, loading: false }
      : { user: null, session: null, loading: true }
  )

  useEffect(() => {
    if (DEMO) return
    // Carrega sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({ user: session?.user ?? null, session, loading: false })
    })

    // Escuta mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ user: session?.user ?? null, session, loading: false })
    })

    return () => subscription.unsubscribe()
  }, [])

  return state
}
