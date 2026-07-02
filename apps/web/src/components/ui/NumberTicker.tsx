import { useEffect, useRef } from 'react'
import { useInView, useMotionValue, useSpring } from 'framer-motion'

interface NumberTickerProps {
  value: number
  format: (n: number) => string
  className?: string
}

// Conta de 0 até o valor com animação de mola (estilo Magic UI).
export function NumberTicker({ value, format, className }: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const motionValue = useMotionValue(0)
  const spring = useSpring(motionValue, { damping: 32, stiffness: 90 })
  const inView = useInView(ref, { once: true, margin: '0px' })

  useEffect(() => {
    if (inView) motionValue.set(value)
  }, [inView, value, motionValue])

  useEffect(() => {
    return spring.on('change', (latest) => {
      if (ref.current) ref.current.textContent = format(latest)
    })
  }, [spring, format])

  return <span ref={ref} className={className}>{format(0)}</span>
}
