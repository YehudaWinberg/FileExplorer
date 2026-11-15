import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { checkFilePath, checkToolCall } from './guard-files.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const script = join(here, 'file-guard.mjs')
const settingsPath = join(here, '..', '..', 'settings.json')

function runHook(input) {
  const r = spawnSync(process.execPath, [script], { input, encoding: 'utf8', timeout: 10000 })
  expect(r.error).toBeUndefined()
  return r
}

describe('רישום ב-settings.json', () => {
  const settings = JSON.parse(readFileSync(settingsPath, 'utf8'))
  const entries = settings.hooks.PreToolUse
  it('ה-matcher מכסה את כל הכלים ונתיב הסקריפט קיים', () => {
    const entry = entries.find((e) => e.hooks.some((h) => h.command.includes('files/file-guard.mjs')))
    expect(entry).toBeDefined()
    for (const tool of ['Read', 'Edit', 'Write', 'Grep', 'PowerShell']) expect(new RegExp(`^(?:${entry.matcher})$`).test(tool), tool).toBe(true)
    expect(existsSync(script)).toBe(true)
  })
  it('bash-guard ו-permissions נשמרו', () => {
    expect(entries.some((e) => e.hooks.some((h) => h.command.includes('bash-guard.mjs')))).toBe(true)
    expect(settings.permissions.allow).toContain('Bash(npm run check)')
  })
})

describe('עקיפות נתיב ו-PowerShell', () => {
  it('נתיבי settings ו-env בצורות עקיפות נחסמים', () => {
    for (const p of ['.claude//settings.json', '.claude/./settings.json', '.claude/x/../settings.json', '.claude./settings.json', 'C:.env', 'C:settings.json']) {
      // C:settings.json אינו תחת .claude ולכן מותר; שאר הצורות חסומות
      expect(checkFilePath(p).blocked, p).toBe(p !== 'C:settings.json')
    }
  })
  it('פרמטר עם נקודתיים ב-PowerShell נחסם', () => {
    for (const command of ['Get-Content -Path:.env', 'gc -LiteralPath:.claude\\settings.json']) expect(call('PowerShell', { command }).blocked, command).toBe(true)
  })
  it('Grep עם path או glob שאינם מחרוזת נחסם', () => {
    expect(call('Grep', { pattern: 'x', path: 123 }).blocked).toBe(true)
    expect(call('Grep', { pattern: 'x', glob: ['.env'] }).blocked).toBe(true)
  })
})

const call = (tool_name, tool_input) => checkToolCall({ tool_name, tool_input })
const pathBlocked = (p) => expect(checkFilePath(p).blocked, p).toBe(true)
const pathAllowed = (p) => expect(checkFilePath(p).blocked, p).toBe(false)

describe('קובצי env', () => {
  it('חוסם', () => {
    for (const p of ['.env', 'a/.env.local', 'config.env', 'C:\\p\\.ENV', '.env.', '.env.example', 'x\\.env.sample', '.env ', '.env::$DATA', '.env:stream']) pathBlocked(p)
  })
  it('חוסם בכלים Read/Edit/Write', () => {
    for (const t of ['Read', 'Edit', 'Write']) {
      const r = call(t, { file_path: '.env' })
      expect(r.blocked).toBe(true)
      expect(r.reason).toContain('סודות')
    }
  })
})

describe('settings.json', () => {
  it('חוסם מתחת ל-.claude', () => {
    for (const p of ['.claude/settings.json', '.claude\\settings.json', '~/.claude/settings.json', 'C:\\Users\\u\\.CLAUDE\\Settings.JSON', 'c:/p/.claude/settings.json.']) pathBlocked(p)
  })
  it('מתיר אחרים', () => {
    for (const p of ['settings.json', 'src/settings.json', '.claude/settings.local.json']) pathAllowed(p)
  })
})

describe('מותר', () => {
  it('נתיבים רגילים', () => {
    for (const p of ['src/App.tsx', 'package.json', 'environment.ts', 'src/env.ts', 'venv/readme.md']) pathAllowed(p)
  })
})

describe('Grep', () => {
  it('path על קובץ מוגן', () => expect(call('Grep', { pattern: 'x', path: '.env' }).blocked).toBe(true))
  it('glob עם env או settings.json', () => {
    for (const glob of ['.env*', '**/.env', '*.env', '{.env,*.ts}', 'settings.json', '.claude/settings.json']) {
      expect(call('Grep', { pattern: 'x', glob }).blocked, glob).toBe(true)
    }
  })
  it('בלי path מותר', () => {
    expect(call('Grep', { pattern: 'x' }).blocked).toBe(false)
    expect(call('Grep', { pattern: 'x', path: 'src', glob: '*.ts' }).blocked).toBe(false)
  })
})

describe('PowerShell', () => {
  it('חוסם קריאה', () => {
    for (const command of ['Get-Content .env', 'type .claude\\settings.json', 'gc "C:\\p\\.env.local"', 'cat .env | sort']) {
      expect(call('PowerShell', { command }).blocked, command).toBe(true)
    }
  })
  it('מתיר פקודות רגילות', () => {
    for (const command of ['npm run check', 'Get-Content src\\App.tsx']) expect(call('PowerShell', { command }).blocked, command).toBe(false)
  })
})

describe('קלט פגום וכלים אחרים', () => {
  it('Read בלי file_path נחסם', () => {
    expect(call('Read', {}).blocked).toBe(true)
    expect(call('Edit', undefined).blocked).toBe(true)
  })
  it('כלי אחר מותר', () => expect(call('Glob', { pattern: '**/.env' }).blocked).toBe(false))
  it('קלט לא אובייקט נחסם', () => expect(checkToolCall(null).blocked).toBe(true))
})

describe('E2E', () => {
  it('Read על .env מחזיר deny JSON ו-exit 0', () => {
    const r = runHook(JSON.stringify({ tool_name: 'Read', tool_input: { file_path: '.env' } }))
    expect(r.status).toBe(0)
    const out = JSON.parse(r.stdout)
    expect(out.hookSpecificOutput.hookEventName).toBe('PreToolUse')
    expect(out.hookSpecificOutput.permissionDecision).toBe('deny')
    expect(out.hookSpecificOutput.permissionDecisionReason).toMatch(/[א-ת]/)
  })
  it('Write על .claude/settings.json נחסם', () => {
    const r = runHook(JSON.stringify({ tool_name: 'Write', tool_input: { file_path: '.claude/settings.json' } }))
    expect(r.status).toBe(0)
    expect(JSON.parse(r.stdout).hookSpecificOutput.permissionDecision).toBe('deny')
  })
  it('נתיב אחר: אין פלט ו-exit 0', () => {
    const r = runHook(JSON.stringify({ tool_name: 'Read', tool_input: { file_path: 'src/App.tsx' } }))
    expect(r.status).toBe(0)
    expect(r.stdout).toBe('')
  })
  it('stdin פגום: deny ו-exit 0', () => {
    const r = runHook('not json')
    expect(r.status).toBe(0)
    expect(JSON.parse(r.stdout).hookSpecificOutput.permissionDecision).toBe('deny')
  })
})
