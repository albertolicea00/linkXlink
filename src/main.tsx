import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
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
import { hasAcceptedTerms } from './lib/terms'
import { ADMIN_PATH } from './lib/adminPath'

function RequireTerms({ children }: { children: ReactNode }) {
  if (!hasAcceptedTerms()) return <Navigate to="/" replace />
  return children
}

const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  { path: '/es', element: <Landing lang="es" /> },
  { path: '/en', element: <Landing lang="en" /> },
  {
    path: '/app',
    element: (
      <RequireTerms>
        <AppPage />
      </RequireTerms>
    ),
  },
  { path: '/register', element: <Register /> },
  { path: '/es/register', element: <Register lang="es" /> },
  { path: '/en/register', element: <Register lang="en" /> },
  { path: '/account', element: <Account /> },
  { path: ADMIN_PATH, element: <Admin /> },
  { path: '/eula', element: <Eula /> },
  { path: '/privacy', element: <Privacy /> },
  { path: '/data', element: <DataUsage /> },
  { path: '/cookies', element: <Navigate to="/data" replace /> },
  { path: '*', element: <NotFound /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
