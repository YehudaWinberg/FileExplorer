import type { FileSystemEntry, FolderRef, SpecialFolderKey } from './models/entry'

export type FsErrorCode = 'permission' | 'not-found' | 'unsupported' | 'unknown'

export class FsError extends Error {
  code: FsErrorCode

  constructor(code: FsErrorCode, message: string) {
    super(message)
    this.name = 'FsError'
    this.code = code
  }
}

/**
 * הממשק היחיד שדרכו האפליקציה ניגשת למערכת הקבצים.
 * כל הפעולות לקריאה בלבד.
 */
export interface FileSystemAdapter {
  isSupported(): boolean
  /** פותח חלון בחירת תיקייה. מחזיר null אם המשתמש ביטל. */
  pickFolder(startIn?: SpecialFolderKey): Promise<FolderRef | null>
  /** תוכן רמה אחת של התיקייה (Lazy), כולל פרטי קבצים. */
  listEntries(folder: FolderRef): Promise<FileSystemEntry[]>
  /** תיקיות משנה בלבד, ללא קריאת פרטי קבצים (לעץ הניווט). */
  listSubfolders(folder: FolderRef): Promise<FolderRef[]>
  /**
   * שם, סוג ומזהה בלבד (בלי גודל ותאריך ובלי getFile), לסריקה עמוקה.
   * לא מבקש הרשאה: תיקייה שדורשת אותה נזרקת כ-`permission`.
   */
  listNames(folder: FolderRef): Promise<FileSystemEntry[]>
  /** קורא את הקובץ (File) לצורך תצוגה מקדימה ומטא-דאטה. */
  getFile(entry: FileSystemEntry): Promise<File>
}
