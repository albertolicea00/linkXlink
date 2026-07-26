import { useTranslation } from 'react-i18next'
import { StaffGate } from './admin/StaffGate'
import { AdminDashboard } from './admin/AdminDashboard'
import { ADMIN_PATH } from '../lib/adminPath'

/** Admin route: global stats + staff management. Admins only. */
export function Admin() {
  const { t } = useTranslation()

  return (
    <StaffGate section={t('nav.admin')} path={ADMIN_PATH} requires="admin">
      <AdminDashboard />
    </StaffGate>
  )
}
