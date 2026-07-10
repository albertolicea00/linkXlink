import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader } from '../../components/Loader'
import { ConfirmModal } from '../../components/ConfirmModal'
import { notify } from '../../components/Toast'
import { useNav } from '../../context/nav'
import {
  listModerators,
  listAdmins,
  searchUsers,
  addModerator,
  addAdmin,
  removeModerator,
  removeAdmin,
  type Moderator,
  type UserSearchResult,
} from '../../lib/moderators'

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
}

type ConfirmAction =
  | { kind: 'promote-mod'; user: UserSearchResult }
  | { kind: 'promote-admin'; user: UserSearchResult }
  | { kind: 'remove-mod'; target: Moderator }
  | { kind: 'remove-admin'; target: Moderator }

/**
 * Search users, promote to moderator OR admin (each confirmed), and manage
 * both roles from two collapsible lists (collapsed by default — the lists can
 * get long and this section sits above the fold). Removing an admin also
 * requires confirmation; an admin can't remove themselves (self-lockout guard).
 */
export function AdminsManager() {
  const { t } = useTranslation()
  const { session } = useNav()
  const [moderators, setModerators] = useState<Moderator[]>([])
  const [admins, setAdmins] = useState<Moderator[]>([])
  const [loadingStaff, setLoadingStaff] = useState(true)
  const [term, setTerm] = useState('')
  const [results, setResults] = useState<UserSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [modsCollapsed, setModsCollapsed] = useState(true)
  const [adminsCollapsed, setAdminsCollapsed] = useState(true)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [busy, setBusy] = useState(false)

  const loadStaff = () => {
    setLoadingStaff(true)
    void Promise.all([listModerators(), listAdmins()]).then(([m, a]) => {
      setModerators(m)
      setAdmins(a)
      setLoadingStaff(false)
    })
  }

  useEffect(() => {
    loadStaff()
  }, [])

  // Debounced search so we don't hit the RPC on every keystroke.
  useEffect(() => {
    const q = term.trim()
    if (!q) {
      setResults([])
      return
    }
    setSearching(true)
    const id = window.setTimeout(() => {
      void searchUsers(q).then((r) => {
        setResults(r)
        setSearching(false)
      })
    }, 350)
    return () => window.clearTimeout(id)
  }, [term])

  const modIds = new Set(moderators.map((m) => m.id))
  const adminIds = new Set(admins.map((a) => a.id))

  const runConfirmed = async () => {
    if (!confirmAction) return
    setBusy(true)
    let error = false
    switch (confirmAction.kind) {
      case 'promote-mod':
        ({ error } = await addModerator(confirmAction.user.id, confirmAction.user.email))
        break
      case 'promote-admin':
        ({ error } = await addAdmin(confirmAction.user.id, confirmAction.user.email))
        break
      case 'remove-mod':
        ({ error } = await removeModerator(confirmAction.target.id))
        break
      case 'remove-admin':
        ({ error } = await removeAdmin(confirmAction.target.id))
        break
    }
    setBusy(false)
    const kind = confirmAction.kind
    setConfirmAction(null)
    if (error) {
      notify('error', t('admin.staffActionError'))
      return
    }
    if (kind === 'promote-mod' || kind === 'promote-admin') {
      setTerm('')
      setResults([])
    }
    const successKey = {
      'promote-mod': 'admin.promotedModMsg',
      'promote-admin': 'admin.promotedAdminMsg',
      'remove-mod': 'admin.removedModMsg',
      'remove-admin': 'admin.removedAdminMsg',
    }[kind]
    notify('success', t(successKey))
    loadStaff()
  }

  const confirmCopy = (): { title: string; message: string; danger: boolean } | null => {
    if (!confirmAction) return null
    switch (confirmAction.kind) {
      case 'promote-mod':
        return {
          title: t('admin.confirmPromoteModTitle'),
          message: t('admin.confirmPromoteModText', { email: confirmAction.user.email }),
          danger: false,
        }
      case 'promote-admin':
        return {
          title: t('admin.confirmPromoteAdminTitle'),
          message: t('admin.confirmPromoteAdminText', { email: confirmAction.user.email }),
          danger: false,
        }
      case 'remove-mod':
        return {
          title: t('admin.confirmRemoveModTitle'),
          message: t('admin.confirmRemoveModText', { email: confirmAction.target.email }),
          danger: true,
        }
      case 'remove-admin':
        return {
          title: t('admin.confirmRemoveAdminTitle'),
          message: t('admin.confirmRemoveAdminText', { email: confirmAction.target.email }),
          danger: true,
        }
    }
  }
  const copy = confirmCopy()

  return (
    <section className="moderators">
      <h2>{t('admin.staffTitle')}</h2>

      <div className="field">
        <label htmlFor="staff-search">{t('admin.moderatorSearch')}</label>
        <input
          id="staff-search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder={t('admin.moderatorSearchPlaceholder')}
          autoComplete="off"
        />
        <span className="field-help">{t('admin.moderatorSearchHelp')}</span>
      </div>

      {searching && <p className="form-message">{t('admin.searching')}</p>}
      {results.length > 0 && (
        <ul className="moderators__results">
          {results.map((u) => (
            <li key={u.id}>
              <span>{u.email}</span>
              <div className="moderators__result-actions">
                {modIds.has(u.id) ? (
                  <span className="status status--active">{t('admin.alreadyModerator')}</span>
                ) : (
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={() => setConfirmAction({ kind: 'promote-mod', user: u })}
                  >
                    {t('admin.makeModerator')}
                  </button>
                )}
                {adminIds.has(u.id) ? (
                  <span className="status status--active">{t('admin.alreadyAdmin')}</span>
                ) : (
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={() => setConfirmAction({ kind: 'promote-admin', user: u })}
                  >
                    {t('admin.makeAdmin')}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {loadingStaff ? (
        <Loader text={t('feed.loading')} />
      ) : (
        <>
          <CollapsibleList
            title={`${t('admin.currentModerators')} (${moderators.length})`}
            collapsed={modsCollapsed}
            onToggle={() => setModsCollapsed((c) => !c)}
            items={moderators}
            emptyLabel={t('admin.noModerators')}
            renderAction={(m) => (
              <button
                type="button"
                className="btn btn--report btn--icon"
                onClick={() => setConfirmAction({ kind: 'remove-mod', target: m })}
                aria-label={t('admin.removeModerator')}
                title={t('admin.removeModerator')}
              >
                <TrashIcon />
              </button>
            )}
          />

          <CollapsibleList
            title={`${t('admin.currentAdmins')} (${admins.length})`}
            collapsed={adminsCollapsed}
            onToggle={() => setAdminsCollapsed((c) => !c)}
            items={admins}
            emptyLabel={t('admin.noAdmins')}
            renderAction={(a) =>
              a.id === session?.user.id ? (
                <span className="status" title={t('admin.cantRemoveSelf')}>
                  {t('admin.you')}
                </span>
              ) : (
                <button
                  type="button"
                  className="btn btn--report btn--icon"
                  onClick={() => setConfirmAction({ kind: 'remove-admin', target: a })}
                  aria-label={t('admin.removeAdmin')}
                  title={t('admin.removeAdmin')}
                >
                  <TrashIcon />
                </button>
              )
            }
          />
        </>
      )}

      {copy && (
        <ConfirmModal
          title={copy.title}
          message={copy.message}
          danger={copy.danger}
          busy={busy}
          onConfirm={() => void runConfirmed()}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </section>
  )
}

function CollapsibleList({
  title,
  collapsed,
  onToggle,
  items,
  emptyLabel,
  renderAction,
}: {
  title: string
  collapsed: boolean
  onToggle: () => void
  items: Moderator[]
  emptyLabel: string
  renderAction: (item: Moderator) => ReactNode
}) {
  return (
    <div className="moderators__section">
      <button
        type="button"
        className="moderators__toggle"
        onClick={onToggle}
        aria-expanded={!collapsed}
      >
        <span aria-hidden className={`moderators__chevron${collapsed ? '' : ' moderators__chevron--open'}`}>
          ›
        </span>
        <h3 className="moderators__subtitle">{title}</h3>
      </button>
      {!collapsed &&
        (items.length === 0 ? (
          <p className="form-message">{emptyLabel}</p>
        ) : (
          <ul className="moderators__list">
            {items.map((m) => (
              <li key={m.id}>
                <span>{m.email}</span>
                {renderAction(m)}
              </li>
            ))}
          </ul>
        ))}
    </div>
  )
}
