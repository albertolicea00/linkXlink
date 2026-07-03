export interface Profile {
  id: string
  name: string
  description: string
  whatsapp: string
  photos: string[]
  active: boolean
  report_count: number
  created_at: string
  disabled_at: string | null
}

export type ReportReason = 'link_not_found' | 'wrong_number' | 'fraudulent'

export interface Report {
  id: string
  profile_id: string
  reason: ReportReason
  comment: string | null
  created_at: string
}
