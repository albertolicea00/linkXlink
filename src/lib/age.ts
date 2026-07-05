/** Whole years from an ISO birthdate (yyyy-mm-dd), or null if unset/invalid. */
export function ageFromBirthdate(birthdate?: string | null): number | null {
  if (!birthdate) return null
  const born = new Date(birthdate)
  if (Number.isNaN(born.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - born.getFullYear()
  const m = now.getMonth() - born.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < born.getDate())) age--
  return age >= 0 && age < 130 ? age : null
}
