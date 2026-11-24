import { expect, test } from 'claude-code/testing'

const msg = (component: 'AssistantMessage' | 'UserMessage', text: string) =>
  ({
    plugin: 'rtl-hebrew',
    component,
    requestId: 'r',
    surface: 'terminal',
    props:
      component === 'AssistantMessage'
        ? { text, isFirstOfReply: true }
        : { text, origin: { kind: 'composer' }, isExpanded: true },
  }) as any

const engine = (on: any) =>
  on('ui.render', ($: any, e: any) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })

test('assistant hebrew line gets dir=rtl', async ($, on) => {
  engine(on)
  const ui = await $.ui.mount(msg('AssistantMessage', 'הקובץ `a.ts` שונה'))
  const row = await ui.find({ type: 'Text', text: /שונה/ })
  expect(row?.props?.dir).toBe('rtl')
  await ui.unmount()
})

test('english goes to the engine', async ($, on) => {
  engine(on)
  const ui = await $.ui.mount(msg('AssistantMessage', 'plain english'))
  expect((await ui.find({ type: 'Text', text: /engine/ }))?.text).toBe('engine')
  await ui.unmount()
})

test('code block has no dir', async ($, on) => {
  engine(on)
  const ui = await $.ui.mount(msg('AssistantMessage', 'שלום\n```\nconst a = 1\n```'))
  const rtl = await ui.find({ type: 'Text', text: /שלום/ })
  expect(rtl?.props?.dir).toBe('rtl')
  const code = await ui.find({ type: 'Markdown', text: /const a/ })
  expect(code).toBeTruthy()
  expect(code?.props?.dir).toBeUndefined()
  await ui.unmount()
})

test('user prompt hebrew gets dir=rtl', async ($, on) => {
  engine(on)
  const ui = await $.ui.mount(msg('UserMessage', 'שלום עולם'))
  expect((await ui.find({ type: 'Text', text: /שלום/ }))?.props?.dir).toBe('rtl')
  await ui.unmount()
})

const band = {
  plugin: 'rtl-hebrew',
  component: 'AbovePrompt',
  requestId: 'b',
  surface: 'terminal',
  props: { hasSurvey: false, isCollapsed: false, isWorking: false, maxRows: 5 },
} as any

test('draft mirror shown with hebrew, absent without', async ($, on) => {
  engine(on)
  on('prompt.change', (_: any, e: any) => ({ text: e.text }))
  await $.prompt.change({ text: 'שלום', cursor: 4, origin: { kind: 'engine' } })
  let ui = await $.ui.mount(band)
  expect((await ui.find({ type: 'Text', text: /שלום/ }))?.props?.dir).toBe('rtl')
  await ui.unmount()

  await $.prompt.change({ text: 'hello', cursor: 5, origin: { kind: 'engine' } })
  ui = await $.ui.mount(band)
  expect(await ui.find({ type: 'Text', text: /שלום/ })).toBeFalsy()
  expect((await ui.find({ type: 'Text', text: /engine/ }))?.text).toBe('engine')
  await ui.unmount()
})

const change = ($: any, text: string) =>
  $.prompt.change({ text, cursor: text.length, origin: { kind: 'engine' } })

test('survey hides the mirror', async ($, on) => {
  engine(on)
  on('prompt.change', (_: any, e: any) => ({ text: e.text }))
  await change($, 'שלום')
  const ui = await $.ui.mount({ ...band, props: { ...band.props, hasSurvey: true } })
  expect(await ui.find({ type: 'Text', text: /שלום/ })).toBeFalsy()
  await ui.unmount()
})

test('draft emptied back to empty hides the mirror', async ($, on) => {
  engine(on)
  on('prompt.change', (_: any, e: any) => ({ text: e.text }))
  await change($, 'שלום')
  await change($, '')
  const ui = await $.ui.mount(band)
  expect(await ui.find({ type: 'Text', text: /שלום/ })).toBeFalsy()
  expect((await ui.find({ type: 'Text', text: /engine/ }))?.text).toBe('engine')
  await ui.unmount()
})

