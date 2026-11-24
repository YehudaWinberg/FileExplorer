import { expect, test } from 'claude-code/testing'

import { hasHebrew, needsRtl, parseInline, splitMarkdown } from './split'

const kinds = (t: string) => splitMarkdown(t).map(x => x.kind)

test('hebrew line is rtl, english is md', () => {
  expect(kinds('hello\nהקובץ `a.ts` שונה\nbye')).toEqual(['md', 'rtl', 'md'])
})

test('english only needs no rtl', () => {
  expect(needsRtl('just english\n```\nשלום\n```')).toBe(false)
})

test('code block stays code, fence kept', () => {
  const s = splitMarkdown('שלום\n```ts\nconst a = 1\n```')
  expect(s.map(x => x.kind)).toEqual(['rtl', 'code'])
  expect(s[1].text).toBe('```ts\nconst a = 1\n```')
})

test('unclosed fence runs to the end and holds the hebrew line', () => {
  const s = splitMarkdown('שלום\n```\nשורה בעברית בקוד\nעוד')
  expect(s.map(x => x.kind)).toEqual(['rtl', 'code'])
  expect(s[1].text).toContain('שורה בעברית בקוד')
})

test('tilde fence', () => {
  const s = splitMarkdown('~~~\nשלום\n~~~\nשלום')
  expect(s.map(x => x.kind)).toEqual(['code', 'rtl'])
})

test('four-backtick fence is not closed by three', () => {
  const s = splitMarkdown('````\nשלום\n```\nעוד\n````\nשלום אחרי')
  expect(s.map(x => x.kind)).toEqual(['code', 'rtl'])
  expect(s[0].text).toContain('עוד')
})

test('closer with info string does not close', () => {
  const s = splitMarkdown('```\nשלום\n```ts\nשלום 2')
  expect(s.map(x => x.kind)).toEqual(['code'])
})

test('one-line ```code``` is not an opener', () => {
  expect(kinds('```code``` שלום')).toEqual(['rtl'])
})

test('CRLF input', () => {
  const s = splitMarkdown('hello\r\nשלום\r\n```\r\nx\r\n```\r\n')
  expect(s.slice(0, 3).map(x => x.kind)).toEqual(['md', 'rtl', 'code'])
  expect(s[1].text).toBe('שלום')
})

test('presentation-form hebrew is detected', () => {
  expect(hasHebrew('שׁ')).toBe(true)
})

test('block markers are rendered', () => {
  const t = (line: string) => splitMarkdown(line)[0] as any
  expect(t('## כותרת')).toMatchObject({ text: 'כותרת', bold: true })
  expect(t('- פריט').text).toBe('• פריט')
  expect(t('* פריט').text).toBe('• פריט')
  expect(t('1. פריט').text).toBe('1. פריט')
  expect(t('> ציטוט').text).toBe('│ ציטוט')
  expect(t('| א | ב |').text).toBe('| א | ב |')
})

test('parseInline: styles and literal leftovers', () => {
  expect(parseInline('א `b` **ג** *ד* [ה](http://u) ו')).toEqual([
    { text: 'א ' },
    { text: 'b', style: 'code' },
    { text: ' ' },
    { text: 'ג', style: 'bold' },
    { text: ' ' },
    { text: 'ד', style: 'italic' },
    { text: ' ' },
    { text: 'ה', style: 'link' },
    { text: ' ו' },
  ])
  expect(parseInline('א `פתוח **ב')).toEqual([{ text: 'א `פתוח **ב' }])
})
