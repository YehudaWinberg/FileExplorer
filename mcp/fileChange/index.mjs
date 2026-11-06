// נקודת כניסה: שרת MCP ב-stdio. ה-stdout שמור לפרוטוקול; לוגים ל-stderr.
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createServer } from './createServer.mjs'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const root = path.resolve(projectRoot, process.env.FE_ROOT || 'src')

await createServer(root).connect(new StdioServerTransport())
console.error(`fileChange MCP server running, root: ${root}`)
