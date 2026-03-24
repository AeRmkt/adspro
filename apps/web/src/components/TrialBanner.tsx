import { Clock, X, Zap } from 'lucide-react'
import { useState } from 'react'
import { Button } from './ui/Button'

interface TrialBannerProps {
  trialEndsAt: string | null
}

export function TrialBanner({ trialEndsAt }: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || !trialEndsAt) return null

  const daysLeft = Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))

  if (daysLeft <= 0) return null

  const isUrgent = daysLeft <= 3

  return (
    <div
      className={`flex items-center justify-between px-4 py-2.5 text-sm ${
        isUrgent
          ? 'bg-destructive/10 border-b border-destructive/30 text-destructive'
          : 'bg-warning/10 border-b border-warning/30 text-warning'
      }`}
    >
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 flex-shrink-0" />
        <span>
          {isUrgent
            ? `Atenção! Seu período de teste expira em ${daysLeft} dia${daysLeft !== 1 ? 's' : ''}.`
            : `Você está no período de teste gratuito. Restam ${daysLeft} dias.`}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" className="h-7 gap-1.5">
          <Zap className="h-3 w-3" />
          Assinar Agora
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded hover:bg-white/10 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
