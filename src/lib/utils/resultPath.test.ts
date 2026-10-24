import { describe, expect, it } from 'vitest'
import type { FolderRef } from '../models/entry'
import { formatResultPath } from './resultPath'

function chain(...names: string[]): FolderRef {
  return names.reduce<FolderRef | null>((parent, name) => ({ id: `${parent?.id ?? ''}/${name}`, name, parent }), null)!
}

describe('formatResultPath', () => {
  it('shows up to 4 parts in full', () => {
    expect(formatResultPath(chain('Root')).text).toBe('Root')
    expect(formatResultPath(chain('A', 'B', 'C', 'D'))).toEqual({ text: 'A/B/C/D', full: 'A/B/C/D' })
  })

  it('shortens longer paths to root, ellipsis and the last two folders, keeping the full path', () => {
    expect(formatResultPath(chain('A', 'B', 'C', 'D', 'E'))).toEqual({ text: 'A/…/D/E', full: 'A/B/C/D/E' })
  })
})
