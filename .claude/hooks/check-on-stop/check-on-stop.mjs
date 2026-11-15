// hook מסוג Stop: מריץ npm run check כשיש שינוי תחת src/ וחוסם סיום פעם אחת על כשל שהסוכן יכול לתקן.
// fail open: כל כשל, כולל קלט פגום או חריגה, מאשר סיום (exit 0) עם systemMessage.
import { spawnSync } from 'node:child_process'
import { realpathSync } from 'node:fs'
import { evaluateStop, failOpenMessage } from './guard-check.mjs'

const CHECK_TIMEOUT_MS = 120_000

// ב-Windows אות כונן קטנה בנתיב (c:\...) גורמת ל-vitest להיכשל; realpath.native מחזיר את הכתיב הקנוני.
function normalizeDir(dir) {
  try {
    return realpathSync.native(dir)
  } catch {
    return dir
  }
}

function emit(obj) {
  process.stdout.write(`${JSON.stringify(obj)}\n`, () => process.exit(0))
}

function hasSrcChanges(cwd) {
  const r = spawnSync('git', ['status', '--porcelain', '--', 'src'], { cwd, encoding: 'utf8', timeout: 15_000 })
  if (r.error || r.status !== 0) throw new Error(`git status נכשל${r.error ? ` (${r.error.message})` : ''}`)
  return r.stdout.trim() !== ''
}

function runCheck(cwd) {
  const r = spawnSync('npm run check', { cwd, shell: true, encoding: 'utf8', timeout: CHECK_TIMEOUT_MS, maxBuffer: 64 * 1024 * 1024 })
  const timedOut = r.error?.code === 'ETIMEDOUT'
  return {
    status: r.status,
    timedOut,
    error: !timedOut && r.error ? r.error.message : undefined,
    output: `${r.stdout ?? ''}\n${r.stderr ?? ''}`,
  }
}

let raw = ''
process.stdin.setEncoding('utf8')
process.stdin.on('error', () => emit(failOpenMessage('שגיאת קריאה מ-stdin')))
process.stdin.on('data', (chunk) => {
  raw += chunk
})
process.stdin.on('end', () => {
  try {
    let input
    try {
      input = JSON.parse(raw)
    } catch {
      return emit(failOpenMessage('קלט ה-hook אינו JSON תקין'))
    }
    if (input === null || typeof input !== 'object') return emit(failOpenMessage('קלט ה-hook אינו אובייקט'))
    const cwd = normalizeDir(process.env.CLAUDE_PROJECT_DIR || (typeof input.cwd === 'string' ? input.cwd : process.cwd()))
    emit(evaluateStop({ stopHookActive: input.stop_hook_active, srcChanged: hasSrcChanges(cwd), runCheck: () => runCheck(cwd) }))
  } catch (error) {
    emit(failOpenMessage(`שגיאה פנימית (${error instanceof Error ? error.message : 'לא ידועה'})`))
  }
})
