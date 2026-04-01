import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { useAuth } from './hooks/useAuth'
import { DashboardLayout } from './components/DashboardLayout'
import { LoadingScreen } from './components/ui/LoadingScreen'

const Index = lazy(() => import('./pages/Index'))
const Campaigns = lazy(() => import('./pages/Campaigns'))
const AdSets = lazy(() => import('./pages/AdSets'))
const Ads = lazy(() => import('./pages/Ads'))
const Reports = lazy(() => import('./pages/Reports'))
const Settings = lazy(() => import('./pages/Settings'))
const Login = lazy(() => import('./pages/Login'))
const Cadastro = lazy(() => import('./pages/Cadastro'))
const NotFound = lazy(() => import('./pages/NotFound'))
const MetaCallback = lazy(() => import('./pages/MetaCallback'))

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/auth/meta/callback" element={<MetaCallback />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Index />} />
          <Route path="campanhas" element={<Campaigns />} />
          <Route path="conjuntos" element={<AdSets />} />
          <Route path="anuncios" element={<Ads />} />
          <Route path="relatorios" element={<Reports />} />
          <Route path="configuracoes" element={<Settings />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
