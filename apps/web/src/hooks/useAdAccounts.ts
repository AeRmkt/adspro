import { useQuery } from '@tanstack/react-query'
import { getAccounts } from '../services/api'
import { useAuth } from './useAuth'

export function useAdAccounts() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['accounts'],
    queryFn: getAccounts,
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })
}
