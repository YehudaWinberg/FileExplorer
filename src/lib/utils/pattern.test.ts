import { describe, expect, it } from 'vitest'
import type { FileSystemEntry } from '../models/entry'
import { compilePattern, matchesPattern } from './pattern'

const file = (name: string): FileSystemEntry => {
  const dot = name.lastIndexOf('.')
  return { id: name, name, kind: 'file', extension: dot > 0 ? name.slice(dot + 1).toLowerCase() : '' }
}
const folder = (name: string): FileSystemEntry => ({ id: name, name, kind: 'folder', extension: '' })
const matches = (pattern: string, entry: FileSystemEntry) => matchesPattern(compilePattern(pattern), entry)

describe('compilePattern', () => {
  it('returns nameRe, extension and fixedChars', () => {
    const compiled = compilePattern('re*ort')
    expect(compiled.nameRe).toBeInstanceOf(RegExp)
    expect(compiled.extension).toBeNull()
    expect(compiled.fixedChars).toBe(5)
  })

  it('escapes regex characters without throwing', () => {
    for (const raw of ['(', '[', 'a.b', 'a(b[c', '\\', '+', '$^']) {
      expect(() => compilePattern(raw)).not.toThrow()
    }
    expect(matches('a(b', file('xa(b.txt'))).toBe(true)
    expect(matches('a.b', file('axb'))).toBe(false)
  })

  it('detects an extension only in the *.xxx / name*.xxx form', () => {
    expect(compilePattern('*.PDF').extension).toBe('pdf')
    expect(compilePattern('report*.pdf').extension).toBe('pdf')
    expect(compilePattern('report.pdf').extension).toBeNull()
    expect(compilePattern('.pdf').extension).toBeNull()
    expect(compilePattern('*.p?f').extension).toBeNull()
  })

  it('treats ? as one whole character and collapses repeated stars', () => {
    expect(matches('a?b', file('a😀b'))).toBe(true)
    expect(matches('a?b', file('a😀😀b'))).toBe(false)
    expect(matches('a-b/c', file('a-b/c'))).toBe(true)
    expect(matches('**a**', file('xay'))).toBe(true)
    expect(compilePattern('a**b').nameRe.source).toBe('a.*b')
  })

  it('counts no fixed chars for *.pdf', () => {
    expect(compilePattern('*.pdf').fixedChars).toBe(0)
  })
})

describe('matchesPattern', () => {
  it('matches report.pdf as contains, name and extension together', () => {
    expect(matches('report.pdf', file('tempReport.pdf'))).toBe(true)
    expect(matches('report.pdf', file('report.txt'))).toBe(false)
  })

  it('supports * (FR1)', () => {
    expect(matches('re*ort', file('report'))).toBe(true)
    expect(matches('re*ort', file('resort'))).toBe(true)
  })

  it('supports * and ? wildcards (FR2)', () => {
    expect(matches('א*א', file('אבא'))).toBe(true)
    expect(matches('?', file('a'))).toBe(true)
    expect(matches('?', file(''))).toBe(false)
    // "?" הוא תו בודד: מעוגן, הוא לא תואם לאפס תווים ולא לשניים
    const exactlyOne = (name: string) => new RegExp('^' + compilePattern('?').nameRe.source + '$', 'is').test(name)
    expect(exactlyOne('')).toBe(false)
    expect(exactlyOne('ab')).toBe(false)
    expect(exactlyOne('a')).toBe(true)
  })

  it('ignores letter case (FR3)', () => {
    expect(matches('Report', file('report.txt'))).toBe(true)
    expect(matches('report', file('REPORT.txt'))).toBe(true)
  })

  it('limits to the extension and excludes folders (FR4, FR5)', () => {
    expect(matches('*.pdf', file('a.pdf'))).toBe(true)
    expect(matches('*.pdf', file('a.PDF'))).toBe(true)
    expect(matches('*.pdf', file('a.pdfx'))).toBe(false)
    expect(matches('*.pdf', file('a.txt'))).toBe(false)
    expect(matches('*.pdf', folder('docs.pdf'))).toBe(false)
    expect(matches('report*.pdf', file('tempReport_v2.pdf'))).toBe(true)
    expect(matches('report*.pdf', file('tempReport_v2.txt'))).toBe(false)
  })

  it('does not match the name part against the extension', () => {
    expect(matches('pdf*.pdf', file('a.pdf'))).toBe(false)
  })

  it('lets folders match a pattern without an extension', () => {
    expect(matches('report', folder('Reports'))).toBe(true)
    expect(matches('report', file('report.txt'))).toBe(true)
  })

  it('treats .pdf alone as a name pattern', () => {
    expect(matches('.pdf', file('a.pdf'))).toBe(true)
    expect(matches('.pdf', folder('x.pdf'))).toBe(true)
  })
})
