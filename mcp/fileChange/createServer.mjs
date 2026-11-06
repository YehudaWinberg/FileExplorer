// בניית שרת ה-MCP (בלי חיבור תעבורה, כדי שיהיה ניתן לבדיקה).
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { findRecentChanges } from './findRecentChanges.mjs'

const asText = (value) => JSON.stringify(value, null, 2)

async function runSearch(root, args) {
  try {
    const result = await findRecentChanges(root, args)
    return { content: [{ type: 'text', text: asText(result) }] }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'שגיאה לא צפויה'
    return { isError: true, content: [{ type: 'text', text: `שגיאה: ${message}` }] }
  }
}

export function createServer(root) {
  const server = new McpServer({ name: 'fileChange', version: '1.0.0' })

  server.registerTool(
    'recent_changes',
    {
      description: 'מחזיר קבצים ששונו בשעות האחרונות בתוך שורש קבוע (קריאה בלבד), מהחדש לישן.',
      inputSchema: {
        hours: z.number().int().min(1).max(720).describe('כמה שעות אחורה (1 עד 720)'),
        type: z.enum(['xml', 'word', 'excel', 'image']).optional().describe('סוג קובץ'),
        minSizeMB: z.number().positive().optional().describe('גודל מינימלי ב-MB'),
        subfolder: z.string().optional().describe('תת-תיקייה יחסית לשורש'),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    (args) => runSearch(root, args),
  )

  server.registerResource(
    'last-3-days',
    'changes://last-3-days',
    { description: 'הקבצים ששונו ב-3 הימים האחרונים בתוך השורש', mimeType: 'application/json' },
    async (uri) => {
      try {
        const result = await findRecentChanges(root, { hours: 72 })
        return { contents: [{ uri: uri.href, mimeType: 'application/json', text: asText(result) }] }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'שגיאה לא צפויה'
        return { contents: [{ uri: uri.href, mimeType: 'text/plain', text: `שגיאה: ${message}` }] }
      }
    },
  )

  server.registerPrompt(
    'recent-files',
    {
      description: 'חיפוש קבצים שהשתנו לאחרונה לפי ימים, סוג וגודל',
      argsSchema: {
        days: z.string().describe('מספר ימים'),
        type: z.string().optional().describe('xml / word / excel / image'),
        size: z.string().optional().describe('גודל מינימלי, למשל 2MB'),
      },
    },
    ({ days, type, size }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `חפש לי קבצים שהשתנו ב-${days} הימים האחרונים מסוג ${type ?? 'כל סוג'} בגודל ${size ?? 'כלשהו'}. המר ימים לשעות וגודל ל-MB וקרא ל-recent_changes.`,
          },
        },
      ],
    }),
  )

  return server
}
