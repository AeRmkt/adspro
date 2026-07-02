import { Sparkles, ArrowUpRight, Pause, Beaker } from 'lucide-react'

const creatives = [
  { nome: 'VID · Black Friday 15s', score: 94, status: 'Escalar', cor: '#22C55E', roas: '6,95x', ctr: '2,59%', rec: 'Top performer. Suba o orçamento em 20% e duplique em novo público.', grad: 'linear-gradient(135deg,#1E6BF1,#0EA5E9)' },
  { nome: 'IMG · Depoimento Cliente', score: 88, status: 'Escalar', cor: '#22C55E', roas: '9,28x', ctr: '3,50%', rec: 'Melhor ROAS da conta. Mantenha e crie variações do mesmo ângulo.', grad: 'linear-gradient(135deg,#22C55E,#10B981)' },
  { nome: 'VID · Demonstração Produto', score: 71, status: 'Manter', cor: '#3B82F6', roas: '4,58x', ctr: '2,02%', rec: 'Estável. Teste um novo gancho nos primeiros 3 segundos.', grad: 'linear-gradient(135deg,#6366F1,#8B5CF6)' },
  { nome: 'IMG · Carrossel Ofertas', score: 58, status: 'Testar', cor: '#F59E0B', roas: '3,10x', ctr: '1,64%', rec: 'Frequência subindo (1,9x). Atualize a arte para evitar fadiga.', grad: 'linear-gradient(135deg,#F59E0B,#EF4444)' },
  { nome: 'VID · Institucional 30s', score: 34, status: 'Pausar', cor: '#EF4444', roas: '1,20x', ctr: '0,82%', rec: 'CPA 2,4x acima da meta. A IA recomenda pausar e realocar a verba.', grad: 'linear-gradient(135deg,#64748B,#475569)' },
]

export default function OtimizadorCriativos() {
  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto fade-in">
      <span className="ai-badge text-[11px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1"><Sparkles className="h-3 w-3" /> IA</span>
      <h1 className="text-3xl font-extrabold gradient-text tracking-tight mt-1">Otimizador de Criativos</h1>
      <p className="text-muted-foreground text-sm mt-1">A IA pontua cada criativo de 0 a 100 e recomenda a próxima ação.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-7">
        <div className="metric-card"><div className="text-xs text-muted-foreground">Criativos analisados</div><div className="text-2xl font-extrabold mt-1">5</div></div>
        <div className="metric-card"><div className="text-xs text-muted-foreground">Score médio</div><div className="text-2xl font-extrabold mt-1">69<span className="text-base text-muted-foreground">/100</span></div></div>
        <div className="metric-card"><div className="text-xs text-muted-foreground">Verba em criativos a pausar</div><div className="text-2xl font-extrabold mt-1 text-destructive">R$ 35.280</div></div>
      </div>

      <div className="glass-card p-2 mt-5">
        {creatives.map((c, i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/[0.03] transition-colors" style={{ borderBottom: i < creatives.length - 1 ? '1px solid hsla(215,25%,45%,0.1)' : 'none' }}>
            <div className="w-14 h-14 rounded-xl shrink-0" style={{ background: c.grad }} />
            <div className="min-w-0 flex-1">
              <div className="font-semibold truncate">{c.nome}</div>
              <div className="text-xs text-muted-foreground truncate mt-0.5">{c.rec}</div>
            </div>
            <div className="hidden lg:block text-right shrink-0 w-20"><div className="text-sm font-bold">{c.roas}</div><div className="text-[11px] text-muted-foreground">ROAS</div></div>
            <div className="hidden lg:block text-right shrink-0 w-20"><div className="text-sm font-bold">{c.ctr}</div><div className="text-[11px] text-muted-foreground">CTR</div></div>
            <div className="shrink-0 w-32">
              <div className="flex items-center justify-between text-xs mb-1"><span className="text-muted-foreground">Score</span><b style={{ color: c.cor }}>{c.score}</b></div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: '#222A35' }}><div className="h-full rounded-full" style={{ width: `${c.score}%`, background: c.cor }} /></div>
            </div>
            <span className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1" style={{ background: `${c.cor}22`, color: c.cor }}>
              {c.status === 'Pausar' ? <Pause className="h-3 w-3" /> : c.status === 'Testar' ? <Beaker className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
              {c.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
