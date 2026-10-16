import type { FileSystemEntry } from '../models/entry'
import { getFileKind } from './fileTypes'

const MB = 1024 * 1024

/** סף "גדול" לתמונות. */
export const IMAGE_LARGE_THRESHOLD = 10 * MB
/** סף "גדול" לכל שאר הקבצים. */
export const DEFAULT_LARGE_THRESHOLD = 50 * MB
/** גודל שבו הסרגל מגיע לקצה האדום: 1GB. */
export const SCALE_MAX = 1024 * MB
/** גודל יחידה אחת בסרגל: כל 10MB מזיזים את הסמן צעד אחד ימינה. */
export const SCALE_STEP = 10 * MB
/** מספר היחידות בסרגל (102). */
export const SCALE_STEPS = Math.floor(SCALE_MAX / SCALE_STEP)

/** האם הקובץ נחשב גדול: תמונה מעל 10MB, כל קובץ אחר מעל 50MB. תיקיות אף פעם לא. */
export function isLargeFile(entry: Pick<FileSystemEntry, 'kind' | 'extension' | 'size'>): boolean {
  if (entry.kind !== 'file' || entry.size === undefined) return false
  const threshold = getFileKind(entry) === 'image' ? IMAGE_LARGE_THRESHOLD : DEFAULT_LARGE_THRESHOLD
  return entry.size > threshold
}

/** מספר היחידות השלמות (0..102) שהגודל מזיז את הסמן ימינה. */
export function sizeScaleStep(size: number): number {
  return Math.min(SCALE_STEPS, Math.max(0, Math.floor(size / SCALE_STEP)))
}

/** מיקום הגודל על הסרגל, 0 (שמאל, ירוק) עד 1 (ימין, אדום), בקפיצות של יחידה. */
export function sizeScalePosition(size: number): number {
  return sizeScaleStep(size) / SCALE_STEPS
}

/** צבע בנקודה מסוימת בסרגל: ירוק חלש (בהיר ועדין) ועד אדום חזק (רווי). */
export function scaleColor(position: number): string {
  const p = Math.min(1, Math.max(0, position))
  const hue = Math.round(120 * (1 - p))
  const saturation = Math.round(35 + 55 * p)
  const lightness = Math.round(65 - 20 * p)
  return `hsl(${hue} ${saturation}% ${lightness}%)`
}

/** גרדיאנט הסרגל המלא משמאל (ירוק חלש) לימין (אדום חזק), עם צבעי ביניים. */
export const SCALE_GRADIENT = `linear-gradient(to right, ${[0, 0.25, 0.5, 0.75, 1].map(scaleColor).join(', ')})`
