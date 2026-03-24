import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { useDailyInsights } from '../hooks/useDailyInsights'
import { fmtBRL, fmtDate } from '../lib/format'
import { Skeleton } from './ui/Skeleton'
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card'

export function SpendChart() {
  const { data, isLoading } = useDailyInsights()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Investimento e Receita Diária</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    )
  }

  const chartData = (data || []).map((d) => ({
    date: fmtDate(d.date),
    Investimento: d.spend,
    Receita: d.purchaseValue,
    ROAS: d.roas,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Investimento e Receita Diária</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="gradSpend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(221 83% 53%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(221 83% 53%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(142 71% 45%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(142 71% 45%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 19% 22%)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: 'hsl(215 20% 55%)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => fmtBRL(v).replace('R$\u00a0', 'R$')}
              tick={{ fontSize: 11, fill: 'hsl(215 20% 55%)' }}
              axisLine={false}
              tickLine={false}
              width={80}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(215 25% 11%)',
                border: '1px solid hsl(217 19% 22%)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number, name: string) => [fmtBRL(value), name]}
            />
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }}
            />
            <Area
              type="monotone"
              dataKey="Investimento"
              stroke="hsl(221 83% 53%)"
              fill="url(#gradSpend)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="Receita"
              stroke="hsl(142 71% 45%)"
              fill="url(#gradRevenue)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
