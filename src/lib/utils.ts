import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'

export function initials(name?: string | null) {
  return (name || 'Study partner').trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'S'
}

export function formatWhen(iso: string, timeZone?: string | null) {
  try {
    return formatInTimeZone(new Date(iso), timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', "EEE, MMM d · h:mm a zzz")
  } catch {
    return new Date(iso).toLocaleString()
  }
}

export function localDateTimeToIso(value: string, timeZone: string) {
  if (!value) throw new Error('Choose a date and time.')
  const date = fromZonedTime(value, timeZone)
  if (Number.isNaN(date.getTime())) throw new Error('Choose a valid date and time.')
  return date.toISOString()
}

export function readableError(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) return String(error.message)
  return 'Something went wrong. Please try again.'
}

export function slug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
