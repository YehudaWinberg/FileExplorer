import type { FsEntry } from 'claude-code'

import type { Listing } from '../types'

export const HIDDEN = ['.git', 'node_modules']

export type Row =
  | { kind: 'dir'; path: string; name: string; depth: number; isOpen: boolean }
  | { kind: 'file' | 'other'; path: string; name: string; depth: number; size: number }
  | { kind: 'error'; path: string; depth: number; message: string }

export const visibleSorted = (entries: FsEntry[]) =>
  entries
    .filter(entry => !HIDDEN.includes(entry.name))
    .map(({ name, kind, size }) => ({ name, kind, size }))
    .sort(
      (a, b) =>
        Number(b.kind === 'dir') - Number(a.kind === 'dir') || a.name.localeCompare(b.name),
    )

export const formatKb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`

const BACKSLASH = String.fromCharCode(92)

const isSeparator = (char: string | undefined) => char === '/' || char === BACKSLASH

const trimSeparators = (path: string) => {
  let end = path.length

  while (end > 1 && isSeparator(path[end - 1])) end -= 1

  return path.slice(0, end)
}

export const baseName = (path: string) =>
  trimSeparators(path).split(BACKSLASH).join('/').split('/').pop() || path

export const joinPath = (dir: string, name: string) =>
  `${trimSeparators(dir)}${dir.includes(BACKSLASH) ? BACKSLASH : '/'}${name}`

export const loadListing = async (
  list: (path: string) => Promise<FsEntry[]>,
  path: string,
): Promise<Listing> => {
  try {
    return { entries: visibleSorted(await list(path)) }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err)

    return { error: `Cannot read folder: ${reason.slice(0, 80)}` }
  }
}

export const flatten = (
  dir: string,
  open: string[],
  listings: Record<string, Listing>,
  depth = 0,
): Row[] => {
  const listing = listings[dir]

  if (listing === undefined) return []
  if ('error' in listing) return [{ kind: 'error', path: dir, depth, message: listing.error }]

  return listing.entries.flatMap((entry): Row[] => {
    const path = joinPath(dir, entry.name)

    if (entry.kind !== 'dir') {
      return [{ kind: entry.kind, path, name: entry.name, depth, size: entry.size }]
    }

    const isOpen = open.includes(path)
    const row: Row = { kind: 'dir', path, name: entry.name, depth, isOpen }

    return isOpen ? [row, ...flatten(path, open, listings, depth + 1)] : [row]
  })
}
