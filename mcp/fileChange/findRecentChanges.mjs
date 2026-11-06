// לוגיקה טהורה וקריאה בלבד: איתור קבצים ששונו לאחרונה בתוך שורש קבוע.
import { promises as fs } from 'node:fs'
import path from 'node:path'

export const MAX_RESULTS = 200
const SKIPPED_DIRS = new Set(['node_modules', '.git'])

export const TYPE_EXTENSIONS = {
  xml: ['.xml'],
  word: ['.doc', '.docx'],
  excel: ['.xls', '.xlsx'],
  image: ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg', '.ico', '.tif', '.tiff'],
}

export class PathError extends Error {}

function isInside(root, target) {
  const rel = path.relative(root, target)
  return rel === '' || (rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel))
}

async function realRootOf(root) {
  try {
    return await fs.realpath(root)
  } catch {
    throw new PathError('שורש החיפוש אינו קיים או אינו נגיש')
  }
}

// פותר subfolder לנתיב מלא ומוודא (אחרי realpath) שהוא נשאר בתוך השורש.
export async function resolveSafeSubfolder(root, subfolder) {
  const realRoot = await realRootOf(root)
  if (subfolder === undefined || subfolder === '') return realRoot
  if (subfolder.includes('\0')) throw new PathError('נתיב לא חוקי')
  if (path.isAbsolute(subfolder)) throw new PathError('subfolder חייב להיות יחסי לשורש')
  const candidate = path.resolve(realRoot, subfolder)
  if (!isInside(realRoot, candidate)) throw new PathError('subfolder יוצא מהשורש')
  let real
  try {
    real = await fs.realpath(candidate)
  } catch (err) {
    if (err?.code === 'EACCES' || err?.code === 'EPERM') throw new PathError('אין הרשאה ל-subfolder')
    throw new PathError('subfolder אינו קיים')
  }
  if (!isInside(realRoot, real)) throw new PathError('subfolder יוצא מהשורש')
  const stat = await fs.stat(real)
  if (!stat.isDirectory()) throw new PathError('subfolder אינו תיקייה')
  return real
}

export async function findRecentChanges(root, { hours, type, minSizeMB, subfolder, now = Date.now() }) {
  const realRoot = await realRootOf(root)
  const start = await resolveSafeSubfolder(realRoot, subfolder)
  const since = now - hours * 3600 * 1000
  const exts = type ? TYPE_EXTENSIONS[type] : undefined
  const minBytes = minSizeMB === undefined ? 0 : minSizeMB * 1024 * 1024
  const matches = []
  let skipped = 0

  async function walk(dir) {
    let entries
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      skipped++
      return
    }
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRS.has(entry.name)) await walk(full)
        continue
      }
      if (!entry.isFile()) continue
      if (exts && !exts.includes(path.extname(entry.name).toLowerCase())) continue
      let stat
      try {
        stat = await fs.stat(full)
      } catch {
        skipped++
        continue
      }
      if (stat.mtimeMs < since || stat.mtimeMs > now) continue
      if (stat.size < minBytes) continue
      matches.push({
        path: path.relative(realRoot, full).split(path.sep).join('/'),
        modified: new Date(stat.mtimeMs).toISOString(),
        mtimeMs: stat.mtimeMs,
        sizeBytes: stat.size,
      })
    }
  }

  await walk(start)
  matches.sort((a, b) => b.mtimeMs - a.mtimeMs)
  const truncated = matches.length > MAX_RESULTS
  const files = matches.slice(0, MAX_RESULTS).map(({ mtimeMs: _mtimeMs, ...rest }) => rest)
  return { files, total: matches.length, truncated, skipped }
}
