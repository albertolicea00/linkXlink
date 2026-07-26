import { useTranslation } from 'react-i18next'
import { StaffGate } from './admin/StaffGate'
import { ModeratorDashboard } from './admin/ModeratorDashboard'
import { MODERATOR_PATH } from '../lib/adminPath'

/** Moderator route: pending queue + approve/deny deck. Moderators and admins. */
export function Moderator() {
  const { t } = useTranslation()

  return (
    <StaffGate section={t('nav.moderator')} path={MODERATOR_PATH} requires="staff">
      <ModeratorDashboard />
    </StaffGate>
  )
}
