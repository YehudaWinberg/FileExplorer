import { describe, expect, it } from 'vitest'
import { countLines, isTxtFile } from './lineCount'
import { getExtension } from './fileTypes'

const blob = (text: string) => new Blob([text])

describe('countLines', () => {
  const examples: Array<[string, string, number]> = [
    ['empty file', '', 0],
    ['text without a line break', 'Hello', 1],
    ['two lines (LF)', 'Hello\nWorld', 2],
    ['empty line in the middle', 'Hello\n\nWorld', 3],
    ['trailing LF does not add a line', 'Hello\n', 1],
    ['only line breaks', '\n\n\n', 3],
    ['two lines (CRLF)', 'Hello\r\nWorld', 2],
    ['trailing CRLF does not add a line', 'Hello\r\n', 1],
    ['mixed LF and CRLF', 'a\r\nb\nc\r\n\r\nd', 5],
    ['single LF', '\n', 1],
    ['Hebrew text (multi-byte UTF-8)', 'שלום\nעולם', 2],
  ]

  it.each(examples)('%s', async (_, text, expected) => {
    expect(await countLines(blob(text))).toBe(expected)
  })

  it.each([1, 2, 3, 7])('gives the same result when reading in chunks of %i bytes', async (chunk) => {
    for (const [, text, expected] of examples) {
      expect(await countLines(blob(text), chunk)).toBe(expected)
    }
  })
})

describe('isTxtFile', () => {
  const file = (name: string) => ({ kind: 'file' as const, extension: getExtension(name) })

  it('matches .txt regardless of letter case', () => {
    expect(isTxtFile(file('notes.txt'))).toBe(true)
    expect(isTxtFile(file('NOTES.TXT'))).toBe(true)
    expect(isTxtFile(file('Notes.Txt'))).toBe(true)
  })

  it('rejects other types and folders', () => {
    expect(isTxtFile(file('notes.md'))).toBe(false)
    expect(isTxtFile(file('app.log'))).toBe(false)
    expect(isTxtFile(file('notes.txt.bak'))).toBe(false)
    expect(isTxtFile(file('txt'))).toBe(false)
    expect(isTxtFile({ kind: 'folder', extension: 'txt' })).toBe(false)
  })
})
