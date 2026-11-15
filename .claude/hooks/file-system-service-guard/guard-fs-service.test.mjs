import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { checkToolCall, findFsApi, isOutsideLib } from './guard-fs-service.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const script = join(here, 'fs-service-guard.mjs')
const settingsPath = join(here, '..', '..', 'settings.json')

const write = (file_path, content) => ({ tool_name: 'Write', tool_input: { file_path, content } })

function runHook(input) {
  const r = spawnSync(process.execPath, [script], { input, encoding: 'utf8', timeout: 10000 })
  expect(r.error).toBeUndefined()
  return r
}

describe('זיהוי נתיב', () => {
  it('כל קובץ תחת src מחוץ ל-src/lib אסור', () => {
    expect(isOutsideLib('c:\\FileExplorer\\src\\components\\Toolbar.tsx')).toBe(true)
    expect(isOutsideLib('src/components/deep/X.tsx')).toBe(true)
    expect(isOutsideLib('src/state/ExplorerContext.tsx')).toBe(true)
    expect(isOutsideLib('src/main.tsx')).toBe(true)
    expect(isOutsideLib('c:\\FileExplorer\\FileExplorer\\src\\App.tsx')).toBe(true)
    expect(isOutsideLib('c:/src/proj/src/state/X.ts')).toBe(true)
  })
  it('src/lib וקבצים מחוץ ל-src מותרים', () => {
    expect(isOutsideLib('src/lib/BrowserFileSystemAdapter.ts')).toBe(false)
    expect(isOutsideLib('c:\\FileExplorer\\FileExplorer\\src\\lib\\deep\\X.ts')).toBe(false)
    expect(isOutsideLib('c:/src/proj/src/lib/X.ts')).toBe(false)
    expect(isOutsideLib('scripts/open-fullscreen.mjs')).toBe(false)
    expect(isOutsideLib('.claude/hooks/components/X.mjs')).toBe(false)
    expect(isOutsideLib('mysrc/state/X.ts')).toBe(false)
    expect(isOutsideLib(undefined)).toBe(false)
  })
})

describe('זיהוי File System API', () => {
  it('מזהה קריאות וטיפוסים, מתעלם מהערות', () => {
    expect(findFsApi('await window.showDirectoryPicker()')).toEqual(['showDirectoryPicker'])
    expect(findFsApi('const h: FileSystemDirectoryHandle = x; h.getFileHandle("a")')).toEqual(['FileSystemDirectoryHandle', 'getFileHandle'])
    expect(findFsApi('// showDirectoryPicker\n/* getFileHandle */ const a = 1')).toEqual([])
    expect(findFsApi('const adapter: FileSystemAdapter = useAdapter()')).toEqual([])
  })
})

describe('checkToolCall', () => {
  it('Write ו-Edit מחוץ ל-lib עם API ישיר מדווחים (components, state, main)', () => {
    const w = checkToolCall(write('src/components/A.tsx', 'window.showDirectoryPicker()'))
    expect(w.violation).toBe(true)
    expect(w.reason).toContain('src/lib')
    const e = checkToolCall({ tool_name: 'Edit', tool_input: { file_path: 'src/components/A.tsx', new_string: 'x.getFileHandle(n)' } })
    expect(e.violation).toBe(true)
    expect(checkToolCall(write('src/state/S.tsx', 'window.showDirectoryPicker()')).violation).toBe(true)
    expect(checkToolCall(write('src/main.tsx', 'new FileSystemDirectoryHandle()')).violation).toBe(true)
    const m = { tool_name: 'MultiEdit', tool_input: { file_path: 'src/state/S.tsx', edits: [{ new_string: 'a' }, { new_string: 'h.createWritable()' }] } }
    expect(checkToolCall(m).violation).toBe(true)
  })
  it('קובץ נקי, קובץ ב-lib או מחוץ ל-src וכלי אחר אינם מדווחים', () => {
    expect(checkToolCall(write('src/state/S.tsx', 'adapter.pickFolder()')).violation).toBe(false)
    expect(checkToolCall(write('scripts/x.mjs', 'showDirectoryPicker()')).violation).toBe(false)
    expect(checkToolCall(write('src/components/A.tsx', 'const { adapter } = useExplorer()')).violation).toBe(false)
    expect(checkToolCall(write('src/lib/BrowserFileSystemAdapter.ts', 'window.showDirectoryPicker()')).violation).toBe(false)
    expect(checkToolCall({ tool_name: 'Read', tool_input: { file_path: 'src/components/A.tsx' } }).violation).toBe(false)
    expect(checkToolCall(null).violation).toBe(false)
  })
})

describe('האדפטר (תהליך אמיתי)', () => {
  it('הפרה מחזירה decision block ו-exit 0', () => {
    const r = runHook(JSON.stringify(write('src/components/A.tsx', 'showDirectoryPicker()')))
    expect(r.status).toBe(0)
    const out = JSON.parse(r.stdout)
    expect(out.decision).toBe('block')
    expect(out.reason).toContain('src/lib')
  })
  it('הפרה ב-state מחזירה decision block', () => {
    const r = runHook(JSON.stringify(write('src/state/S.tsx', 'showDirectoryPicker()')))
    expect(JSON.parse(r.stdout).decision).toBe('block')
  })
  it('כתיבה ב-lib: פלט ריק ו-exit 0', () => {
    const r = runHook(JSON.stringify(write('src/lib/A.ts', 'showDirectoryPicker()')))
    expect(r.status).toBe(0)
    expect(r.stdout).toBe('')
  })
  it('כתיבה תקינה: פלט ריק ו-exit 0', () => {
    const r = runHook(JSON.stringify(write('src/components/A.tsx', 'const a = 1')))
    expect(r.status).toBe(0)
    expect(r.stdout).toBe('')
  })
  it('קלט פגום מדווח לסוכן', () => {
    const r = runHook('not json')
    expect(r.status).toBe(0)
    expect(JSON.parse(r.stdout).decision).toBe('block')
  })
})

describe('רישום ב-settings.json', () => {
  it('PostToolUse על Edit ו-Write מצביע על הסקריפט', () => {
    const settings = JSON.parse(readFileSync(settingsPath, 'utf8'))
    const entry = settings.hooks.PostToolUse?.find((e) => e.hooks.some((h) => h.command.includes('file-system-service-guard/fs-service-guard.mjs')))
    expect(entry).toBeDefined()
    for (const tool of ['Edit', 'Write']) expect(new RegExp(`^(?:${entry.matcher})$`).test(tool), tool).toBe(true)
    expect(settings.hooks.PreToolUse.length).toBeGreaterThanOrEqual(2)
  })
})
