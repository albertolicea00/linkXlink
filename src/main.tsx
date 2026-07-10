import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom'
import './i18n'
import './index.css'
import { Landing } from './pages/Landing'
import { AppPage } from './pages/AppPage'
import { Admin } from './pages/Admin'
import { Register } from './pages/Register'
import { Account } from './pages/Account'
import { Eula } from './pages/Eula'
import { Privacy } from './pages/Privacy'
import { DataUsage } from './pages/DataUsage'
import { NotFound } from './pages/NotFound'
import { ResetPassword } from './pages/ResetPassword'
import { RouteError } from './pages/RouteError'
import { NavBar } from './components/NavBar'
import { DevFlagsFab } from './components/DevFlagsFab'
import { ConfettiRoot } from './components/Confetti'
import { ToastRoot } from './components/Toast'
import { NavStateProvider } from './context/nav'
import { hasAcceptedTerms } from './lib/terms'
import { ADMIN_PATH } from './lib/adminPath'
import { useOffline } from './hooks/useOffline'
import { WarningBanner } from './components/WarningBanner'
import { useTranslation } from 'react-i18next'
import { flushPendingEvents } from './lib/metrics'

function RequireTerms({ children }: { children: ReactNode }) {
  if (!hasAcceptedTerms()) return <Navigate to="/" replace />
  return children
}

// Persistent chrome for the signed-in-ish surface: the nav bar is mounted
// ONCE here, so navigating between these pages (or flipping the admin view)
// never remounts or re-fetches it. Landing/legal sit outside → no nav bar.
function ChromeLayout() {
  const isOffline = useOffline()
  const { t } = useTranslation()

  return (
    <>
      {isOffline && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }}>
          <WarningBanner variant="warning" message={t('app.offline')} />
        </div>
      )}
      <Outlet />
      <NavBar />
      <DevFlagsFab />
    </>
  )
}

const router = createBrowserRouter([
  {
    // Single root so one errorElement catches render/loader errors on any route
    // (a friendly fallback instead of React Router's raw default screen).
    errorElement: <RouteError />,
    children: [
      { path: '/', element: <Landing /> },
      { path: '/es', element: <Landing lang="es" /> },
      { path: '/en', element: <Landing lang="en" /> },
      {
        element: <ChromeLayout />,
        children: [
          {
            path: '/app',
            element: (
              <RequireTerms>
                <AppPage />
              </RequireTerms>
            ),
          },
          { path: '/account', element: <Account /> },
          { path: ADMIN_PATH, element: <Admin /> },
        ],
      },
      { path: '/register', element: <Register /> },
      { path: '/es/register', element: <Register lang="es" /> },
      { path: '/en/register', element: <Register lang="en" /> },
      { path: '/reset-password', element: <ResetPassword /> },
      { path: '/eula', element: <Eula /> },
      { path: '/privacy', element: <Privacy /> },
      { path: '/data', element: <DataUsage /> },
      { path: '/cookies', element: <Navigate to="/data" replace /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

// Global, not tied to any page's lifecycle: retry queued profile_events the
// instant connectivity returns, and once on boot in case events queued in a
// previous session are still waiting from before the tab was last closed.
window.addEventListener('online', () => void flushPendingEvents())
void flushPendingEvents()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NavStateProvider>
      <ConfettiRoot />
      <ToastRoot />
      <RouterProvider router={router} />
    </NavStateProvider>
  </StrictMode>,
)
