import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useMetrics } from '../hooks/useMetrics'
import { fmtNumber } from '../lib/format'
import { Skeleton } from './ui/Skeleton'
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card'

const FUNNEL_COLORS = [
  'hsl(221 83% 53%)',
  'hsl(221 83% 60%)',
  'hsl(142 71% 45%)',
  'hsl(38 92% 50%)',
  'hsl(0 72% 51%)',
]

export function FunnelChart() {
  const { current: { data, isLoading } } = useMetrics()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Funil de Conversão</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    )
  }

  const funnelData = [
    { name: 'Impressões', value: data?.impressions ?? 0 },
    { name: 'Cliques', value: data?.clicks ?? 0 },
    { name: 'Vis. Site', value: data?.websiteViews ?? 0 },
    { name: 'Carrinho', value: data?.addToCart ?? 0 },
    { name: 'Compras', value: data?.purchases ?? 0 },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Funil de Conversão</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={funnelData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 19% 22%)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: 'hsl(215 20% 55%)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={fmtNumber}
              tick={{ fontSize: 11, fill: 'hsl(215 20% 55%)' }}
              axisLine={false}
              tickLine={false}
              width={60}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(215 25% 11%)',
                border: '1px solid hsl(217 19% 22%)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number) => [fmtNumber(value), 'Total']}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {funnelData.map((_, i) => (
                <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
