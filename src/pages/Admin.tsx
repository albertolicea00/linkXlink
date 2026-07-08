import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../components/PageHeader'
import { Loader } from '../components/Loader'
import { usePageMeta } from '../hooks/usePageMeta'
import { useNav } from '../context/nav'
import { ADMIN_PATH } from '../lib/adminPath'
import { LoginForm } from './admin/LoginForm'
import { AdminDashboard } from './admin/AdminDashboard'
import { ModeratorDashboard } from './admin/ModeratorDashboard'

export function Admin() {
  const { t } = useTranslation()
  // Role/session come from the shared nav context (fetched once). Regular
  // users share the same Supabase Auth, so a session alone is not enough —
  // the panel only opens for rows in `admins` or `moderators`.
  const { session, role, loading } = useNav()
  // Admins flip between views from the nav bar, which links to
  // ?view=admin / ?view=moderator. Moderators are locked to the moderator view.
  const [searchParams] = useSearchParams()
  const view: 'admin' | 'moderator' = searchParams.get('view') === 'moderator' ? 'moderator' : 'admin'
  const effectiveView = role === 'admin' ? view : 'moderator'

  usePageMeta({ title: `${t('admin.title')} | Link x Link`, path: ADMIN_PATH, noindex: true })

  return (
    <div className="page admin-page">
      <PageHeader section={effectiveView === 'moderator' ? t('nav.moderator') : t('nav.admin')} />
      <main>
        {!session && !loading && <LoginForm />}
        {session && loading && (
          <div className="app-page__status">
            <Loader text={t('admin.checkingAccess')} />
          </div>
        )}
        {session && !loading && role === null && (
          <p className="app-page__status form-error">{t('admin.notAuthorized')}</p>
        )}
        {session && role === 'admin' && effectiveView === 'admin' && <AdminDashboard />}
        {session && (role === 'admin' || role === 'moderator') && effectiveView === 'moderator' && (
          <ModeratorDashboard />
        )}
      </main>
    </div>
  )
}
