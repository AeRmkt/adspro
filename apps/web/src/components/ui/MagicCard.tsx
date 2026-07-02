import { useRef, useState } from 'react'
import { cn } from '../../lib/utils'

interface MagicCardProps extends React.HTMLAttributes<HTMLDivElement> {
  spotlightColor?: string
}

// Card com brilho radial que segue o cursor (estilo Magic UI).
export function MagicCard({ className, children, spotlightColor = 'hsl(var(--primary) / 0.12)', ...props }: MagicCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: -300, y: -300 })
  const [active, setActive] = useState(false)

  return (
    <div
      ref={ref}
      onMouseMove={(e) => {
        const r = ref.current?.getBoundingClientRect()
        if (r) setPos({ x: e.clientX - r.left, y: e.clientY - r.top })
      }}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      className={cn('relative overflow-hidden', className)}
      {...props}
    >
      <div
        className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
        style={{
          opacity: active ? 1 : 0,
          background: `radial-gradient(240px circle at ${pos.x}px ${pos.y}px, ${spotlightColor}, transparent 65%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
