// לוגיקה טהורה של יומן הביקורת: הסתרת סודות, חילוץ target ובניית רשומה. בלי קלט/פלט.

export const EVENTS = ['PreToolUse', 'PostToolUse', 'Stop']
export const MAX_TARGET_LENGTH = 200
const REDACTED = '[REDACTED]'
const SECRET_NAME = 'password|passwd|token|api[_-]?key|secret'
const VALUE = '"[^"]*"|\'[^\']*\'|[^\\s"\',;&]+'

// הסדר חשוב: קודם דגלי שורת פקודה, אחר כך השמות עם = או :, ואחר כך Bearer ומפתחות sk-.
const RULES = [
  [new RegExp(`(--?(?:${SECRET_NAME}))(\\s+|=)(${VALUE})`, 'gi'), `$1$2${REDACTED}`],
  [new RegExp(`([\\w-]*(?:${SECRET_NAME})[\\w-]*)(["']?\\s*[=:]\\s*)(${VALUE})`, 'gi'), `$1$2${REDACTED}`],
  [/\bBearer\s+[^\s"']+/gi, `Bearer ${REDACTED}`],
  [/\bsk-[A-Za-z0-9_-]{8,}/g, REDACTED],
]

// מסתיר ערכים רגישים ומשאיר את שם המשתנה.
export function redact(text) {
  return RULES.reduce((acc, [pattern, replacement]) => acc.replace(pattern, replacement), text)
}

// ה-target: הפקודה (Bash/PowerShell), אחרת נתיב קובץ, אחרת path/pattern; אין ערך = null.
export function extractTarget(toolInput) {
  if (toolInput === null || typeof toolInput !== 'object') return null
  for (const key of ['command', 'file_path', 'path', 'pattern']) {
    const value = toolInput[key]
    if (typeof value === 'string' && value !== '') return value
  }
  return null
}

// הסתרה לפני חיתוך, כדי שסוד לא יישאר בחלק חתוך.
export function sanitizeTarget(target) {
  if (target === null) return null
  return redact(target).slice(0, MAX_TARGET_LENGTH)
}

const pad = (n) => String(n).padStart(2, '0')

// זמן מקומי בפורמט ISO עם offset, למשל 2026-11-20T10:05:03+02:00.
export function localIso(date) {
  const offset = -date.getTimezoneOffset()
  const sign = offset < 0 ? '-' : '+'
  const abs = Math.abs(offset)
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  return `${day}T${time}${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
}

// שם קובץ היומן של היום לפי תאריך מקומי.
export function dayFileName(date) {
  return `agent-audit-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.jsonl`
}

// רשומה לאירוע; null לאירוע לא מוכר או קלט שאינו אובייקט (אין מה לרשום).
export function buildEntry(input, now = new Date()) {
  if (input === null || typeof input !== 'object') return null
  const event = input.hook_event_name
  if (!EVENTS.includes(event)) return null
  const isStop = event === 'Stop'
  return {
    timestamp: localIso(now),
    session_id: typeof input.session_id === 'string' ? input.session_id : null,
    event,
    tool: !isStop && typeof input.tool_name === 'string' ? input.tool_name : null,
    target: isStop ? null : sanitizeTarget(extractTarget(input.tool_input)),
  }
}
