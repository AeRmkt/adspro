import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameDay, isSameMonth, isWithinInterval, parseISO, isValid,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '../../lib/utils'

const WEEK = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

interface CalendarProps {
  from: string
  to: string
  onSelect: (range: { from: string; to: string }) => void
}

const iso = (d: Date) => format(d, 'yyyy-MM-dd')
const safe = (s: string) => { const d = parseISO(s); return isValid(d) ? d : new Date() }

// Range picker animado (estilo Magic UI): 1º clique = início, 2º = fim.
export function Calendar({ from, to, onSelect }: CalendarProps) {
  const [view, setView] = useState(() => startOfMonth(safe(from)))
  const [dir, setDir] = useState(0)
  const [anchor, setAnchor] = useState<Date | null>(null)

  const fromD = safe(from)
  const toD = safe(to)

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(view)),
    end: endOfWeek(endOfMonth(view)),
  })

  const go = (n: number) => { setDir(n); setView((v) => (n > 0 ? addMonths(v, 1) : subMonths(v, 1))) }

  const pick = (d: Date) => {
    if (!anchor) {
      setAnchor(d)
      onSelect({ from: iso(d), to: iso(d) })
    } else {
      const start = anchor < d ? anchor : d
      const end = anchor < d ? d : anchor
      onSelect({ from: iso(start), to: iso(end) })
      setAnchor(null)
    }
  }

  return (
    <div className="w-[280px] select-none p-1">
      <div className="mb-2 flex items-center justify-between px-1">
        <button onClick={() => go(-1)} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={format(view, 'yyyy-MM')}
            initial={{ opacity: 0, y: dir >= 0 ? 6 : -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: dir >= 0 ? -6 : 6 }}
            transition={{ duration: 0.15 }}
            className="text-sm font-semibold capitalize"
          >
            {format(view, "MMMM 'de' yyyy", { locale: ptBR })}
          </motion.span>
        </AnimatePresence>
        <button onClick={() => go(1)} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEK.map((w, i) => (
          <div key={i} className="flex h-6 items-center justify-center text-[10px] font-semibold uppercase text-muted-foreground/60">{w}</div>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={format(view, 'yyyy-MM')}
          initial={{ opacity: 0, x: dir >= 0 ? 16 : -16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: dir >= 0 ? -16 : 16 }}
          transition={{ duration: 0.18 }}
          className="grid grid-cols-7 gap-1"
        >
          {days.map((d) => {
            const inMonth = isSameMonth(d, view)
            const isFrom = isSameDay(d, fromD)
            const isTo = isSameDay(d, toD)
            const inRange = isWithinInterval(d, { start: fromD, end: toD })
            const endpoint = isFrom || isTo
            return (
              <button
                key={d.toISOString()}
                onClick={() => pick(d)}
                className={cn(
                  'relative flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-colors',
                  !inMonth && 'text-muted-foreground/30',
                  inMonth && !inRange && 'text-foreground hover:bg-accent',
                  inRange && !endpoint && 'bg-primary/15 text-primary',
                  endpoint && 'bg-primary font-semibold text-primary-foreground shadow-[0_0_10px_hsl(var(--primary)/0.5)]',
                )}
              >
                {format(d, 'd')}
              </button>
            )
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
