import { useId } from 'react'
import { cn } from '../../lib/utils'

/**
 * Marca do Ads Pro.
 *
 * O símbolo é vetorial (não é o PNG da marca) para ficar nítido em qualquer
 * tamanho e não pesar no bundle. A geometria foi extraída do arquivo original:
 * círculo + cápsula a 59,5°, ambos com gradiente próprio escurecendo a ~25°.
 * Conferido contra o PNG (diferença média de 1,4/255).
 *
 * A ponta clara vem de --logo-stop-light (index.css): no tema escuro é o
 * #F5F5F6 original, no claro vira um índigo suave — quase branco sobre fundo
 * claro faz o círculo virar meia-lua e a barra parecer cortada.
 */

export function LogoMark({ className }: { className?: string }) {
  // Ids únicos por instância e estáveis entre renders: dois <svg> na mesma
  // página não podem compartilhar o id do gradiente.
  const id = useId().replace(/:/g, '')
  return (
    <svg
      viewBox="0 0 1000 1000"
      className={cn('h-8 w-8', className)}
      role="img"
      aria-label="Ads Pro"
    >
      <defs>
        <linearGradient id={`${id}a`} gradientUnits="userSpaceOnUse" x1="208.1" y1="304" x2="383.9" y2="386">
          <stop offset="0" stopColor="var(--logo-stop-light, #F5F5F6)" />
          <stop offset="1" stopColor="#1D1CEB" />
        </linearGradient>
        <linearGradient id={`${id}b`} gradientUnits="userSpaceOnUse" x1="564.7" y1="263.3" x2="768.3" y2="358.2">
          <stop offset="0" stopColor="var(--logo-stop-light, #F5F5F6)" />
          <stop offset="1" stopColor="#1D1CEB" />
        </linearGradient>
      </defs>
      <circle cx="296" cy="345" r="97" fill={`url(#${id}a)`} />
      <path
        d="M671 342.5 L485.8 657.1"
        stroke={`url(#${id}b)`}
        strokeWidth="189.8"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

/** Lockup completo: símbolo + "Ads Pro". O texto herda a cor do contexto. */
export function Logo({
  className,
  markClassName,
  textClassName,
}: {
  className?: string
  markClassName?: string
  textClassName?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark className={markClassName} />
      <span className={cn('font-semibold tracking-[-0.02em] whitespace-nowrap', textClassName)}>
        Ads Pro
      </span>
    </span>
  )
}
