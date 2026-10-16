/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('./app.css', import.meta.url), 'utf8')

describe('app layout', () => {
  it('pins body to the flexible row and the status bar to the last row, even without a notice', () => {
    expect(css).toMatch(/\.app\s*>\s*\.body\s*\{\s*grid-row:\s*4;/)
    expect(css).toMatch(/\.app\s*>\s*\.statusbar\s*\{\s*grid-row:\s*5;/)
    expect(css).toMatch(/\.app\s*\{[^}]*grid-template-rows:\s*auto auto auto minmax\(0, 1fr\) auto;[^}]*height:\s*100%;/)
  })
})
