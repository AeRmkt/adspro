interface SparklineProps {
  data: number[]
  color?: string
  className?: string
  height?: number
}

// Sparkline SVG leve — tendência sem eixos, sem ruído (estilo BI de verdade).
export function Sparkline({ data, color = 'hsl(var(--primary))', className, height = 36 }: SparklineProps) {
  const clean = data.filter((n) => Number.isFinite(n))
  if (clean.length < 2) return <div style={{ height }} className={className} />

  const w = 100
  const h = height
  const min = Math.min(...clean)
  const max = Math.max(...clean)
  const range = max - min || 1
  const step = w / (clean.length - 1)

  const pts = clean.map((v, i) => [i * step, h - ((v - min) / range) * (h - 4) - 2] as const)
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `0,${h} ${line} ${w},${h}`
  const id = `spark-${Math.random().toString(36).slice(2, 8)}`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" width="100%" height={h} className={className}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${id})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
