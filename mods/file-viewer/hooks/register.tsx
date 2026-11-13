import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import { baseName, flatten, formatKb, loadListing } from './tree'

const PANE = 'file-viewer'
const root = atom({ plugin: 'file-viewer', key: 'root' } as const, null)
const open = atom({ plugin: 'file-viewer', key: 'open' } as const, [])
const listings = atom({ plugin: 'file-viewer', key: 'listings' } as const, {})

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'file-viewer',
      description: 'Show the project file tree in a pane',
    })

    return next(e)
  })

  on('command.run', { command: 'file-viewer' }, async $ => {
    try {
      const dir = await $.session.root()
      const listing = await loadListing(path => $.fs.list(path), dir)
      await update($, listings, () => ({ [dir]: listing }))
      await update($, open, () => [])
      await update($, root, () => dir)
      await $.ui.open({ id: PANE, title: baseName(dir) })

      return { text: 'File viewer opened.' }
    } catch (err) {
      return { text: `Could not open the file viewer: ${String(err).slice(0, 80)}` }
    }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const dir = await read($, root)

    if (dir === null) return <Text dimColor>Run /file-viewer to load the tree.</Text>

    const rows = flatten(dir, await read($, open), await read($, listings))

    const toggle = async (path: string, wasOpen: boolean) => {
      if (wasOpen) {
        await update($, open, list => list.filter(one => one !== path))

        return
      }
      const listing = await loadListing(p => $.fs.list(p), path)
      await update($, listings, all => ({ ...all, [path]: listing }))
      await update($, open, list => [...list, path])
    }

    return (
      <Box flexDirection="column">
        {rows.length === 0 && <Text dimColor>Empty folder.</Text>}
        {rows.map(row => {
          const indent = '  '.repeat(row.depth)

          if (row.kind === 'error') {
            return (
              <Text key={`${row.path}!`}>
                {indent}
                {row.message}
              </Text>
            )
          }
          if (row.kind === 'dir') {
            return (
              <Box key={row.path}>
                <Text>{indent}</Text>
                <Button
                  key={row.path}
                  label={`${row.isOpen ? '▾' : '▸'} ${row.name}`}
                  onPress={() => toggle(row.path, row.isOpen)}
                />
              </Box>
            )
          }

          return (
            <Box key={row.path}>
              <Text>
                {indent}  {row.name}
              </Text>
              {row.kind === 'file' && <Text dimColor>  {formatKb(row.size)}</Text>}
            </Box>
          )
        })}
      </Box>
    )
  })
}
