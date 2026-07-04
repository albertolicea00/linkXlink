import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePageMeta } from '../hooks/usePageMeta'
import { LEGAL_LAST_UPDATED, formatLegalDate } from '../lib/legal'

export function Eula() {
  const { t, i18n } = useTranslation()
  const es = i18n.resolvedLanguage === 'es'

  usePageMeta({ title: `${t('legal.eulaTitle')} | Link x Link`, path: '/eula' })

  return (
    <div className="page legal-page">
      <main>
        <h1>{t('legal.eulaTitle')}</h1>
        <p className="legal-page__updated">
          {t('legal.lastUpdated', { date: formatLegalDate(LEGAL_LAST_UPDATED, i18n.language) })}
        </p>
        {es ? (
          <>
            <p>
              Al usar Link x Link aceptas estos términos. La aplicación muestra perfiles públicos
              con enlaces de contacto a WhatsApp y no es responsable de las conversaciones o
              acuerdos que ocurran fuera de la plataforma.
            </p>
            <p>
              Los perfiles publicados deben contener información veraz. Los perfiles reportados por
              la comunidad pueden ser deshabilitados automáticamente sin previo aviso.
            </p>
            <p>
              El uso indebido de la aplicación (spam, fraude, suplantación de identidad) está
              prohibido y puede resultar en la eliminación de los perfiles asociados.
            </p>
            <p>
              El servicio se ofrece «tal cual», sin garantías de disponibilidad ni de exactitud de
              la información publicada.
            </p>
          </>
        ) : (
          <>
            <p>
              By using Link x Link you accept these terms. The application displays public profiles
              with WhatsApp contact links and is not responsible for conversations or agreements
              that happen outside the platform.
            </p>
            <p>
              Published profiles must contain truthful information. Profiles reported by the
              community may be disabled automatically without prior notice.
            </p>
            <p>
              Misuse of the application (spam, fraud, impersonation) is forbidden and may result in
              the removal of the associated profiles.
            </p>
            <p>
              The service is provided "as is", with no guarantees of availability or accuracy of
              the published information.
            </p>
          </>
        )}
        <div className="legal-page__actions">
          {es ? (
            <p>
              Lee también nuestra{' '}
              <Link to="/privacy">política de privacidad</Link>
              {' '}y nuestro{' '}
              <Link to="/data">uso de datos</Link>.
            </p>
          ) : (
            <p>
              Also read our{' '}
              <Link to="/privacy">privacy policy</Link>
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
