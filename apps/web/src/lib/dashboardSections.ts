/**
 * Seções reordenáveis do dashboard.
 *
 * `span` controla a largura no grid de 2 colunas: 'full' ocupa a linha inteira,
 * 'half' divide. Duas seções 'half' adjacentes caem lado a lado sozinhas, então
 * a ordem padrão reproduz exatamente o layout antigo (gráficos em par,
 * demografia ao lado dos melhores anúncios).
 */
export interface DashboardSection {
  id: string
  label: string
  span: 'full' | 'half'
}

// "Contas de Anúncio" fica de fora de propósito: é renderizada acima do grid,
// antes do estado vazio, então não teria como ser reordenada de verdade.
export const DASHBOARD_SECTIONS: DashboardSection[] = [
  { id: 'metrics', label: 'Métricas', span: 'full' },
  { id: 'adsManager', label: 'Gerenciador de Anúncios', span: 'full' },
  { id: 'spend', label: 'Gráfico de Investimento', span: 'half' },
  { id: 'funnel', label: 'Funil de Conversão', span: 'half' },
  { id: 'demographics', label: 'Dados Demográficos', span: 'half' },
  { id: 'bestAds', label: 'Melhores Anúncios', span: 'half' },
]

export const DEFAULT_SECTION_ORDER = DASHBOARD_SECTIONS.map((s) => s.id)

export const sectionById = (id: string) => DASHBOARD_SECTIONS.find((s) => s.id === id)

/**
 * Normaliza a ordem salva: descarta ids que não existem mais e acrescenta ao
 * fim as seções novas. Sem isso, uma seção adicionada numa versão futura
 * ficaria invisível para quem já tem ordem no localStorage.
 */
export function normalizeSectionOrder(saved: string[] | undefined): string[] {
  const known = new Set(DEFAULT_SECTION_ORDER)
  const seen = new Set<string>()
  const kept: string[] = []
  for (const id of saved ?? []) {
    // Descarta desconhecidos e repetidos: id duplicado renderizaria a seção
    // duas vezes e colidiria as keys do React.
    if (!known.has(id) || seen.has(id)) continue
    seen.add(id)
    kept.push(id)
  }
  return [...kept, ...DEFAULT_SECTION_ORDER.filter((id) => !seen.has(id))]
}
