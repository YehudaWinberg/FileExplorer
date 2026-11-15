import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { classifyFailure, evaluateStop } from './guard-check.mjs'

const script = join(dirname(fileURLToPath(import.meta.url)), 'check-on-stop.mjs')

const TSC = "src/a.ts(1,1): error TS2322: Type 'string' is not assignable to type 'number'."
const run = (result, opts = {}) => {
  let calls = 0
  const out = evaluateStop({ stopHookActive: false, srcChanged: true, ...opts, runCheck: () => (calls++, result) })
  return { out, calls }
}
const fail = (output, status = 1) => ({ status, timedOut: false, output })

describe('evaluateStop - טבלת ההחלטות', () => {
  it('שורה 2: אין שינוי תחת src: מאפשר וה-check לא רץ', () => {
    const { out, calls } = run(fail(TSC), { srcChanged: false })
    expect(out).toEqual({})
    expect(calls).toBe(0)
  })
  it('שורה 3: check עבר: מאפשר בלי הודעה', () => {
    expect(run({ status: 0, timedOut: false, output: 'ok' }).out).toEqual({})
  })
  it('שורה 4: timeout: מאפשר עם systemMessage', () => {
    const { out } = run({ status: null, timedOut: true, output: '' })
    expect(out.decision).toBeUndefined()
    expect(out.systemMessage).toMatch(/[א-ת]/)
  })
  it('שורה 5: כשל סביבתי, לא מסווג, או לא הרצה: מאפשר עם הפירוט', () => {
    for (const r of [fail('Error: ENOENT: no such file'), fail('משהו לא מוכר'), fail(TSC, 127), { status: null, timedOut: false, output: '', error: 'spawn x' }]) {
      const { out } = run(r)
      expect(out.decision).toBeUndefined()
      expect(out.systemMessage).toMatch(/[א-ת]/)
    }
    expect(run(fail('Error: ENOENT: no such file')).out.systemMessage).toContain('ENOENT')
  })
  it('שורה 6: כשל תלוי-סוכן בפעם הראשונה: חוסם עם reason בעברית וסוף הפלט', () => {
    for (const stopHookActive of [false, undefined, 'true']) {
      const { out } = run(fail(TSC), { stopHookActive })
      expect(out.decision).toBe('block')
      expect(out.reason).toContain(TSC)
      expect(out.reason).toContain('ניסיון התיקון היחיד')
      expect(out.reason).toContain('לדווח')
    }
  })
  it('שורה 7: כשל תלוי-סוכן עם stop_hook_active=true: מאפשר עם systemMessage', () => {
    const { out } = run(fail(TSC), { stopHookActive: true })
    expect(out.decision).toBeUndefined()
    expect(out.systemMessage).toContain(TSC)
  })
  it('reason חותך את הפלט לסופו', () => {
    const { out } = run(fail(`${'x'.repeat(10000)}\n${TSC}`))
    expect(out.reason).toContain(TSC)
    expect(out.reason.length).toBeLessThan(4000)
  })
})

describe('classifyFailure', () => {
  it('תלוי-סוכן: tsc, lint, בדיקה', () => {
    for (const o of [TSC, 'Found 2 errors and 1 warning', ' FAIL  src/a.test.ts', 'Tests  1 failed | 3 passed']) expect(classifyFailure(o, 1), o).toBe('agent')
  })
  it('סביבתי: סימנים ידועים וקוד יציאה לא צפוי', () => {
    for (const o of ['EACCES: permission denied', 'ETIMEDOUT', 'Cannot find module x', "'tsc' is not recognized as an internal or external command", 'sh: vitest: not found']) {
      expect(classifyFailure(o, 1), o).toBe('env')
    }
    expect(classifyFailure(TSC, 2)).toBe('env')
    expect(classifyFailure(TSC, null)).toBe('env')
  })
  it('מעורב: סביבתי גובר', () => expect(classifyFailure(`${TSC}\nENOENT`, 1)).toBe('env'))
  it('לא מסווג: סביבתי', () => expect(classifyFailure('npm ERR! something', 1)).toBe('env'))
})

describe('E2E (אדאפטר)', () => {
  const runHook = (input) => {
    const r = spawnSync(process.execPath, [script], { input, encoding: 'utf8', timeout: 30000 })
    expect(r.error).toBeUndefined()
    return r
  }
  it('stdin פגום: exit 0 ו-systemMessage בלי חסימה', () => {
    for (const input of ['not json', '', 'null']) {
      const r = runHook(input)
      expect(r.status).toBe(0)
      const out = JSON.parse(r.stdout)
      expect(out.decision).toBeUndefined()
      expect(out.systemMessage).toMatch(/[א-ת]/)
    }
  })
  it('תיקיית פרויקט שאינה repo: fail open עם systemMessage', () => {
    const r = spawnSync(process.execPath, [script], {
      input: JSON.stringify({ stop_hook_active: false }),
      encoding: 'utf8',
      timeout: 30000,
      env: { ...process.env, CLAUDE_PROJECT_DIR: join(dirname(script), 'לא-קיים') },
    })
    expect(r.status).toBe(0)
    expect(JSON.parse(r.stdout).decision).toBeUndefined()
    expect(JSON.parse(r.stdout).systemMessage).toMatch(/[א-ת]/)
  })
})
