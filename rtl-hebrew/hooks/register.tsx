import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import { hasHebrew, needsRtl, parseInline, splitMarkdown } from './split'
import type { Span } from './split'

const spanProps = (style: Span['style']) =>
  style === 'code'
    ? { color: 'permission' }
    : style === 'bold'
      ? { bold: true }
      : style === 'italic'
        ? { italic: true }
        : { underline: true }

// A span without a style is a plain string; the rest are nested Texts.
const renderSpans = (Text: any, line: string, id: number) =>
  parseInline(line).map((sp, j) =>
    sp.style === undefined ? (
      sp.text
    ) : (
      <Text key={`s${id}-${j}`} {...spanProps(sp.style)}>
        {sp.text}
      </Text>
    ),
  )

const draft = atom({ plugin: 'rtl-hebrew', key: 'draft' } as const, '')

// Shared by AssistantMessage and UserMessage: both carry `props.text`.
// The tree is built inside the try; next(e) is called once, outside it.
async function draw($: any, e: any, next: any) {
  let tree: any = null

  try {
    const text = e.props.text
    if (typeof text === 'string' && needsRtl(text)) {
      const { Box, Text, Markdown } = $.ui.resolve(e)
      const marker =
        e.component === 'UserMessage'
          ? ' >'
          : e.props.isFirstOfReply
            ? ' ●'
            : null

      const body = (
        <Box
          flexDirection="column"
          width={marker === null ? '100%' : undefined}
          flexGrow={marker === null ? undefined : 1}
        >
          {splitMarkdown(text).map((s, i) =>
            s.kind === 'rtl' ? (
              <Text key={`t${i}`} dir="rtl" bold={s.bold}>
                {s.raw ? s.text : renderSpans(Text, s.text, i)}
              </Text>
            ) : (
              <Markdown key={`m${i}`} text={s.text} />
            ),
          )}
        </Box>
      )

      tree =
        marker === null ? (
          body
        ) : (
          <Box flexDirection="row" width="100%">
            {body}
            <Text key="marker">{marker}</Text>
          </Box>
        )
    }
  } catch {
    tree = null
  }

  return tree ?? next(e)
}

export const register: Register = on => {
  on('ui.render', { component: 'AssistantMessage' }, draw as any)
  on('ui.render', { component: 'UserMessage' }, draw as any)

  on('prompt.change', async ($, e, next) => {
    try {
      await update($, draft, () => e.text)
    } catch {
      // the mirror is optional; never block the prompt
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    let tree: any = null

    try {
      const text = (await read($, draft)) ?? ''
      if (!e.props.hasSurvey && hasHebrew(text)) {
        const { Box, Text } = $.ui.resolve(e)
        let lines = text.split(/\r?\n/)
        const max = e.props.maxRows
        if (typeof max === 'number' && max > 0 && lines.length > max) {
          lines = lines.slice(-max)
        }

        tree = (
          <Box flexDirection="column" width="100%">
            {lines.map((line, i) => (
              <Text key={`d${i}`} dir="rtl" dimColor>
                {line}
              </Text>
            ))}
          </Box>
        )
      }
    } catch {
      tree = null
    }

    return tree ?? next(e)
  })
}
