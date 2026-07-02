import * as Popover from '@radix-ui/react-popover'
import { SlidersHorizontal, Check, RotateCcw } from 'lucide-react'
import { Button } from './ui/Button'
import { cn } from '../lib/utils'
import { METRIC_DEFS, METRIC_GROUPS, DEFAULT_VISIBLE_METRICS } from '../lib/metrics'
import { useDashboardStore } from '../store/dashboardStore'

export function MetricPicker() {
  const { visibleMetrics, setVisibleMetrics } = useDashboardStore()

  const toggle = (key: string) => {
    setVisibleMetrics(
      visibleMetrics.includes(key)
        ? visibleMetrics.filter((k) => k !== key)
        : [...visibleMetrics, key]
    )
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <SlidersHorizontal className="h-3.5 w-3.5 opacity-70" />
          <span>Métricas</span>
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/15 px-1 text-[10px] font-bold text-primary">
            {visibleMetrics.length}
          </span>
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          className="z-50 w-[320px] glass-card border border-border/60 rounded-xl shadow-2xl p-0 animate-fade-in"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
            <span className="text-sm font-semibold">Escolher métricas</span>
            <button
              onClick={() => setVisibleMetrics(DEFAULT_VISIBLE_METRICS)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw className="h-3 w-3" /> Padrão
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto px-2 py-2">
            {METRIC_GROUPS.map((group) => {
              const items = METRIC_DEFS.filter((m) => m.group === group)
              if (!items.length) return null
              return (
                <div key={group} className="mb-2 last:mb-0">
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {group}
                  </div>
                  {items.map((m) => {
                    const checked = visibleMetrics.includes(m.key)
                    return (
                      <button
                        key={m.key}
                        onClick={() => toggle(m.key)}
                        className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-accent transition-colors"
                      >
                        <span className={cn(
                          'flex h-4 w-4 items-center justify-center rounded border flex-shrink-0 transition-colors',
                          checked ? 'bg-primary border-primary' : 'border-border'
                        )}>
                          {checked && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />}
                        </span>
                        <span className={cn('flex items-center justify-center w-6 h-6 rounded-md bg-current/10', m.iconColor)}>
                          <span className={m.iconColor}>{m.icon}</span>
                        </span>
                        <span className="flex-1 truncate">{m.label}</span>
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
