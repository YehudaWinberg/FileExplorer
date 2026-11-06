import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createServer } from './createServer.mjs'

let base, client
const HOUR = 3600 * 1000

function put(root, name, { ageHours = 1, size = 10 } = {}) {
  const full = path.join(root, name)
  writeFileSync(full, Buffer.alloc(size))
  const t = new Date(Date.now() - ageHours * HOUR)
  utimesSync(full, t, t)
}

async function connect(root) {
  const [ct, st] = InMemoryTransport.createLinkedPair()
  await createServer(root).connect(st)
  const c = new Client({ name: 'test', version: '1.0.0' })
  await c.connect(ct)
  return c
}

beforeEach(async () => {
  base = mkdtempSync(path.join(tmpdir(), 'fe-mcp-srv-'))
  const root = path.join(base, 'root')
  mkdirSync(root)
  put(root, 'a.docx', { size: 3 * 1024 * 1024 })
  put(root, 'b.xml', { size: 10 })
  put(root, 'mid.txt', { ageHours: 48 })
  put(root, 'old.txt', { ageHours: 100 })
  client = await connect(root)
})
afterEach(async () => {
  await client.close()
  rmSync(base, { recursive: true, force: true })
})

describe('fileChange server', () => {
  it('exposes exactly one tool, resource and prompt', async () => {
    expect((await client.listTools()).tools.map((t) => t.name)).toEqual(['recent_changes'])
    expect((await client.listResources()).resources.map((r) => r.uri)).toEqual(['changes://last-3-days'])
    expect((await client.listPrompts()).prompts.map((p) => p.name)).toEqual(['recent-files'])
  })

  it('runs the tool', async () => {
    const res = await client.callTool({ name: 'recent_changes', arguments: { hours: 24, type: 'word' } })
    expect(res.isError).toBeFalsy()
    expect(JSON.parse(res.content[0].text).files.map((f) => f.path)).toEqual(['a.docx'])
  })

  it('passes minSizeMB through to the logic', async () => {
    const res = await client.callTool({ name: 'recent_changes', arguments: { hours: 24, minSizeMB: 2 } })
    expect(JSON.parse(res.content[0].text).files.map((f) => f.path)).toEqual(['a.docx'])
  })

  it.each([
    { hours: 'abc' },
    { hours: 0 },
    { hours: 9999 },
    { hours: 1.5 },
    { hours: 24, type: 'pdf' },
    { hours: 24, minSizeMB: -1 },
    { hours: 24, subfolder: 5 },
  ])('rejects invalid input %j before running the logic', async (args) => {
    let res, thrown
    try {
      res = await client.callTool({ name: 'recent_changes', arguments: args })
    } catch (err) {
      thrown = err
    }
    const message = thrown ? thrown.message : res.content?.[0]?.text
    if (!thrown) expect(res.isError).toBe(true)
    expect(message).toMatch(/validation|invalid/i)
  })

  it('returns an error result for escaping subfolder', async () => {
    const res = await client.callTool({ name: 'recent_changes', arguments: { hours: 24, subfolder: '../..' } })
    expect(res.isError).toBe(true)
  })

  it('returns an error result for a missing subfolder', async () => {
    const res = await client.callTool({ name: 'recent_changes', arguments: { hours: 24, subfolder: 'nope' } })
    expect(res.isError).toBe(true)
  })

  it('reads the resource', async () => {
    const res = await client.readResource({ uri: 'changes://last-3-days' })
    const paths = JSON.parse(res.contents[0].text).files.map((f) => f.path)
    expect(paths.sort()).toEqual(['a.docx', 'b.xml', 'mid.txt'])
  })

  it('returns text with the error message for a missing root', async () => {
    const c = await connect(path.join(base, 'missing'))
    const res = await c.readResource({ uri: 'changes://last-3-days' })
    expect(res.contents[0].text).toContain('שגיאה')
    await c.close()
  })

  it('renders the prompt with its arguments', async () => {
    const res = await client.getPrompt({ name: 'recent-files', arguments: { days: '3', type: 'word', size: '2MB' } })
    expect(res.messages[0].content.text).toContain('חפש לי קבצים שהשתנו ב-3 הימים האחרונים מסוג word בגודל 2MB')
  })

  it('defaults days to 3 in the prompt', async () => {
    const res = await client.getPrompt({ name: 'recent-files', arguments: {} })
    expect(res.messages[0].content.text).toContain('ב-3 הימים האחרונים')
  })
})
