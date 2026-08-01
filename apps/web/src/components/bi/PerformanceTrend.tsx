import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useDailyInsights } from '../../hooks/useDailyInsights'
import { MagicCard } from '../ui/MagicCard'
import { Skeleton } from '../ui/Skeleton'
import { fmtBRL, fmtNumber, fmtDate } from '../../lib/format'

export function PerformanceTrend() {
  const { data, isLoading } = useDailyInsights()

  const chart = (data ?? []).map((d) => ({
    date: fmtDate(d.date),
    Investido: d.spend,
    Resultados: (d.purchases || 0) + (d.leads || 0),
  }))

  return (
    <MagicCard className="glass-card rounded-2xl h-full">
      <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold">Investimento × Resultados</h2>
          <p className="text-[11px] text-muted-foreground">Barras = gasto por dia · Linha = resultados</p>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-primary/70" />Investido</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />Resultados</span>
        </div>
      </div>
      <div className="p-4">
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : chart.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Sem dados no período.</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chart} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 19% 22%)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
              <YAxis yAxisId="l" tickFormatter={(v) => fmtBRL(v)} tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }} axisLine={false} tickLine={false} width={64} />
              <YAxis yAxisId="r" orientation="right" tickFormatter={fmtNumber} tick={{ fontSize: 10, fill: 'hsl(215 20% 55%)' }} axisLine={false} tickLine={false} width={40} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(215 25% 11%)', border: '1px solid hsl(217 19% 22%)', borderRadius: 8, fontSize: 12 }}
                formatter={(value: number, name: string) => [name === 'Investido' ? fmtBRL(value) : fmtNumber(value), name]}
              />
              <Bar yAxisId="l" dataKey="Investido" fill="hsl(221 83% 60%)" radius={[4, 4, 0, 0]} maxBarSize={28} opacity={0.75} />
              <Line yAxisId="r" type="monotone" dataKey="Resultados" stroke="hsl(142 71% 45%)" strokeWidth={2.4} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </MagicCard>
  )
}
