import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePageMeta } from '../hooks/usePageMeta'
import { LEGAL_LAST_UPDATED, formatLegalDate } from '../lib/legal'

export function DataUsage() {
  const { t, i18n } = useTranslation()
  const es = i18n.resolvedLanguage === 'es'

  usePageMeta({ title: `${t('legal.dataTitle')} | Link x Link`, path: '/data' })

  return (
    <div className="page legal-page">
      <main>
        <h1>{t('legal.dataTitle')}</h1>
        <p className="legal-page__updated">
          {t('legal.lastUpdated', { date: formatLegalDate(LEGAL_LAST_UPDATED, i18n.language) })}
        </p>
        {es ? (
          <>
            <h2>Recopilación de datos</h2>
            <p>
              La aplicación funciona sin registro y no requiere crear una cuenta para navegar por
              los perfiles. No recopilamos datos personales identificables de los visitantes más
              allá de lo descrito en la sección de analítica a continuación.
            </p>

            <h2>Analítica (Microsoft Clarity)</h2>
            <p>
              Utilizamos Microsoft Clarity para entender cómo se usa la aplicación: mapas de calor,
              grabaciones de sesión anonimizadas y estadísticas agregadas de navegación (páginas
              visitadas, clics, tiempo en la app). Clarity puede registrar la interacción con la
              pantalla, pero no capturamos ni introducimos manualmente datos como contraseñas o
              números de WhatsApp en los eventos que le reportamos. Clarity coloca cookies propias
              y de Microsoft y usa almacenamiento del navegador para diferenciar visitas nuevas de
              recurrentes. Esta herramienta corre para todos los visitantes (no solo usuarios
              registrados). Puedes leer más en la{' '}
              <a href="https://privacy.microsoft.com/privacystatement" target="_blank" rel="noreferrer">
                política de privacidad de Microsoft
              </a>.
            </p>

            <h2>Almacenamiento local</h2>
            <p>
              En tu navegador se guardan datos mínimos necesarios para el funcionamiento:
              la aceptación de los términos legales, la preferencia de tema (claro/oscuro) y un
              contador de interacciones para evitar límites de uso. Estos datos se almacenan
              únicamente en tu dispositivo y nunca se envían a nuestros servidores.
            </p>

            <h2>Cookies</h2>
            <p>
              Utilizamos una cookie de navegación para recordar tu aceptación de los términos. Esta
              cookie se asocia a la versión legal vigente; cuando los textos legales cambian, la
              cookie deja de ser válida y se te solicita aceptar de nuevo. Adicionalmente, Microsoft
              Clarity (ver sección de analítica) coloca sus propias cookies de rastreo con fines
              estadísticos. No usamos cookies publicitarias ni vendemos datos de navegación a
              terceros.
            </p>

            <h2>Datos de perfiles</h2>
            <p>
              Los perfiles que se muestran contienen información publicada voluntariamente por los
              usuarios: nombre, descripción, fotos y número de WhatsApp. Estos datos son públicos
              para quienes acceden a la aplicación. Si apareces en un perfil y deseas su
              eliminación, repórtalo desde la propia aplicación.
            </p>

            <h2>Reportes</h2>
            <p>
              Al reportar un perfil, envías el motivo y un comentario opcional. No almacenamos
              datos que identifiquen al remitente del reporte. La información se usa únicamente
              para moderar el contenido de la plataforma.
            </p>

            <h2>Servicios de terceros</h2>
            <p>
              Las imágenes de los perfiles se alojan en Supabase Storage y se sirven mediante URLs
              públicas. Los enlaces de contacto abren WhatsApp directamente en tu dispositivo.
              Usamos Microsoft Clarity para analítica de uso (ver sección anterior). No compartimos
              datos personales con terceros ni vendemos información.
            </p>

            <h2>Comunicaciones por correo</h2>
            <p>
              Al utilizar nuestra aplicación y aceptar estos términos, das tu consentimiento
              expreso para que tu dirección de correo electrónico sea añadida a nuestra lista
              de novedades y notificaciones. Utilizamos este medio para enviarte actualizaciones
              importantes y noticias. Puedes desuscribirte de estas comunicaciones en cualquier
              momento utilizando el enlace correspondiente en los correos que recibas.
            </p>

            <h2>Tus derechos</h2>
            <p>
              Puedes borrar los datos almacenados en tu navegador en cualquier momento desde la
              configuración del mismo. Si tienes dudas sobre el tratamiento de tus datos, contacta
              al equipo responsable del servicio.
            </p>
          </>
        ) : (
          <>
            <h2>Data collection</h2>
            <p>
              The application works without registration and does not require an account to
              browse profiles. We do not collect personally identifiable data from visitors beyond
              what is described in the analytics section below.
            </p>

            <h2>Analytics (Microsoft Clarity)</h2>
            <p>
              We use Microsoft Clarity to understand how the app is used: heatmaps, anonymized
              session recordings, and aggregated navigation stats (pages visited, clicks, time in
              app). Clarity may record on-screen interaction, but we do not capture or manually
              feed it sensitive data such as passwords or WhatsApp numbers in the events we report
              to it. Clarity sets its own and Microsoft's cookies and uses browser storage to tell
              new visits from repeat ones. This tool runs for all visitors, not just registered
              users. Read more in{' '}
              <a href="https://privacy.microsoft.com/privacystatement" target="_blank" rel="noreferrer">
                Microsoft's privacy statement
              </a>.
            </p>

            <h2>Local storage</h2>
            <p>
              Minimal data is stored in your browser for the app to function: terms acceptance,
              theme preference (light/dark), and an interaction counter to prevent usage limits.
              This data is stored only on your device and is never sent to our servers.
            </p>

            <h2>Cookies</h2>
            <p>
              We use a browser cookie to remember your terms acceptance. This cookie is tied to
              the current legal version; when the legal texts change, the cookie becomes invalid
              and you will be asked to accept again. Additionally, Microsoft Clarity (see the
              analytics section) sets its own tracking cookies for statistical purposes. We do not
              use advertising cookies or sell browsing data to third parties.
            </p>

            <h2>Profile data</h2>
            <p>
              The profiles displayed contain information voluntarily published by users: name,
              description, photos, and WhatsApp number. This data is public to anyone accessing
              the application. If you appear in a profile and want it removed, report it from
              the app itself.
            </p>

            <h2>Reports</h2>
            <p>
              When you report a profile, you send a reason and an optional comment. We do not
              store data identifying the report sender. This information is used solely to
              moderate platform content.
            </p>

            <h2>Third-party services</h2>
            <p>
              Profile images are hosted on Supabase Storage and served through public URLs.
              Contact links open WhatsApp directly on your device. We use Microsoft Clarity for
              usage analytics (see above). We do not share personal data with third parties or
              sell information.
            </p>

            <h2>Email communications</h2>
            <p>
              By using our application and accepting these terms, you give your express consent
              for your email address to be added to our news and notifications list. We use this
              to send you important updates and news. You can unsubscribe from these communications
              at any time using the link provided in the emails you receive.
            </p>

            <h2>Your rights</h2>
            <p>
              You can delete the data stored in your browser at any time through your browser
              settings. If you have questions about how your data is handled, contact the team
              responsible for the service.
            </p>
          </>
        )}
        <div className="legal-page__actions">
          {es ? (
            <p>
              Lee también nuestros{' '}
              <Link to="/eula">términos y condiciones</Link>
              {' '}y nuestra{' '}
              <Link to="/privacy">política de privacidad</Link>.
            </p>
          ) : (
            <p>
              Also read our{' '}
              <Link to="/eula">terms and conditions</Link>
              {' '}and our{' '}
              <Link to="/privacy">privacy policy</Link>.
            </p>
          )}
        </div>
        <Link to="/" className="btn">{t('legal.backHome')}</Link>
      </main>
    </div>
  )
}
