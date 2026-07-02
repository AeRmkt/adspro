import { Sparkles, TrendingUp, DollarSign, Target, ArrowUpRight } from 'lucide-react'

const hist = [62, 70, 78, 88, 96, 104, 112]
const proj = [120, 128, 134, 141, 147, 153, 160]

export default function PrevisaoGasto() {
  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto fade-in">
      <div className="flex items-center gap-2 mb-1">
        <span className="ai-badge text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1"><Sparkles className="h-3 w-3" /> IA</span>
      </div>
      <h1 className="text-3xl font-extrabold gradient-text tracking-tight">Previsão de Gasto</h1>
      <p className="text-muted-foreground text-sm mt-1">Projeção dos próximos 30 dias com base no desempenho recente e na sazonalidade.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-7">
        {[
          { ic: <DollarSign className="h-5 w-5" />, lb: 'Gasto recomendado', v: 'R$ 360.000', d: '+15,2%' },
          { ic: <TrendingUp className="h-5 w-5" />, lb: 'Receita projetada', v: 'R$ 2.250.000', d: '+22,1%' },
          { ic: <Target className="h-5 w-5" />, lb: 'ROAS esperado', v: '6,25x', d: '+6,0%' },
        ].map((c, i) => (
          <div key={i} className="metric-card" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-primary bg-primary/15">{c.ic}</div>
              <span className="text-xs font-semibold text-success flex items-center gap-0.5"><ArrowUpRight className="h-3 w-3" />{c.d}</span>
            </div>
            <div className="text-2xl font-extrabold tracking-tight">{c.v}</div>
            <div className="text-xs text-muted-foreground mt-1">{c.lb}</div>
          </div>
        ))}
      </div>

      <div className="glass-card p-6 mt-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-bold">Projeção de investimento</h2>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><i className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: '#2A3340' }} />Histórico</span>
            <span className="flex items-center gap-1.5"><i className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: 'linear-gradient(180deg,#2563EB,#60A5FA)' }} />Projetado (IA)</span>
          </div>
        </div>
        <div className="flex items-end gap-4 h-52 mt-6">
          {hist.map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-2">
              <div className="flex items-end gap-1 h-44">
                <div className="w-3.5 rounded-t-md" style={{ height: `${h}px`, background: '#2A3340' }} />
                <div className="w-3.5 rounded-t-md" style={{ height: `${proj[i]}px`, background: 'linear-gradient(180deg,#2563EB,#1D4FD7)', boxShadow: '0 0 16px hsla(221,83%,55%,.4)' }} />
              </div>
              <span className="text-[11px] text-muted-foreground">Sem {i + 1}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card p-6 mt-5 flex items-start gap-4" style={{ borderColor: 'hsla(221,83%,60%,0.4)' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-primary bg-primary/15 shrink-0"><Sparkles className="h-5 w-5" /></div>
        <div>
          <h3 className="font-bold mb-1">Recomendação da IA</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A campanha <b className="text-foreground">Remarketing 30 dias</b> está com ROAS de 9,28x e ainda longe da saturação. Realocar <b className="text-foreground">R$ 18.000/mês</b> de Aquisição Broad para ela deve elevar a receita projetada em <b className="text-success">+R$ 142.000</b> mantendo o CPA estável.
          </p>
        </div>
      </div>
    </div>
  )
}
