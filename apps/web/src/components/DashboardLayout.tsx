import { Outlet } from 'react-router-dom'
import { AppSidebar } from './AppSidebar'
import { Toaster } from './ui/Toaster'

export function DashboardLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <Toaster />
    </div>
  )
}
