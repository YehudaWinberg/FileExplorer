// לוגיקה טהורה (בלי I/O) ל-hook מסוג Stop: האם לחסום סיום בגלל כשל ב-npm run check.
// הטבלה המלאה: _bmad-output/specs/spec-check-on-stop-hook/decision-table.md
// fail open: כל מה שאינו כשל תלוי-סוכן ברור מאפשר סיום (עם systemMessage כשיש מה לדווח).

const TAIL_CHARS = 3000

// סימנים סביבתיים. כשהם מופיעים לצד סימן תלוי-סוכן, הסביבתי גובר.
const ENV_PATTERNS = [
  /\bENOENT\b/,
  /\bEACCES\b/,
  /\bEPERM\b/,
  /\bETIMEDOUT\b/,
  /\bECONN(?:REFUSED|RESET)\b/,
  /\bENOTFOUND\b/,
  /Cannot find module/i,
  /command not found/i,
  /is not recognized as an internal or external command/i,
  /(?:tsc|oxlint|vitest)(?:\.cmd)?: not found/i,
  /node_modules.*(?:missing|not found|does not exist)/i,
]

// סימנים לכשל שהסוכן יכול לתקן: tsc, lint או בדיקה שנכשלה.
const AGENT_PATTERNS = [
  /error TS\d+/,
  /Found \d+ (?:errors?|warnings?)/,
  /\bFAIL\b/,
  /Tests?\s+\d+\s+failed/i,
  /Test Files\s+\d+\s+failed/i,
  /\bx\s+\S.*\(\d+\s*ms\)/,
]

export function tail(output, max = TAIL_CHARS) {
  const text = String(output ?? '').trim()
  return text.length > max ? `...${text.slice(-max)}` : text
}

// 'agent' = חוסם (פעם אחת), 'env' = סביבתי או לא מסווג, לא חוסם.
export function classifyFailure(output, status) {
  const text = String(output ?? '')
  if (status !== 1) return 'env'
  if (ENV_PATTERNS.some((re) => re.test(text))) return 'env'
  return AGENT_PATTERNS.some((re) => re.test(text)) ? 'agent' : 'env'
}

const allow = (systemMessage) => (systemMessage ? { systemMessage } : {})

// runCheck מוזרק כדי שהלוגיקה תישאר טהורה; היא מורצת רק כשיש שינוי תחת src/.
// runCheck מחזיר { status, timedOut, output, error? }.
export function evaluateStop({ stopHookActive, srcChanged, runCheck }) {
  if (!srcChanged) return allow()

  const result = runCheck()
  if (result.timedOut) {
    return allow('hook check-on-stop: npm run check חרג מ-2 דקות, לכן הסיום אושר בלי אימות. יש להריץ npm run check ידנית ולדווח על התוצאה.')
  }
  if (result.error) {
    return allow(`hook check-on-stop: לא ניתן היה להריץ npm run check (${result.error}), לכן הסיום אושר בלי אימות. יש לדווח על כך למשתמש.`)
  }
  if (result.status === 0) return allow()

  const output = tail(result.output)
  if (classifyFailure(result.output, result.status) === 'env') {
    return allow(`hook check-on-stop: npm run check נכשל מסיבה סביבתית או לא ברורה (קוד יציאה ${result.status}), לכן הסיום אושר. יש לדווח על הכשל למשתמש.\n${output}`)
  }
  if (stopHookActive === true) {
    return allow(`hook check-on-stop: npm run check עדיין נכשל אחרי ניסיון התיקון היחיד, לכן הסיום אושר. המשימה לא גמורה; יש לדווח על הכשל למשתמש.\n${output}`)
  }
  return {
    decision: 'block',
    reason: `npm run check נכשל, והמשימה אינה גמורה. זה ניסיון התיקון היחיד: יש לתקן את הכשל ולהריץ npm run check שוב. אם אי אפשר לתקן, יש לדווח על הכשל למשתמש בכנות בהודעה האחרונה.\n\nסוף הפלט:\n${output}`,
  }
}

export function failOpenMessage(detail) {
  return allow(`hook check-on-stop: ${detail}, לכן הסיום אושר בלי אימות. יש להריץ npm run check ידנית ולדווח על התוצאה.`)
}
