import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePageMeta } from '../hooks/usePageMeta'
import { LEGAL_LAST_UPDATED, formatLegalDate } from '../lib/legal'

export function Privacy() {
  const { t, i18n } = useTranslation()
  const es = i18n.resolvedLanguage === 'es'

  usePageMeta({ title: `${t('legal.privacyTitle')} | Link x Link`, path: '/privacy' })

  return (
    <div className="page legal-page">
      <main>
        <h1>{t('legal.privacyTitle')}</h1>
        <p className="legal-page__updated">
          {t('legal.lastUpdated', { date: formatLegalDate(LEGAL_LAST_UPDATED, i18n.language) })}
        </p>
        {es ? (
          <>
            <p>
              Link x Link no requiere registro y no recopila datos personales de los visitantes.
              El contador de interacciones se guarda únicamente en tu dispositivo.
            </p>
            <p>
              Los perfiles mostrados contienen información publicada voluntariamente: nombre,
              descripción, fotos y número de WhatsApp. Si apareces en un perfil y deseas su
              eliminación, repórtalo desde la propia aplicación.
            </p>
            <p>
              Los reportes enviados almacenan el motivo y el comentario opcional, sin datos que
              identifiquen a quien reporta.
            </p>
            <p>Las imágenes se alojan en Supabase Storage y se sirven mediante URLs públicas.</p>
          </>
        ) : (
          <>
            <p>
              Link x Link requires no sign-up and collects no personal data from visitors. The
              interaction counter is stored only on your device.
            </p>
            <p>
              Displayed profiles contain voluntarily published information: name, description,
              photos and WhatsApp number. If you appear in a profile and want it removed, report it
              from the app itself.
            </p>
            <p>
              Submitted reports store the reason and the optional comment, with no data identifying
              the reporter.
            </p>
            <p>Images are hosted on Supabase Storage and served through public URLs.</p>
          </>
        )}
        <Link to="/" className="btn">
          {t('legal.backHome')}
        </Link>
      </main>
    </div>
  )
}
