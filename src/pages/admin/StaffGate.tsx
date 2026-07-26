import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../components/PageHeader'
import { Loader } from '../../components/Loader'
import { usePageMeta } from '../../hooks/usePageMeta'
import { useNav } from '../../context/nav'
import { LoginForm } from './LoginForm'

/**
 * Shared session/role gate for every staff route (config, admin, moderator).
 *
 * Role and session come from the nav context (fetched once). Regular users
 * share the same Supabase Auth, so a session alone is not enough — these pages
 * only open for rows in `admins` or `moderators`. This is UX-level; the real
 * boundary is RLS on every table the dashboards touch.
 */
export function StaffGate({
  section,
  path,
  /** 'admin' = admins only. 'staff' = moderators and admins. */
  requires,
  /** Widens the content column (940px) — for the config tables. */
  wide,
  children,
}: {
  section: string
  path: string
  requires: 'admin' | 'staff'
  wide?: boolean
  children: ReactNode
}) {
  const { t } = useTranslation()
  const { session, role, loading } = useNav()

  usePageMeta({ title: `${t('admin.title')} | Link x Link`, path, noindex: true })

  const allowed = requires === 'admin' ? role === 'admin' : role === 'admin' || role === 'moderator'

  return (
    <div className={`page admin-page${wide ? ' admin-page--wide' : ''}`}>
      <PageHeader section={section} />
      <main>
        {loading && (
          <div className="app-page__status">
            <Loader />
          </div>
        )}
        {!loading && !session && <LoginForm />}
        {!loading && session && !allowed && (
          <p className="app-page__status form-error">{t('admin.notAuthorized')}</p>
        )}
        {!loading && session && allowed && children}
      </main>
    </div>
  )
}
