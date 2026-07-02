import { motion } from 'framer-motion'
import { Info, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '../lib/utils'
import { Skeleton } from './ui/Skeleton'
import { MagicCard } from './ui/MagicCard'
import { NumberTicker } from './ui/NumberTicker'

interface MetricCardProps {
  label: string
  value: number | null
  format: (v: number) => string
  delta?: number | null
  icon: React.ReactNode
  iconColor?: string
  tooltip?: string
  loading?: boolean
  index?: number
}

export function MetricCard({
  label,
  value,
  format,
  delta,
  icon,
  iconColor = 'text-primary',
  tooltip,
  loading,
  index = 0,
}: MetricCardProps) {
  if (loading) {
    return (
      <div className="metric-card">
        <Skeleton className="h-8 w-8 rounded-lg mb-3" />
        <Skeleton className="h-7 w-24 mb-2" />
        <Skeleton className="h-4 w-16" />
      </div>
    )
  }

  const isPositive = delta != null && delta >= 0
  const hasDelta = delta != null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index, 20) * 0.025 }}
    >
      <MagicCard className="metric-card group h-full">
        <div className="flex items-start justify-between mb-3">
          <div className={cn('flex items-center justify-center w-8 h-8 rounded-lg bg-current/10 ring-1 ring-current/10', iconColor)}>
            <span className={iconColor}>{icon}</span>
          </div>
          {tooltip && (
            <div className="group/tip relative">
              <Info className="h-3.5 w-3.5 text-muted-foreground/40 cursor-help" />
              <div className="absolute right-0 top-5 z-50 hidden group-hover/tip:block glass-card border border-border/60 rounded-md p-2 text-xs text-muted-foreground w-48 shadow-xl">
                {tooltip}
              </div>
            </div>
          )}
        </div>

        <div className="text-2xl font-bold tracking-tight mb-1 tabular-nums">
          {value == null ? 'N/A' : <NumberTicker value={value} format={format} />}
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground truncate">{label}</span>
          {hasDelta && (
            <div className={cn(
              'flex items-center gap-0.5 text-xs font-semibold rounded-full px-1.5 py-0.5',
              isPositive ? 'text-success bg-success/10' : 'text-destructive bg-destructive/10'
            )}>
              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span>{isPositive ? '+' : ''}{(delta * 100).toFixed(1)}%</span>
            </div>
          )}
        </div>
      </MagicCard>
    </motion.div>
  )
}
