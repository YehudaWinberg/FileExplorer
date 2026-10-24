import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.(ts|tsx)$/.test(name) && !/\.test\./.test(name) ? [path] : []
  })
}

describe('read-only application (NFR6)', () => {
  it('uses no disk-writing File System Access APIs and no network calls', () => {
    const forbidden = /createWritable|removeEntry|\.move\(|requestPermission\(\{\s*mode:\s*'readwrite'|\bfetch\(|XMLHttpRequest|WebSocket|sendBeacon/
    const offenders = sourceFiles(join(process.cwd(), 'src')).filter((file) => {
      const text = readFileSync(file, 'utf8')
      return forbidden.test(text.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''))
    })
    expect(offenders).toEqual([])
  })
})
