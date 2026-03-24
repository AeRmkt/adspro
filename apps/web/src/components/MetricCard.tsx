import { Info, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '../lib/utils'
import { Skeleton } from './ui/Skeleton'

interface MetricCardProps {
  label: string
  value: string
  delta?: number | null
  icon: React.ReactNode
  iconColor?: string
  tooltip?: string
  loading?: boolean
  style?: React.CSSProperties
}

export function MetricCard({
  label,
  value,
  delta,
  icon,
  iconColor = 'text-primary',
  tooltip,
  loading,
  style,
}: MetricCardProps) {
  if (loading) {
    return (
      <div className="metric-card fade-in" style={style}>
        <Skeleton className="h-8 w-8 rounded-md mb-3" />
        <Skeleton className="h-7 w-24 mb-2" />
        <Skeleton className="h-4 w-16" />
      </div>
    )
  }

  const isPositive = delta != null && delta >= 0
  const hasDelta = delta != null

  return (
    <div className="metric-card fade-in cursor-default" style={style}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn('flex items-center justify-center w-8 h-8 rounded-md bg-current/10', iconColor)}>
          <span className={iconColor}>{icon}</span>
        </div>
        {tooltip && (
          <div className="group relative">
            <Info className="h-3.5 w-3.5 text-muted-foreground/50 cursor-help" />
            <div className="absolute right-0 top-5 z-50 hidden group-hover:block glass-card border border-border/60 rounded-md p-2 text-xs text-muted-foreground w-48 shadow-xl">
              {tooltip}
            </div>
          </div>
        )}
      </div>

      <div className="text-2xl font-bold tracking-tight mb-1">{value}</div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        {hasDelta && (
          <div className={cn('flex items-center gap-0.5 text-xs font-medium', isPositive ? 'text-success' : 'text-destructive')}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>{isPositive ? '+' : ''}{(delta * 100).toFixed(1)}%</span>
          </div>
        )}
      </div>
    </div>
  )
}
