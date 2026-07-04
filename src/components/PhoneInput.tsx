import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { getCountries, getCountryCallingCode, type CountryCode } from 'libphonenumber-js/max'

interface Props {
  country: CountryCode
  national: string
  onCountryChange: (country: CountryCode) => void
  onNationalChange: (national: string) => void
  onBlur?: () => void
}

/** ISO country code → emoji flag (regional indicator symbols). */
function flagEmoji(code: string): string {
  return String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0)))
}

export function PhoneInput({ country, national, onCountryChange, onNationalChange, onBlur }: Props) {
  const { t, i18n } = useTranslation()

  const countries = useMemo(() => {
    const displayNames = new Intl.DisplayNames([i18n.resolvedLanguage ?? 'es'], {
      type: 'region',
    })
    return getCountries()
      .map((code) => ({
        code,
        name: displayNames.of(code) ?? code,
        dial: getCountryCallingCode(code),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [i18n.resolvedLanguage])

  return (
    <div className="phone-input">
      <div className="phone-input__country">
        {/* Compact display; the real (transparent) select sits on top of it. */}
        <span className="phone-input__country-display" aria-hidden>
          {flagEmoji(country)} +{getCountryCallingCode(country)} ▾
        </span>
        <select
          className="phone-input__country-select"
          value={country}
          onChange={(e) => onCountryChange(e.target.value as CountryCode)}
          aria-label={t('register.country')}
        >
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name} (+{c.dial})
            </option>
          ))}
        </select>
      </div>
      <input
        className="phone-input__number"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        value={national}
        onChange={(e) => onNationalChange(e.target.value.replace(/[^0-9]/g, ''))}
        onBlur={onBlur}
        placeholder={t('register.whatsappPlaceholder')}
      />
    </div>
  )
}
