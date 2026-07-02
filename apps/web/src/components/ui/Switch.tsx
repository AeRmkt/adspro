import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'

interface SwitchProps {
  checked: boolean
  onCheckedChange: (v: boolean) => void
  loading?: boolean
  disabled?: boolean
  size?: 'sm' | 'md'
  title?: string
}

// Toggle animado estilo Magic UI (usado pra ativar/pausar campanha, conjunto e anúncio).
export function Switch({ checked, onCheckedChange, loading, disabled, size = 'md', title }: SwitchProps) {
  const sm = size === 'sm'
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      title={title}
      disabled={disabled || loading}
      onClick={(e) => {
        e.stopPropagation()
        onCheckedChange(!checked)
      }}
      className={cn(
        'relative inline-flex flex-shrink-0 items-center rounded-full transition-colors duration-300 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-70',
        sm ? 'h-[18px] w-8' : 'h-[22px] w-10',
        checked ? 'bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.5)]' : 'bg-muted-foreground/25'
      )}
    >
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-full bg-white shadow-md transition-transform duration-300 ease-out',
          sm ? 'h-3.5 w-3.5' : 'h-[18px] w-[18px]',
          checked
            ? sm ? 'translate-x-[15px]' : 'translate-x-[19px]'
            : 'translate-x-[3px]'
        )}
      >
        {loading && (
          <Loader2 className={cn('animate-spin text-primary', sm ? 'h-2.5 w-2.5' : 'h-3 w-3')} />
        )}
      </span>
    </button>
  )
}
