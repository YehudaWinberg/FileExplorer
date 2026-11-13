export type Node = { name: string; kind: 'file' | 'dir' | 'other'; size: number }

export type Listing = { entries: Node[] } | { error: string }

declare module 'claude-code' {
  interface PluginState {
    'file-viewer': {
      root: string | null
      open: string[]
      listings: Record<string, Listing>
    }
  }
}
