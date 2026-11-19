import { describe, expect, it } from 'vitest'
import { buildPreviewHtml } from './htmlPreview'

describe('buildPreviewHtml', () => {
  it('adds charset and a network-blocking CSP', () => {
    const html = buildPreviewHtml('<h1>שלום</h1>')
    expect(html).toContain('<meta charset="utf-8">')
    expect(html).toContain("default-src 'none'")
    expect(html.endsWith('<h1>שלום</h1>')).toBe(true)
  })

  it('keeps the doctype first so the page does not fall into quirks mode', () => {
    const html = buildPreviewHtml('\uFEFF<!DOCTYPE html><p>x</p>')
    expect(html.startsWith('<!DOCTYPE html><meta charset')).toBe(true)
    expect(html.endsWith('<p>x</p>')).toBe(true)
  })

  it('removes meta refresh in any spelling so the page cannot navigate away', () => {
    const variants = [
      '<meta http-equiv="refresh" content="0;url=https://evil.example">',
      "<META HTTP-EQUIV='Refresh' content='0; url=https://evil.example'>",
      '<meta content="0;url=https://evil.example>x" http-equiv=refresh>',
      '<meta\n  http-equiv="&#114;efresh"\n  content="0;url=https://evil.example">',
    ]
    for (const meta of variants) {
      const html = buildPreviewHtml(`<!doctype html><head>${meta}</head><p>ok</p>`)
      expect(html).not.toMatch(/evil\.example/)
      expect(html).not.toMatch(/refresh/i)
      expect(html).toContain('<p>ok</p>')
    }
  })

  it('makes links open in a blocked new context via base target', () => {
    expect(buildPreviewHtml('<a href="https://x">x</a>')).toContain('<base href="about:blank" target="_blank">')
  })
})
