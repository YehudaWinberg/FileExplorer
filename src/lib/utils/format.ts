const numberFormat = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 1 })
const dateFormat = new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' })

/** גודל בסגנון Windows: KB מעוגל כלפי מעלה, ואז MB/GB. */
export function formatSize(bytes: number | undefined): string {
  if (bytes === undefined) return ''
  const KB = 1024
  const MB = KB * 1024
  const GB = MB * 1024
  if (bytes < MB) return `${numberFormat.format(Math.ceil(bytes / KB))} KB`
  if (bytes < GB) return `${numberFormat.format(bytes / MB)} MB`
  return `${numberFormat.format(bytes / GB)} GB`
}

const gbFormat = new Intl.NumberFormat('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** סך גודל ב-GB (בסיס 1024) עם שתי ספרות אחרי הנקודה, תמיד ביחידת GB. */
export function formatTotalGb(bytes: number): string {
  return `${gbFormat.format(bytes / 1024 ** 3)} GB`
}

const MS_PER_DAY =24 * 60 * 60 * 1000

/** מספר ימים קלנדריים שעברו מאז timestamp (חצות לחצות, לפי אזור הזמן המקומי). */
function calendarDaysBetween(timestamp: number, now: number): number {
  const startOfDay = (t: number) => {
    const d = new Date(t)
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  }
  return Math.round((startOfDay(now) - startOfDay(timestamp)) / MS_PER_DAY)
}

/** "היום" / "אתמול" / "X ימים"; ריק כשאין תאריך שינוי. */
export function formatElapsedDays(timestamp: number | undefined, now: number = Date.now()): string {
  if (timestamp === undefined) return ''
  const days = calendarDaysBetween(timestamp, now)
  if (days <= 0) return 'היום'
  if (days === 1) return 'אתמול'
  return `${days} ימים`
}

export function formatDate(timestamp: number | undefined): string {
  return timestamp === undefined ? '' : dateFormat.format(new Date(timestamp))
}
