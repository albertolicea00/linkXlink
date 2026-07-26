import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { StatCard } from '../../components/StatCard'
import { fetchAdminStats, type AdminStats } from '../../lib/moderators'
import { useAdminProfiles } from '../../hooks/useAdminProfiles'
import { getDevFlags } from '../../lib/devFlags'
import { CONFIG_PATH } from '../../lib/adminPath'
import devConfig from '../../config/dev-config.json'
import { AdminsManager } from './AdminsManager'

export function AdminDashboard() {
  const { t } = useTranslation()
  const { pending, active, banned } = useAdminProfiles()
  // Migrated/claimed counter is launch-migration noise for most sessions —
  // opt in from the dev panel when it's actually being watched.
  const showMigrated = getDevFlags().showMigratedStat
  // Global counters (fake/migrated/no-profile) — always the true DB totals,
  // deliberately independent of the panel's dev-flag-filtered profiles query.
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null)

  useEffect(() => {
    void fetchAdminStats().then(setAdminStats)
  }, [])

  return (
    <div className="admin-panel">
      <div className="admin-stats">
        <StatCard value={active} label={t('admin.statusActive')} variant="active" wide />

        <StatCard value={adminStats?.totalUsers ?? 0} label={t('admin.statsTotal')} variant="total" />
        <StatCard value={adminStats?.noProfile ?? 0} label={t('admin.statsNoProfile')} variant="banned" />
        
        <StatCard value={pending} label={t('admin.statsPending')} variant="pending" />
        <StatCard value={banned} label={t('admin.statsBanned')} variant="banned" />
        {showMigrated && (
          <StatCard
            value={`${(adminStats?.migrated ?? 0) - (adminStats?.migratedUnclaimed ?? 0)}/${adminStats?.migrated ?? 0}`}
            label={t('admin.statsMigrated')}
            title={t('admin.statsMigratedHint')}
            variant="pending"
            wide
          />
        )}
      </div>

      {/* Entry point to the config viewer. Same kill switch as the route
          itself, so turning it off leaves no dangling link. */}
      {devConfig.show_app_settings_to_admins && (
        <Link to={CONFIG_PATH} className="config-banner">
          <span className="config-banner__icon" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </span>
          <span className="config-banner__text">
            <strong>{t('config.bannerTitle')}</strong>
            <span>{t('config.bannerText')}</span>
          </span>
          <span className="config-banner__chevron" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </span>
        </Link>
      )}

      <AdminsManager />
    </div>
  )
}
