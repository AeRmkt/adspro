import { LogoMark } from './Logo'

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <LogoMark className="h-12 w-12 animate-pulse" />
        <p className="text-muted-foreground text-sm">Carregando Ads Pro...</p>
      </div>
    </div>
  )
}
