import { useState } from 'react'
import { Instagram, RefreshCw, Loader2, Users, Eye, Globe, TrendingUp, BarChart3 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  getInstagramAccounts, syncInstagramAccounts, getInstagramInsights,
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
    onSuccess: (data) => {
      if (data.length > 0 && !selectedAccount) setSelectedAccount(data[0])
    },
  })

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

  const insights = insightsData?.insights

  const chartData = (insights?.daily ?? []).map((d) => ({
    date: fmtDate(d.date),
    Impressões: d.impressions,
    Alcance: d.reach,
    'Visitas ao Perfil': d.profileViews,
    'Cliques no Site': d.websiteClicks,
  }))

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Instagram className="h-6 w-6 text-pink-500" />
            Instagram
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Métricas orgânicas das suas contas do Instagram
          </p>
        </div>
        <Button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="gap-2"
        >
          {syncMutation.isPending
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <RefreshCw className="h-4 w-4" />}
          Sincronizar Contas
        </Button>
      </div>

      {/* Seletor de conta */}
      {loadingAccounts ? (
        <div className="flex gap-3">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 w-48 rounded-lg" />)}
        </div>
      ) : accounts?.length === 0 ? (
        <div className="glass-card p-8 text-center text-muted-foreground">
          <Instagram className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhuma conta Instagram encontrada</p>
          <p className="text-sm mt-1">
            Clique em "Sincronizar Contas" para conectar via páginas do Facebook.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {accounts?.map((acc) => (
            <button
              key={acc.id}
              onClick={() => setSelectedAccount(acc)}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                selectedAccount?.id === acc.id
                  ? 'border-pink-500 bg-pink-500/10'
                  : 'border-border/40 bg-card hover:border-pink-500/50'
              }`}
            >
              {acc.profilePicUrl ? (
                <img src={acc.profilePicUrl} alt={acc.username} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
                  <Instagram className="h-5 w-5 text-pink-500" />
                </div>
              )}
              <div>
                <p className="font-medium text-sm">@{acc.username}</p>
                <p className="text-xs text-muted-foreground">
                  {acc.followersCount != null ? `${fmtNumber(acc.followersCount)} seguidores` : acc.linkedPageName}
                </p>
              </div>
              {selectedAccount?.id === acc.id && (
                <Badge variant="success" className="ml-1 text-xs">Ativa</Badge>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Métricas */}
      {selectedAccount && (
        <>
          {loadingInsights ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
            </div>
          ) : insights ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <MetricCard
                  label="Impressões"
                  value={insights.impressions}
                  icon={<Eye className="h-4 w-4 text-blue-400" />}
                  color="bg-blue-400/10"
                />
                <MetricCard
                  label="Alcance"
                  value={insights.reach}
                  icon={<Users className="h-4 w-4 text-purple-400" />}
                  color="bg-purple-400/10"
                />
                <MetricCard
                  label="Visitas ao Perfil"
                  value={insights.profileViews}
                  icon={<BarChart3 className="h-4 w-4 text-pink-400" />}
                  color="bg-pink-400/10"
                />
                <MetricCard
                  label="Cliques no Site"
                  value={insights.websiteClicks}
                  icon={<Globe className="h-4 w-4 text-green-400" />}
                  color="bg-green-400/10"
                />
                <MetricCard
                  label="Crescimento de Seguidores"
                  value={insights.followerGrowth >= 0 ? `+${fmtNumber(insights.followerGrowth)}` : fmtNumber(insights.followerGrowth)}
                  icon={<TrendingUp className="h-4 w-4 text-orange-400" />}
                  color="bg-orange-400/10"
                />
              </div>

              {/* Gráfico diário */}
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
                          contentStyle={{
                            backgroundColor: 'hsl(215 25% 11%)',
                            border: '1px solid hsl(217 19% 22%)',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
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

              {/* Info da conta */}
              <div className="glass-card p-4 flex items-center gap-4">
                {selectedAccount.profilePicUrl && (
                  <img src={selectedAccount.profilePicUrl} alt={selectedAccount.username} className="w-12 h-12 rounded-full" />
                )}
                <div className="flex-1">
                  <p className="font-semibold">@{selectedAccount.username}</p>
                  {selectedAccount.name && <p className="text-sm text-muted-foreground">{selectedAccount.name}</p>}
                  <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                    {selectedAccount.followersCount != null && <span>{fmtNumber(selectedAccount.followersCount)} seguidores</span>}
                    {selectedAccount.mediaCount != null && <span>{fmtNumber(selectedAccount.mediaCount)} publicações</span>}
                    {selectedAccount.linkedPageName && <span>Página: {selectedAccount.linkedPageName}</span>}
                  </div>
                </div>
                {selectedAccount.lastSyncAt && (
                  <p className="text-xs text-muted-foreground">
                    Atualizado em {fmtDate(selectedAccount.lastSyncAt.split('T')[0])}
                  </p>
                )}
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  )
}
