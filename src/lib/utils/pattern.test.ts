import { describe, expect, it } from 'vitest'
import type { FileSystemEntry } from '../models/entry'
import { compilePattern, matchesPattern, scoreMatch } from './pattern'

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

describe('scoreMatch', () => {
  const score = (pattern: string, entry: FileSystemEntry, depth = 1) =>
    scoreMatch(compilePattern(pattern), entry, depth)

  it('returns null when there is no match', () => {
    expect(score('report', file('photo.jpg'))).toBeNull()
    expect(score('*.pdf', folder('docs.pdf'))).toBeNull()
  })

  it('gives an identical name a 100% base, so a direct item scores 95', () => {
    expect(score('אבא', file('אבא'))).toBe(95)
    expect(score('אבא', folder('אבא'))).toBe(95)
  })

  it('scores a partial cover by its share of the name: א*א vs אבא is about 67% before depth', () => {
    expect(score('א*א', file('אבא'), 1)).toBe(62) // round(66.67 - 5)
    expect(score('re*ort', file('report'), 1)).toBe(Math.round((5 / 6) * 100 - 5)) // 78
  })

  it('uses a 100% base for patterns without fixed chars (*.pdf)', () => {
    expect(score('*.pdf', file('anything.pdf'))).toBe(95)
  })

  it('counts ? as a fixed char', () => {
    expect(compilePattern('a?c').fixedChars).toBe(3)
    expect(score('a?c', file('abc'))).toBe(95)
    expect(score('a?c', file('abcdef'))).toBe(Math.round((3 / 6) * 100 - 5))
  })

  it('does not count the extension when the pattern has none: report vs report.pdf', () => {
    expect(score('report', file('report.pdf'))).toBe(95)
    expect(score('report', file('tempReport.pdf'))).toBe(Math.round((6 / 10) * 100 - 5))
  })

  it('compares against the whole name when the pattern itself spans the extension', () => {
    expect(score('report.pdf', file('report.pdf'))).toBe(95)
    expect(score('report.pdf', file('tempReport.pdf'))).toBe(Math.round((10 / 14) * 100 - 5))
  })

  it('subtracts 5 per depth level with a floor at 0, and never reaches 100', () => {
    expect(score('abc', file('abc'), 1)).toBe(95)
    expect(score('abc', file('abc'), 3)).toBe(85)
    expect(score('abc', file('abc'), 19)).toBe(5)
    expect(score('abc', file('abc'), 20)).toBe(0)
    expect(score('abc', file('abc'), 50)).toBe(0)
    expect(score('abc', file('abc'), 0)).toBe(95)
  })

  it('gives the shallower result of the same name match a higher score', () => {
    expect(score('re*ort', file('report'), 1)!).toBeGreaterThan(score('re*ort', file('report'), 2)!)
  })

  it('always returns an integer', () => {
    for (let depth = 1; depth < 8; depth++) {
      expect(Number.isInteger(score('א*א', file('אבגדא'), depth))).toBe(true)
    }
  })
})
