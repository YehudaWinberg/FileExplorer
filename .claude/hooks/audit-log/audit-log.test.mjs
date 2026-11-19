import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { buildEntry, dayFileName, extractTarget, localIso, redact } from './audit-entry.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const script = join(here, 'audit-log.mjs')
const dirs = []

function tempRoot() {
  const dir = mkdtempSync(join(tmpdir(), 'audit-log-'))
  dirs.push(dir)
  return dir
}

function runHook(input, root) {
  const r = spawnSync(process.execPath, [script], {
    input,
    encoding: 'utf8',
    timeout: 10000,
    env: { ...process.env, CLAUDE_PROJECT_DIR: root },
  })
  expect(r.error).toBeUndefined()
  return r
}

function readLines(root) {
  const file = join(root, 'logs', dayFileName(new Date()))
  return readFileSync(file, 'utf8').trim().split('\n').map((line) => JSON.parse(line))
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('הסתרת סודות', () => {
  it('שמות עם = או : ודגלים מוסתרים, והשם נשאר', () => {
    expect(redact('curl --password=hunter2')).toBe('curl --password=[REDACTED]')
    expect(redact('--token abc123 run')).toBe('--token [REDACTED] run')
    expect(redact('API_KEY=hunter2 npm run')).toBe('API_KEY=[REDACTED] npm run')
    expect(redact('token: "abc 123"')).toBe('token: [REDACTED]')
    expect(redact('{"password":"p@ss"}')).toBe('{"password":[REDACTED]}')
    expect(redact('client_secret=zzz')).toBe('client_secret=[REDACTED]')
  })
  it('Bearer ומפתחות sk- מוסתרים', () => {
    expect(redact('-H "Authorization: Bearer abc.def"')).toBe('-H "Authorization: Bearer [REDACTED]"')
    expect(redact('key sk-abcdefgh12345 end')).toBe('key [REDACTED] end')
  })
  it('טקסט רגיל לא משתנה', () => {
    expect(redact('git status --short')).toBe('git status --short')
    expect(redact('src/tokens.ts')).toBe('src/tokens.ts')
  })
})

describe('בניית רשומה', () => {
  const now = new Date(2026, 10, 20, 10, 5, 3)
  it('Pre/Post: event, tool ו-target לפי file_path', () => {
    const entry = buildEntry({ hook_event_name: 'PostToolUse', session_id: 's1', tool_name: 'Edit', tool_input: { file_path: 'src/a.ts' } }, now)
    expect(entry).toEqual({ timestamp: localIso(now), session_id: 's1', event: 'PostToolUse', tool: 'Edit', target: 'src/a.ts' })
    expect(entry.timestamp).toMatch(/^2026-11-20T10:05:03[+-]\d\d:\d\d$/)
  })
  it('Stop: tool ו-target הם null', () => {
    const entry = buildEntry({ hook_event_name: 'Stop', session_id: 's1', tool_name: 'Bash', tool_input: { command: 'x' } }, now)
    expect(entry).toMatchObject({ event: 'Stop', tool: null, target: null })
  })
  it('פקודה עם סוד מוסתרת', () => {
    const entry = buildEntry({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'curl -H "Authorization: Bearer abc" --password=x' } }, now)
    expect(entry.target).toBe('curl -H "Authorization: Bearer [REDACTED]" --password=[REDACTED]')
  })
  it('פקודה ארוכה נחתכת ל-200 אחרי ההסתרה', () => {
    const entry = buildEntry({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: `${'a'.repeat(190)} password=${'s'.repeat(50)}` } }, now)
    expect(entry.target).toHaveLength(200)
    expect(entry.target).not.toContain('ssss')
  })
  it('אירוע לא מוכר או קלט לא תקין = null', () => {
    expect(buildEntry({ hook_event_name: 'SessionStart' })).toBeNull()
    expect(buildEntry({})).toBeNull()
    expect(buildEntry(null)).toBeNull()
  })
  it('extractTarget: עדיפות ל-command, ואחרת null', () => {
    expect(extractTarget({ command: 'ls', file_path: 'a' })).toBe('ls')
    expect(extractTarget({ pattern: 'foo' })).toBe('foo')
    expect(extractTarget({})).toBeNull()
    expect(extractTarget(undefined)).toBeNull()
  })
  it('dayFileName לפי תאריך מקומי', () => {
    expect(dayFileName(new Date(2026, 0, 5))).toBe('agent-audit-2026-01-05.jsonl')
  })
})

describe('אדפטר (E2E)', () => {
  it('מוסיף שורות JSONL לקובץ היום, בלי פלט וב-exit 0', () => {
    const root = tempRoot()
    const pre = runHook(JSON.stringify({ hook_event_name: 'PreToolUse', session_id: 's1', tool_name: 'Bash', tool_input: { command: 'git push --force' } }), root)
    const stop = runHook(JSON.stringify({ hook_event_name: 'Stop', session_id: 's1' }), root)
    for (const r of [pre, stop]) {
      expect(r.status).toBe(0)
      expect(r.stdout).toBe('')
    }
    const lines = readLines(root)
    expect(lines).toHaveLength(2)
    expect(lines[0]).toMatchObject({ event: 'PreToolUse', tool: 'Bash', target: 'git push --force', session_id: 's1' })
    expect(lines[1]).toMatchObject({ event: 'Stop', tool: null, target: null })
  })
  it('סוד לא נכתב לקובץ', () => {
    const root = tempRoot()
    runHook(JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'run --password=hunter2' } }), root)
    const content = readFileSync(join(root, 'logs', dayFileName(new Date())), 'utf8')
    expect(content).not.toContain('hunter2')
    expect(content).toContain('--password=[REDACTED]')
  })
  it('קלט פגום ואירוע לא מוכר: אין קובץ, exit 0', () => {
    const root = tempRoot()
    for (const input of ['not json', '', JSON.stringify({ hook_event_name: 'SessionStart' })]) {
      const r = runHook(input, root)
      expect(r.status).toBe(0)
      expect(r.stdout).toBe('')
    }
    expect(existsSync(join(root, 'logs'))).toBe(false)
  })
  it('כשל כתיבה (logs הוא קובץ): exit 0 בלי פלט', () => {
    const root = tempRoot()
    writeFileSync(join(root, 'logs'), 'not a directory')
    const r = runHook(JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Read', tool_input: { file_path: 'a' } }), root)
    expect(r.status).toBe(0)
    expect(r.stdout).toBe('')
    expect(readdirSync(root)).toEqual(['logs'])
  })
})
