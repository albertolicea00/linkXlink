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
import { NavBar } from './components/NavBar'
import { NavStateProvider } from './context/nav'
import { hasAcceptedTerms } from './lib/terms'
import { ADMIN_PATH } from './lib/adminPath'
import { useOffline } from './hooks/useOffline'
import { WarningBanner } from './components/WarningBanner'
import { useTranslation } from 'react-i18next'

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
    </>
  )
}

const router = createBrowserRouter([
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
  { path: '/eula', element: <Eula /> },
  { path: '/privacy', element: <Privacy /> },
  { path: '/data', element: <DataUsage /> },
  { path: '/cookies', element: <Navigate to="/data" replace /> },
  { path: '*', element: <NotFound /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NavStateProvider>
      <RouterProvider router={router} />
    </NavStateProvider>
  </StrictMode>,
)
