/** הפניה אטומית לתיקייה. רכיבי ה-UI לא מכירים את ה-handle של הדפדפן. */
export interface FolderRef {
  id: string
  name: string
  parent: FolderRef | null
}

export type EntryKind = 'folder' | 'file'

export interface FileSystemEntry {
  id: string
  name: string
  kind: EntryKind
  /** גודל בבתים (קבצים בלבד). */
  size?: number
  /** זמן שינוי אחרון במילישניות (קבצים בלבד; הדפדפן לא מספק תאריך לתיקיות). */
  modified?: number
  /** סיומת באותיות קטנות, ללא נקודה. */
  extension: string
  mimeType?: string
  /** הקובץ קיים אך לא ניתן היה לקרוא אותו (הרשאה / נעול). */
  unreadable?: boolean
  /** הפניה לתיקייה, קיימת רק כאשר kind === 'folder'. */
  folder?: FolderRef
}

/** תיקיות המערכת שהדפדפן יכול להציע כנקודת פתיחה בחלון הבחירה. */
export type SpecialFolderKey = 'desktop' | 'documents' | 'downloads' | 'pictures'

export type Location =
  | { type: 'home' }
  | { type: 'pc' }
  | { type: 'quick' }
  | { type: 'folder'; folder: FolderRef }

export function sameLocation(a: Location, b: Location): boolean {
  if (a.type !== b.type) return false
  return a.type === 'folder' && b.type === 'folder' ? a.folder.id === b.folder.id : true
}

/** שרשרת התיקיות מהשורש ועד התיקייה (כולל). */
export function folderChain(folder: FolderRef): FolderRef[] {
  const chain: FolderRef[] = []
  for (let f: FolderRef | null = folder; f; f = f.parent) chain.unshift(f)
  return chain
}

/** מיקום פריט ביחס לתיקיית השורש שנבחרה (ללא שם השורש), למשל "Documents/Report.pdf". */
export function relativePath(folder: FolderRef, name: string): string {
  return [...folderChain(folder).slice(1).map((f) => f.name), name].join('/')
}
