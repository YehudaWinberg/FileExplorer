// לוגיקה טהורה (בלי I/O) לחסימת גישה לקבצים רגישים: קובצי env ו-settings.json של תיקיית .claude.

const ALLOW = { blocked: false, reason: '' }
const deny = (reason) => ({ blocked: true, reason })

// מפרק נתיב לשם קובץ מנורמל (אותיות קטנות, בלי :stream, בלי נקודות/רווחים בסוף) ולתיקיית האב.
function split(p) {
  const parts = []
  // קידומת כונן יחסית (C:.env) מוסרת כדי שלא תיחשב כ-:stream; מקטעים ריקים, '.' ו-'..' מנורמלים.
  for (const seg of String(p).replace(/\\/g, '/').replace(/^[a-z]:(?!\/)/i, '').split('/')) {
    if (seg === '' || seg === '.') continue
    if (seg === '..') parts.pop()
    else parts.push(seg)
  }
  let name = parts.pop() ?? ''
  const parent = (parts.pop() ?? '').replace(/[. ]+$/, '').toLowerCase()
  const colon = name.indexOf(':')
  if (colon !== -1) name = name.slice(0, colon)
  name = name.replace(/[. ]+$/, '').toLowerCase()
  return { name, parent }
}

const isEnvName = (name) => name.endsWith('.env') || name.startsWith('.env.')

function envReason(p) {
  return `הגישה לקובץ סודות (${p}) חסומה: קובצי env מכילים סודות ואסור ל-agent לקרוא או לערוך אותם. אם צריך ערך, בקשו מהמשתמש לספק אותו.`
}
function settingsReason(p) {
  return `הגישה ל-${p} חסומה: קובץ settings.json של .claude מגדיר את ה-hooks שמגנים על הפרויקט. שינוי בו שמור למשתמש.`
}

export function checkFilePath(p) {
  if (typeof p !== 'string' || p.trim() === '') return deny('נתיב הקובץ חסר או לא תקין, לכן הגישה נחסמה.')
  const { name, parent } = split(p)
  if (isEnvName(name)) return deny(envReason(p))
  if (name === 'settings.json' && parent === '.claude') return deny(settingsReason(p))
  return ALLOW
}

// בדיקת glob: שם הקובץ האחרון, בכל חלופה של {a,b}; תבניות כמו .env* נחסמות, ו-settings.json גם בלי תיקיית אב.
function checkGlob(glob) {
  for (const piece of glob.split(/[{},\s]+/).filter(Boolean)) {
    const r = checkFilePath(piece)
    if (r.blocked) return r
    const { name } = split(piece)
    if (name.startsWith('.env') || name === 'settings.json') {
      return deny(name === 'settings.json' ? settingsReason(glob) : envReason(glob))
    }
  }
  return ALLOW
}

// היוריסטיקה: כל טוקן בפקודה נבדק כנתיב.
function checkShell(command) {
  if (typeof command !== 'string') return ALLOW
  for (const token of command.split(/[\s"'`;|&<>(),=]+/).filter(Boolean)) {
    // גם החלק שאחרי ':' נבדק, כדי לתפוס פרמטרים כמו -Path:.env
    for (const candidate of [token, ...token.split(':').filter(Boolean)]) {
      const r = checkFilePath(candidate)
      if (r.blocked) return r
    }
  }
  return ALLOW
}

export function checkToolCall(input) {
  if (input === null || typeof input !== 'object') return deny('קלט ה-hook לא תקין, לכן הפעולה נחסמה.')
  const tool = input.tool_name
  const args = input.tool_input ?? {}
  if (tool === 'Read' || tool === 'Edit' || tool === 'Write') return checkFilePath(args.file_path)
  if (tool === 'Grep') {
    for (const key of ['path', 'glob']) {
      if (args[key] !== undefined && args[key] !== null && typeof args[key] !== 'string') return deny(`הפרמטר ${key} ב-Grep אינו מחרוזת, לכן הפעולה נחסמה.`)
    }
    if (typeof args.path === 'string' && args.path !== '') {
      const r = checkFilePath(args.path)
      if (r.blocked) return r
    }
    if (typeof args.glob === 'string' && args.glob !== '') return checkGlob(args.glob)
    return ALLOW
  }
  if (tool === 'PowerShell') return checkShell(args.command)
  return ALLOW
}