test('multi-line mixed draft: every line is rtl, last maxRows kept', async ($, on) => {
  engine(on)
  on('prompt.change', (_: any, e: any) => ({ text: e.text }))
  await change($, 'one\nשתיים\nthree\nארבע')
  let ui = await $.ui.mount(band)
  expect((await ui.find({ type: 'Text', text: /three/ }))?.props?.dir).toBe('rtl')
  expect((await ui.find({ type: 'Text', text: /one/ }))?.props?.dir).toBe('rtl')
  await ui.unmount()

  ui = await $.ui.mount({ ...band, props: { ...band.props, maxRows: 2 } })
  expect(await ui.find({ type: 'Text', text: /one/ })).toBeFalsy()
  expect(await ui.find({ type: 'Text', text: /ארבע/ })).toBeTruthy()
  await ui.unmount()
})

test('render failure falls back to the engine row', async ($, on) => {
  engine(on)
  const bad = msg('AssistantMessage', 'x')
  bad.props.text = undefined
  const ui = await $.ui.mount(bad)
  expect((await ui.find({ type: 'Text', text: /engine/ }))?.text).toBe('engine')
  await ui.unmount()
})

test('markers: bullet for the first block, > for a user prompt', async ($, on) => {
  engine(on)
  let ui = await $.ui.mount(msg('AssistantMessage', 'שלום'))
  expect(await ui.find({ type: 'Text', text: /●/ })).toBeTruthy()
  await ui.unmount()

  ui = await $.ui.mount(msg('UserMessage', 'שלום'))
  expect(await ui.find({ type: 'Text', text: /^ >$/ })).toBeTruthy()
  await ui.unmount()
})

test('marker sits after the body in the row, once', async ($, on) => {
  engine(on)
  const ui = await $.ui.mount(msg('AssistantMessage', 'שלום\nעוד שורה'))
  const row = (await ui.findAll({ type: 'Box' })).find(
    (b: any) => b.props?.flexDirection === 'row' && b.props?.width === '100%',
  ) as any
  expect(row).toBeTruthy()
  const kids = row.children as any[]
  expect(kids.length).toBe(2)
  expect(kids[0].props?.flexGrow).toBe(1)
  expect(kids[1].children[0]).toBe(' ●')
  expect((await ui.findAll({ type: 'Text', text: /●/ })).length).toBe(1)
  await ui.unmount()
})

test('inline spans: styled nested Texts inside one rtl Text', async ($, on) => {
  engine(on)
  const ui = await $.ui.mount(
    msg('AssistantMessage', 'הקובץ `a.ts` **חשוב** *נטוי* [קישור](http://x.y) ו-`פתוח'),
  )
  const line = (await ui.findAll({ type: 'Text' })).find(
    (t: any) => t.props?.dir === 'rtl',
  ) as any
  expect(line).toBeTruthy()
  const nested = (line.children as any[]).filter(c => c.type === 'Text')
  const by = (txt: string) => nested.find(n => n.children[0] === txt)
  expect(by('a.ts')?.props?.color).toBe('permission')
  expect(by('חשוב')?.props?.bold).toBe(true)
  expect(by('נטוי')?.props?.italic).toBe(true)
  expect(by('קישור')?.props?.underline).toBe(true)
  expect(line.text).not.toContain('`a.ts`')
  expect(line.text).not.toContain('http')
  expect(line.text).toContain('`פתוח') // unmatched marker stays literal
  await ui.unmount()
})

test('table rows stay raw', async ($, on) => {
  engine(on)
  const ui = await $.ui.mount(msg('AssistantMessage', '| `א` | **ב** |'))
  const line = (await ui.findAll({ type: 'Text' })).find(
    (t: any) => t.props?.dir === 'rtl',
  ) as any
  expect(line.text).toContain('`א`')
  await ui.unmount()
})

const boxes = async (ui: any) =>
  (await ui.findAll({ type: 'Box' })).map((b: any) => b.props ?? {})

test('tree shape: full-width wrapper, body grows beside the marker', async ($, on) => {
  engine(on)
  on('prompt.change', (_: any, e: any) => ({ text: e.text }))

  let ui = await $.ui.mount(msg('AssistantMessage', 'שלום'))
  let b = await boxes(ui)
  expect(b.some((p: any) => p.width === '100%')).toBe(true)
  expect(b.some((p: any) => p.flexGrow === 1)).toBe(true)
  await ui.unmount()

  const plain = msg('AssistantMessage', 'שלום')
  plain.props.isFirstOfReply = false
  ui = await $.ui.mount(plain)
  b = await boxes(ui)
  expect(b.some((p: any) => p.width === '100%')).toBe(true)
  await ui.unmount()

  await change($, 'שלום')
  ui = await $.ui.mount(band)
  b = await boxes(ui)
  expect(b.some((p: any) => p.width === '100%')).toBe(true)
  await ui.unmount()
})
