import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader } from '../../components/Loader'
import {
  listModerators,
  searchUsers,
  addModerator,
  removeModerator,
  type Moderator,
  type UserSearchResult,
} from '../../lib/moderators'

/**
 * Predecessor of AdminsManager — moderator-only search/promote/remove, no
 * confirmation step, no admin-promotion. Kept for reference; superseded by
 * AdminsManager (which handles both roles + confirm dialogs + collapsible
 * lists) but intentionally left unused rather than deleted.
 */
export function ModeratorsManager() {
  const { t } = useTranslation()
  const [moderators, setModerators] = useState<Moderator[]>([])
  const [term, setTerm] = useState('')
  const [results, setResults] = useState<UserSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [loadingMods, setLoadingMods] = useState(true)

  const load = () => {
    setLoadingMods(true)
    void listModerators().then((m) => {
      setModerators(m)
      setLoadingMods(false)
    })
  }

  useEffect(() => {
    load()
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

  const promote = async (u: UserSearchResult) => {
    const { error } = await addModerator(u.id, u.email)
    if (!error) {
      setTerm('')
      setResults([])
      load()
    }
  }

  const demote = async (id: string) => {
    const { error } = await removeModerator(id)
    if (!error) load()
  }

  return (
    <section className="moderators">
      <h2>{t('admin.moderatorsTitle')}</h2>

      <div className="field">
        <label htmlFor="mod-search">{t('admin.moderatorSearch')}</label>
        <input
          id="mod-search"
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
              {modIds.has(u.id) ? (
                <span className="status status--active">{t('admin.alreadyModerator')}</span>
              ) : (
                <button type="button" className="btn btn--primary" onClick={() => void promote(u)}>
                  {t('admin.makeModerator')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <h3 className="moderators__subtitle">
        {t('admin.currentModerators')} ({moderators.length})
      </h3>
      {loadingMods ? (
        <Loader text={t('feed.loading')} />
      ) : moderators.length === 0 ? (
        <p className="form-message">{t('admin.noModerators')}</p>
      ) : (
        <ul className="moderators__list">
          {moderators.map((m) => (
            <li key={m.id}>
              <span>{m.email}</span>
              <button type="button" className="btn btn--report" onClick={() => void demote(m.id)}>
                {t('admin.removeModerator')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
