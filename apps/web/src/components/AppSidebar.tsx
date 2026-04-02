import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Zap, LayoutDashboard, Megaphone, Layers, Image, FileText,
  Settings, ChevronDown, ChevronRight, MessageCircle, LogOut,
  ExternalLink, TrendingUp, Database, Palette, Clock, Link2,
  Instagram, Building2,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { useDashboardStore } from '../store/dashboardStore'
import { signOut } from '../services/auth'
import { Button } from './ui/Button'

interface NavItem {
  label: string
  href?: string
  icon: React.ReactNode
  badge?: string
  disabled?: boolean
  children?: NavItem[]
}

const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: 'Campanhas',
    items: [
      { label: 'Meta Ads', href: '/', icon: <LayoutDashboard className="h-4 w-4" /> },
      { label: 'Google Ads', icon: <TrendingUp className="h-4 w-4" />, disabled: true },
      { label: 'Compilado', icon: <Database className="h-4 w-4" />, disabled: true },
      { label: 'Instagram', href: '/instagram', icon: <Instagram className="h-4 w-4" />, badge: 'NOVO' },
    ],
  },
  {
    title: 'Ferramentas de IA',
    items: [
      { label: 'Análise de Copy', icon: <Megaphone className="h-4 w-4" />, disabled: true },
      { label: 'Otimizador de Criativos', icon: <Palette className="h-4 w-4" />, disabled: true },
      { label: 'Previsão de Gasto', icon: <Clock className="h-4 w-4" />, disabled: true },
    ],
  },
  {
    title: 'Ferramentas',
    items: [
      { label: 'Conjuntos', href: '/conjuntos', icon: <Layers className="h-4 w-4" /> },
      { label: 'Anúncios', href: '/anuncios', icon: <Image className="h-4 w-4" /> },
      { label: 'Relatórios', href: '/relatorios', icon: <FileText className="h-4 w-4" /> },
      { label: 'Gerenciadores', href: '/gerenciadores', icon: <Building2 className="h-4 w-4" /> },
      { label: 'Rastreamento de Leads', icon: <Link2 className="h-4 w-4" />, disabled: true },
    ],
  },
]

export function AppSidebar() {
  const { sidebarCollapsed, toggleSidebar } = useDashboardStore()
  const [expandedSections, setExpandedSections] = useState<string[]>(['Campanhas', 'Ferramentas'])
  const navigate = useNavigate()

  const toggleSection = (title: string) => {
    setExpandedSections((prev) =>
      prev.includes(title) ? prev.filter((s) => s !== title) : [...prev, title]
    )
  }

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-card border-r border-border/40 transition-all duration-300 flex-shrink-0',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 border-b border-border/40">
        <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-md flex-shrink-0">
          <Zap className="h-4 w-4 text-white" />
        </div>
        {!sidebarCollapsed && (
          <span className="font-bold text-lg tracking-tight">AdsPro</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn('ml-auto h-7 w-7', sidebarCollapsed && 'mx-auto ml-0')}
          onClick={toggleSidebar}
        >
          <ChevronRight className={cn('h-4 w-4 transition-transform', !sidebarCollapsed && 'rotate-180')} />
        </Button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {navSections.map((section) => {
          const isExpanded = expandedSections.includes(section.title)
          return (
            <div key={section.title}>
              {!sidebarCollapsed && (
                <button
                  onClick={() => toggleSection(section.title)}
                  className="flex items-center justify-between w-full px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                >
                  {section.title}
                  <ChevronDown className={cn('h-3 w-3 transition-transform', isExpanded && 'rotate-180')} />
                </button>
              )}
              {(isExpanded || sidebarCollapsed) && (
                <div className="space-y-0.5 mt-1">
                  {section.items.map((item) => {
                    if (item.href) {
                      return (
                        <NavLink
                          key={item.label}
                          to={item.href}
                          end={item.href === '/'}
                          className={({ isActive }) =>
                            cn(
                              'flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors',
                              isActive
                                ? 'bg-primary/10 text-primary'
                                : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                              sidebarCollapsed && 'justify-center'
                            )
                          }
                          title={sidebarCollapsed ? item.label : undefined}
                        >
                          {item.icon}
                          {!sidebarCollapsed && (
                            <>
                              <span className="flex-1">{item.label}</span>
                              {item.badge && (
                                <span className="text-[10px] font-bold bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                                  {item.badge}
                                </span>
                              )}
                            </>
                          )}
                        </NavLink>
                      )
                    }
                    return (
                      <div
                        key={item.label}
                        className={cn(
                          'flex items-center gap-3 px-2 py-2 rounded-md text-sm text-muted-foreground/50 cursor-not-allowed',
                          sidebarCollapsed && 'justify-center'
                        )}
                        title={sidebarCollapsed ? `${item.label} (Em breve)` : undefined}
                      >
                        {item.icon}
                        {!sidebarCollapsed && (
                          <>
                            <span className="flex-1">{item.label}</span>
                            <span className="text-[10px] text-muted-foreground/50">Em breve</span>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {/* Configurações */}
        <div className="pt-2 border-t border-border/40">
          <NavLink
            to="/configuracoes"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-2 py-2 rounded-md text-sm transition-colors',
                isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                sidebarCollapsed && 'justify-center'
              )
            }
            title={sidebarCollapsed ? 'Configurações' : undefined}
          >
            <Settings className="h-4 w-4" />
            {!sidebarCollapsed && <span>Configurações</span>}
          </NavLink>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-border/40 space-y-1">
        <a
          href="https://wa.me/5511999999999"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'flex items-center gap-3 px-2 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors',
            sidebarCollapsed && 'justify-center'
          )}
          title={sidebarCollapsed ? 'WhatsApp Suporte' : undefined}
        >
          <MessageCircle className="h-4 w-4" />
          {!sidebarCollapsed && (
            <>
              <span className="flex-1">Suporte WhatsApp</span>
              <ExternalLink className="h-3 w-3 opacity-50" />
            </>
          )}
        </a>
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-3 px-2 py-2 rounded-md text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors w-full',
            sidebarCollapsed && 'justify-center'
          )}
          title={sidebarCollapsed ? 'Sair' : undefined}
        >
          <LogOut className="h-4 w-4" />
          {!sidebarCollapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  )
}
