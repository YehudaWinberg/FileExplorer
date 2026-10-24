import type { FileSystemEntry } from '../models/entry'

export interface CompiledPattern {
  /** התאמת "מכיל" (לא מעוגנת, ללא רגישות לרישיות). עם סיומת חלה על שם הקובץ בלעדיה. */
  nameRe: RegExp
  /** סיומת באותיות קטנות ללא נקודה, או null כשהדפוס הוא תבנית שם בלבד. */
  extension: string | null
  /** מספר התווים שאינם `*` בחלק השם (`?` נספר כתו קבוע). */
  fixedChars: number
}

const SPECIAL_REGEX_CHARS = /[.*+?^${}()|[\]\\]/

function escapeChar(char: string): string {
  return SPECIAL_REGEX_CHARS.test(char) ? `\\${char}` : char
}

/** `*` = כל רצף (גם ריק), `?` = תו בודד, כל תו אחר מילולי. */
function wildcardToSource(text: string): { source: string; fixedChars: number } {
  let source = ''
  let fixedChars = 0
  for (const char of text) {
    if (char === '*') {
      if (!source.endsWith('.*')) source += '.*'
    } else {
      source += char === '?' ? '.' : escapeChar(char)
      fixedChars += 1
    }
  }
  return { source, fixedChars }
}

/**
 * מקמפל דפוס גולמי פעם אחת לחיפוש. סיומת מוגדרת רק בצורה `*.xxx` או `שם*.xxx`
 * (חלק השם מסתיים ב-`*` והסיומת ללא תווים כלליים); `report.pdf` ו-`.pdf` הם תבנית שם.
 */
export function compilePattern(raw: string): CompiledPattern {
  const pattern = raw.trim()
  const dot = pattern.lastIndexOf('.')
  const namePart = dot === -1 ? '' : pattern.slice(0, dot)
  const extPart = dot === -1 ? '' : pattern.slice(dot + 1)
  const hasExtension = namePart.endsWith('*') && extPart !== '' && !/[*?]/.test(extPart)

  const { source, fixedChars } = wildcardToSource(hasExtension ? namePart : pattern)
  return {
    nameRe: new RegExp(source, 'isu'),
    extension: hasExtension ? extPart.toLowerCase() : null,
    fixedChars,
  }
}

function baseName(entry: FileSystemEntry): string {
  const suffix = entry.extension ? `.${entry.extension}` : ''
  return suffix && entry.name.toLowerCase().endsWith(suffix) ? entry.name.slice(0, -suffix.length) : entry.name
}

/** האם הפריט תואם לדפוס. עם סיומת: קבצים בלבד והסיומת מדויקת. */
export function matchesPattern(compiled: CompiledPattern, entry: FileSystemEntry): boolean {
  if (compiled.extension === null) return compiled.nameRe.test(entry.name)
  return (
    entry.kind === 'file' &&
    entry.extension.toLowerCase() === compiled.extension &&
    compiled.nameRe.test(baseName(entry))
  )
}

const DEPTH_PENALTY = 5

/** המחרוזת שהדפוס "מכסה": שם הקובץ בלי הסיומת כשהדפוס מתאים לו, ואחרת השם המלא. */
function coveredName(compiled: CompiledPattern, entry: FileSystemEntry): string {
  if (compiled.extension !== null) return baseName(entry)
  const base = baseName(entry)
  return base !== entry.name && compiled.nameRe.test(base) ? base : entry.name
}

/**
 * ציון קרבה שלם בטווח 0..95, או null כשאין התאמה. בסיס השם הוא חלק התווים הקבועים
 * (`?` נחשב קבוע) מתוך השם המכוסה; ללא תווים קבועים הבסיס 100%. מופחתות 5 נקודות לכל
 * רמת עומק (פריט ישיר = עומק 1), עם רצפה ב-0, ולכן התוצאה אינה 100 לעולם.
 */
export function scoreMatch(compiled: CompiledPattern, entry: FileSystemEntry, depth: number): number | null {
  if (!matchesPattern(compiled, entry)) return null
  const length = [...coveredName(compiled, entry)].length
  const base = compiled.fixedChars === 0 || length === 0 ? 1 : Math.min(compiled.fixedChars / length, 1)
  const score = Math.round(Math.max(0, base * 100 - DEPTH_PENALTY * Math.max(depth, 1)))
  return Math.min(score, 100 - DEPTH_PENALTY)
}
