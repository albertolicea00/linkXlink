import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './i18n'
import './index.css'
import { Landing } from './pages/Landing'
import { AppPage } from './pages/AppPage'
import { Admin } from './pages/Admin'
import { Eula } from './pages/Eula'
import { Privacy } from './pages/Privacy'
import { NotFound } from './pages/NotFound'

const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  { path: '/app', element: <AppPage /> },
  { path: '/admin', element: <Admin /> },
  { path: '/eula', element: <Eula /> },
  { path: '/privacy', element: <Privacy /> },
  { path: '*', element: <NotFound /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
