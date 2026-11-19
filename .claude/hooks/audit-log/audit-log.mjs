// hook יומן ביקורת ל-PreToolUse, PostToolUse ו-Stop: מוסיף שורת JSON ל-logs/agent-audit-YYYY-MM-DD.jsonl.
// צופה בלבד: כל כשל (קלט פגום, הרשאות, timeout) מסתיים ב-exit 0 בלי פלט, ואינו חוסם.
import { appendFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { buildEntry, dayFileName } from './audit-entry.mjs'

const WRITE_TIMEOUT_MS = 2_000
const WATCHDOG_MS = 4_000

const done = () => process.exit(0)

// שעון עצר כללי: גם אם stdin נתקע ה-hook מסתיים לפני ה-timeout של settings.json.
setTimeout(done, WATCHDOG_MS)

async function writeEntry(input, entry) {
  const root = process.env.CLAUDE_PROJECT_DIR || (typeof input.cwd === 'string' ? input.cwd : process.cwd())
  const dir = join(root, 'logs')
  await mkdir(dir, { recursive: true })
  await appendFile(join(dir, dayFileName(new Date())), `${JSON.stringify(entry)}\n`, 'utf8')
}

let raw = ''
process.stdin.setEncoding('utf8')
process.stdin.on('error', done)
process.stdin.on('data', (chunk) => {
  raw += chunk
})
process.stdin.on('end', () => {
  let input
  try {
    input = JSON.parse(raw)
  } catch {
    return done()
  }
  try {
    const entry = buildEntry(input)
    if (!entry) return done()
    const timeout = new Promise((resolve) => setTimeout(resolve, WRITE_TIMEOUT_MS))
    Promise.race([writeEntry(input, entry), timeout]).catch(() => {}).finally(done)
  } catch {
    done()
  }
})
