import { supabase } from './supabase'
import type { ReportReason } from '../types'

/**
 * Basic client-side spam control: remember which profiles this device
 * already reported and refuse duplicates locally.
 */
const STORAGE_KEY = 'lxl_reported'

function loadReported(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as string[]) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function hasReported(profileId: string): boolean {
  return loadReported().includes(profileId)
}

export async function submitReport(
  profileId: string,
  reason: ReportReason,
  comment: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('reports').insert({
    profile_id: profileId,
    reason,
    comment: comment.trim() || null,
  })

  if (error) return { error: error.message }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...loadReported(), profileId]))
  } catch {
    // best effort
  }
  return { error: null }
}
