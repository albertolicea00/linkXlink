import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StatCard } from '../../components/StatCard'
import { fetchAdminStats, type AdminStats } from '../../lib/moderators'
import { useAdminProfiles } from '../../hooks/useAdminProfiles'
import { getDevFlags } from '../../lib/devFlags'
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

      <AdminsManager />
    </div>
  )
}
