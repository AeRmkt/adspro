import { useState, useEffect } from 'react'
import { Instagram, RefreshCw, Loader2, Users, Eye, Globe, TrendingUp, BarChart3, Star, Trash2, Plus } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  getInstagramAccounts, syncInstagramAccounts, getInstagramInsights, setPrincipalInstagram, deleteInstagramAccount,
  type InstagramAccount,
} from '../services/api'
import { useDashboardStore } from '../store/dashboardStore'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Skeleton } from '../components/ui/Skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { toast } from '../components/ui/useToast'
import { fmtNumber, fmtDate } from '../lib/format'

function MetricCard({ label, value, icon, color }: {
  label: string; value: number | string; icon: React.ReactNode; color: string
}) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className={`w-8 h-8 rounded-md flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold">
        {typeof value === 'number' ? fmtNumber(value) : value}
      </div>
    </div>
  )
}

export default function InstagramPage() {
  const queryClient = useQueryClient()
  const { dateRange } = useDashboardStore()
  const [selectedAccount, setSelectedAccount] = useState<InstagramAccount | null>(null)

  const { data: accounts, isLoading: loadingAccounts } = useQuery({
    queryKey: ['instagram-accounts'],
    queryFn: getInstagramAccounts,
  })

  useEffect(() => {
    if (accounts && !selectedAccount) {
      const principal = accounts.find((a: InstagramAccount) => a.isPrincipal) ?? accounts[0] ?? null
      setSelectedAccount(principal)
    }
  }, [accounts])

  const { data: insightsData, isLoading: loadingInsights } = useQuery({
    queryKey: ['instagram-insights', selectedAccount?.igAccountId, dateRange.from, dateRange.to],
    queryFn: () => getInstagramInsights(selectedAccount!.igAccountId, dateRange.from, dateRange.to),
    enabled: !!selectedAccount,
    staleTime: 5 * 60 * 1000,
  })

  const syncMutation = useMutation({
    mutationFn: syncInstagramAccounts,
    onSuccess: (res) => {
      toast({ title: `${res.synced} conta(s) sincronizada(s)`, variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['instagram-accounts'] })
      if (res.accounts.length > 0 && !selectedAccount) setSelectedAccount(res.accounts[0])
    },
    onError: (err) => toast({ title: 'Erro', description: (err as Error).message, variant: 'destructive' }),
  })

  const principalMutation = useMutation({
    mutationFn: setPrincipalInstagram,
    onSuccess: () => {
      toast({ title: 'Conta principal definida', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['instagram-accounts'] })
    },
    onError: (err) => toast({ title: 'Erro', description: (err as Error).message, variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteInstagramAccount,
    onSuccess: () => {
      toast({ title: 'Conta removida', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['instagram-accounts'] })
      setSelectedAccount(null)
    },
    onError: (err) => toast({ title: 'Erro', description: (err as Error).message, variant: 'destructive' }),
  })

  const insights = insightsData?.insights

  const chartData = (insights?.daily ?? []).map((d) => ({
    date: fmtDate(d.date),
    Impressões: d.impressions,
    Alcance: d.reach,
    'Visitas ao Perfil': d.profileViews,
    'Cliques no Site': d.websiteClicks,
  }))

  return (
    <div className="space-y-6">
      {/* ─── Banner gradiente ──────────────────────────────────────────── */}
      <div
        className="p-8 flex flex-col items-center justify-center gap-3 text-center"
        style={{ background: 'linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)' }}
      >
        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
          <Instagram className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">Instagram Business</h1>
        <p className="text-sm text-white/80">Conecte e gerencie suas contas do Instagram Business</p>
      </div>

      <div className="px-6 space-y-6">
        {/* ─── Contas do Instagram ──────────────────────────────────────── */}
        <section className="glass-card p-5 space-y-4">
          <div>
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Contas do Instagram
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Conecte suas contas do Instagram Business para usar em suas integrações
            </p>
          </div>

          <Button
            className="w-full h-11 gap-2 text-sm font-semibold text-white border-0"
            style={{ background: 'linear-gradient(135deg, #833ab4 0%, #fd1d1d 100%)' }}
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Plus className="h-4 w-4" />}
            {syncMutation.isPending ? 'Sincronizando...' : 'Adicionar Conta do Instagram'}
          </Button>

          <p className="text-sm font-medium">Contas conectadas Instagram</p>

          {loadingAccounts ? (
            <div className="space-y-3">
              {[0, 1].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
            </div>
          ) : !accounts || accounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Instagram className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Nenhuma conta Instagram encontrada</p>
              <p className="text-xs mt-1">Clique no botão acima para sincronizar via Facebook.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  onClick={() => setSelectedAccount(acc)}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedAccount?.id === acc.id
                      ? 'border-pink-500/50 bg-pink-500/5'
                      : 'border-border/40 hover:border-pink-500/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {acc.profilePicUrl ? (
                      <img src={acc.profilePicUrl} alt={acc.username} className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #833ab4, #fd1d1d)' }}>
                        <Instagram className="h-5 w-5 text-white" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">@{acc.username}</p>
                        {acc.isPrincipal && (
                          <Badge variant="success" className="text-xs gap-1">
                            <Star className="h-2.5 w-2.5" /> Principal
                          </Badge>
                        )}
                      </div>
                      {acc.linkedPageName && (
                        <p className="text-xs text-muted-foreground">Página: {acc.linkedPageName}</p>
                      )}
                      {acc.followersCount != null && (
                        <p className="text-xs text-muted-foreground">{fmtNumber(acc.followersCount)} seguidores</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      {!acc.isPrincipal && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs h-8"
                          onClick={() => principalMutation.mutate(acc.igAccountId)}
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
                        onClick={() => deleteMutation.mutate(acc.igAccountId)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                        Remover
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ─── Métricas da conta selecionada ─────────────────────────────── */}
        {selectedAccount && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Métricas — @{selectedAccount.username}</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {fmtDate(dateRange.from)} a {fmtDate(dateRange.to)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['instagram-insights'] })}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {loadingInsights ? (
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
              </div>
            ) : insights ? (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  <MetricCard label="Impressões" value={insights.impressions} icon={<Eye className="h-4 w-4 text-blue-400" />} color="bg-blue-400/10" />
                  <MetricCard label="Alcance" value={insights.reach} icon={<Users className="h-4 w-4 text-purple-400" />} color="bg-purple-400/10" />
                  <MetricCard label="Visitas ao Perfil" value={insights.profileViews} icon={<BarChart3 className="h-4 w-4 text-pink-400" />} color="bg-pink-400/10" />
                  <MetricCard label="Cliques no Site" value={insights.websiteClicks} icon={<Globe className="h-4 w-4 text-green-400" />} color="bg-green-400/10" />
                  <MetricCard
                    label="Crescimento"
                    value={insights.followerGrowth >= 0 ? `+${fmtNumber(insights.followerGrowth)}` : fmtNumber(insights.followerGrowth)}
                    icon={<TrendingUp className="h-4 w-4 text-orange-400" />}
                    color="bg-orange-400/10"
                  />
                </div>

                {chartData.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Evolução Diária — @{selectedAccount.username}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                          <defs>
                            <linearGradient id="igImp" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="igReach" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 19% 22%)" />
                          <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(215 20% 55%)' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: 'hsl(215 20% 55%)' }} axisLine={false} tickLine={false} width={60} tickFormatter={fmtNumber} />
                          <Tooltip
                            contentStyle={{ backgroundColor: 'hsl(215 25% 11%)', border: '1px solid hsl(217 19% 22%)', borderRadius: '8px', fontSize: '12px' }}
                            formatter={(value: number, name: string) => [fmtNumber(value), name]}
                          />
                          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }} />
                          <Area type="monotone" dataKey="Impressões" stroke="#3b82f6" fill="url(#igImp)" strokeWidth={2} />
                          <Area type="monotone" dataKey="Alcance" stroke="#a855f7" fill="url(#igReach)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
