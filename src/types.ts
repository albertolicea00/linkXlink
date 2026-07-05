export type Gender = 'male' | 'female' | 'other'
export type InterestedIn = 'male' | 'female' | 'both'

export interface Profile {
  id: string
  name: string
  description: string
  whatsapp: string
  photos: string[]
  active: boolean
  is_fake: boolean
  report_count: number
  created_at: string
  disabled_at: string | null
  gender?: Gender | null
  interested_in?: InterestedIn | null
  birthdate?: string | null
  interests?: string[]
  self_hidden?: boolean
  hidden_until?: string | null
  owner_id?: string | null
}

export type ReportReason = 'link_not_found' | 'wrong_number' | 'fraudulent'

export interface Report {
  id: string
  profile_id: string
  reason: ReportReason
  comment: string | null
  created_at: string
}
