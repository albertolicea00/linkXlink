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
              Link x Link está destinado únicamente a <strong>personas mayores de 18 años</strong>. 
              La plataforma no requiere registro y no recopila datos personales de los visitantes.
              El contador de interacciones se guarda únicamente en tu dispositivo.
            </p>
            <p>
              Dado que la aplicación muestra enlaces a WhatsApp para el contacto directo, ten en cuenta que no nos hacemos responsables 
              del uso que se le dé a esos enlaces. El uso de los servicios de WhatsApp está sujeto a la{' '}
              <a href="https://www.whatsapp.com/legal/privacy-policy" target="_blank" rel="noreferrer">
                política de privacidad de WhatsApp
              </a>.
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
            <p>
              Al crear tu cuenta y aceptar estos términos, tu correo electrónico se añade a
              nuestra lista de difusión de correo (gestionada por Brevo) para recibir novedades y
              comunicaciones de la app. Puedes darte de baja en cualquier momento desde el enlace
              incluido en esos correos.
            </p>
          </>
        ) : (
          <>
            <p>
              Link x Link is intended only for <strong>individuals over 18 years of age</strong>. 
              The platform requires no sign-up and collects no personal data from visitors. The
              interaction counter is stored only on your device.
            </p>
            <p>
              Since the application displays links to WhatsApp for direct contact, please note that we are not responsible 
              for the use of those links. The use of WhatsApp services is subject to{' '}
              <a href="https://www.whatsapp.com/legal/privacy-policy" target="_blank" rel="noreferrer">
                WhatsApp's privacy policy
              </a>.
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
            <p>
              By creating an account and accepting these terms, your email address is added to
              our email broadcast list (managed by Brevo) to receive app news and updates. You can
              unsubscribe at any time via the link included in those emails.
            </p>
          </>
        )}
        <div className="legal-page__actions">
          {es ? (
            <p>
              Lee también nuestros{' '}
              <Link to="/eula">términos y condiciones</Link>
              {' '}y nuestro{' '}
              <Link to="/data">uso de datos</Link>.
            </p>
          ) : (
            <p>
              Also read our{' '}
              <Link to="/eula">terms and conditions</Link>
              {' '}and our{' '}
              <Link to="/data">data usage policy</Link>.
            </p>
          )}
        </div>
        <Link to="/" className="btn">{t('legal.backHome')}</Link>
      </main>
    </div>
  )
}
