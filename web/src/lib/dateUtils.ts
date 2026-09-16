/** Local YYYY-MM-DD from a Date (avoids UTC shift from toISOString). */
export function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export function addMonths(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1)
}

/** Monday-first weekday index (0 = Mon … 6 = Sun). */
export function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7
}

/** datetime-local value for a calendar day at the given hour (local). */
export function dateKeyToLocalInput(key: string, hour = 19, minute = 0): string {
  return `${key}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}
