import { Sparkles, Check, AlertTriangle } from 'lucide-react'

const breakdown = [
  { lb: 'Gancho (primeiros 3s)', v: 92, cor: '#22C55E' },
  { lb: 'Clareza da oferta', v: 85, cor: '#22C55E' },
  { lb: 'CTA', v: 78, cor: '#3B82F6' },
  { lb: 'Gatilhos mentais', v: 71, cor: '#3B82F6' },
  { lb: 'Prova / credibilidade', v: 54, cor: '#F59E0B' },
]

export default function AnaliseCopy() {
  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto fade-in">
      <span className="ai-badge text-[11px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1"><Sparkles className="h-3 w-3" /> IA</span>
      <h1 className="text-3xl font-extrabold gradient-text tracking-tight mt-1">Análise de Copy</h1>
      <p className="text-muted-foreground text-sm mt-1">A IA avalia sua copy de anúncio e sugere melhorias antes de você subir.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-7">
        {/* copy + score */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="text-xs text-muted-foreground mb-2">Copy analisada</div>
          <div className="rounded-xl p-4 text-sm leading-relaxed" style={{ background: '#0E141C', border: '1px solid hsla(215,25%,45%,0.14)' }}>
            "Sua clínica perde paciente porque ninguém responde a tempo? Com o Kualiz, a Liz atende na hora, organiza tudo no CRM e você vê o time inteiro numa tela. Comece hoje."
          </div>
          <div className="mt-5">
            <div className="text-xs text-muted-foreground mb-3">Avaliação por critério</div>
            {breakdown.map((b, i) => (
              <div key={i} className="mb-3">
                <div className="flex justify-between text-xs mb-1"><span>{b.lb}</span><b style={{ color: b.cor }}>{b.v}</b></div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: '#222A35' }}><div className="h-full rounded-full" style={{ width: `${b.v}%`, background: b.cor }} /></div>
              </div>
            ))}
          </div>
        </div>

        {/* score geral */}
        <div className="glass-card p-6 flex flex-col items-center justify-center text-center">
          <div className="relative w-36 h-36 rounded-full flex items-center justify-center" style={{ background: 'conic-gradient(#22C55E 0% 87%, #222A35 87% 100%)' }}>
            <div className="w-28 h-28 rounded-full flex flex-col items-center justify-center" style={{ background: 'hsl(220,26%,10%)' }}>
              <div className="text-4xl font-extrabold">87</div>
              <div className="text-[11px] text-muted-foreground">de 100</div>
            </div>
          </div>
          <div className="mt-4 text-sm font-bold text-success">Copy forte</div>
          <div className="text-xs text-muted-foreground mt-1">Acima da média da categoria (média 64).</div>
        </div>
      </div>

      {/* sugestões */}
      <div className="glass-card p-6 mt-5">
        <h3 className="font-bold mb-4 flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Sugestões da IA</h3>
        <ul className="space-y-3 text-sm">
          <li className="flex gap-3"><Check className="h-4 w-4 text-success shrink-0 mt-0.5" /><span><b>Gancho excelente.</b> A dor no início prende a atenção. Mantenha.</span></li>
          <li className="flex gap-3"><AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" /><span><b>Adicione prova.</b> Inclua um número concreto, ex: "clínicas atendem 3x mais rápido", pra subir o critério de credibilidade.</span></li>
          <li className="flex gap-3"><AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" /><span><b>Fortaleça o CTA.</b> Troque "Comece hoje" por algo com menor fricção, ex: "Veja como funciona em 2 minutos".</span></li>
        </ul>
      </div>
    </div>
  )
}
