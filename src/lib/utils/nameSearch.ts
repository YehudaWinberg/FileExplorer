import type { FileSystemEntry } from '../models/entry'

/** מחרוזת החיפוש לצורך השוואה: ללא רווחים בקצוות וללא הבדל בין אותיות גדולות לקטנות. */
export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase()
}

/** התאמה חלקית לפי שם בלבד. חיפוש ריק (או רווחים בלבד) מתאים לכל פריט. */
export function matchesName(entry: FileSystemEntry, query: string): boolean {
  const needle = normalizeQuery(query)
  return needle === '' || entry.name.toLowerCase().includes(needle)
}

/** מסנן לפי שם תוך שמירה על הסדר המקורי. */
export function filterByName(entries: FileSystemEntry[], query: string): FileSystemEntry[] {
  if (normalizeQuery(query) === '') return entries
  return entries.filter((entry) => matchesName(entry, query))
}
