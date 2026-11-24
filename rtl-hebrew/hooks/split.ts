export type Segment =
  | { kind: 'rtl'; text: string; bold?: boolean; raw?: boolean }
  | { kind: 'md'; text: string }
  | { kind: 'code'; text: string }

const HEBREW = /[֐-׿יִ-ﭏ]/

export const hasHebrew = (text: string): boolean => HEBREW.test(text)

const OPEN = /^ {0,3}(`{3,}|~{3,})(.*)$/
const CLOSE = /^ {0,3}(`{3,}|~{3,})[ \t]*$/

/** Opening fence marker, or null (a one-line ```code``` is not an opener). */
const opener = (line: string): string | null => {
  const m = OPEN.exec(line)
  if (!m) return null
  if (m[1][0] === '`' && m[2].includes('`')) return null
  return m[1]
}

const closes = (line: string, marker: string): boolean => {
  const m = CLOSE.exec(line)
  return !!m && m[1][0] === marker[0] && m[1].length >= marker.length
}

/** Hebrew line with its block marker rendered for a plain Text. */
const formatLine = (
  line: string,
): { text: string; bold?: boolean; raw?: boolean } => {
  if (/^\s*\|/.test(line)) return { text: line, raw: true } // table row: v1 limitation
  const h = /^ {0,3}#{1,6}\s+(.*)$/.exec(line)
  if (h) return { text: h[1], bold: true }
  const q = /^\s*>\s?(.*)$/.exec(line)
  if (q) return { text: `│ ${q[1]}` }
  const l = /^(\s*)[-*+]\s+(.*)$/.exec(line)
  if (l) return { text: `${l[1]}• ${l[2]}` }
  return { text: line }
}

export type Span = {
  text: string
  style?: 'code' | 'bold' | 'italic' | 'link'
}

// `code` | **bold** | *italic* | [text](url); anything unmatched stays literal.
const INLINE = /`([^`\n]+)`|\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|\[([^\]\n]+)\]\(([^)\s]+)\)/g

/** Parses inline markdown of one line into spans (the url of a link is dropped). */
export const parseInline = (line: string): Span[] => {
  const out: Span[] = []
  let last = 0
  for (const m of line.matchAll(INLINE)) {
    if (m.index > last) out.push({ text: line.slice(last, m.index) })
    if (m[1] !== undefined) out.push({ text: m[1], style: 'code' })
    else if (m[2] !== undefined) out.push({ text: m[2], style: 'bold' })
    else if (m[3] !== undefined) out.push({ text: m[3], style: 'italic' })
    else out.push({ text: m[4], style: 'link' })
    last = m.index + m[0].length
  }
  if (last < line.length) out.push({ text: line.slice(last) })
  return out
}

/**
 * Splits markdown into segments: fenced code (always LTR, an unclosed fence
 * runs to the end), Hebrew lines (one segment each) and runs of other lines.
 */
export const splitMarkdown = (text: string): Segment[] => {
  const out: Segment[] = []
  let md: string[] = []
  let code: string[] | null = null
  let marker = ''

  const flushMd = () => {
    if (md.length > 0) out.push({ kind: 'md', text: md.join('\n') })
    md = []
  }

  for (const line of text.split(/\r?\n/)) {
    if (code !== null) {
      code.push(line)
      if (closes(line, marker)) {
        out.push({ kind: 'code', text: code.join('\n') })
        code = null
      }
      continue
    }
    const open = opener(line)
    if (open !== null) {
      flushMd()
      code = [line]
      marker = open
    } else if (hasHebrew(line)) {
      flushMd()
      out.push({ kind: 'rtl', ...formatLine(line) })
    } else {
      md.push(line)
    }
  }

  if (code !== null) out.push({ kind: 'code', text: code.join('\n') })
  flushMd()

  return out
}

/** True when some line outside code fences holds Hebrew. */
export const needsRtl = (text: string): boolean =>
  splitMarkdown(text).some(s => s.kind === 'rtl')
