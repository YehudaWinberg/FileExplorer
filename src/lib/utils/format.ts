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

export function formatDate(timestamp: number | undefined): string {
  return timestamp === undefined ? '' : dateFormat.format(new Date(timestamp))
}
