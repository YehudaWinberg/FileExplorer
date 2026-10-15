import type { FolderRef } from '../lib/models/entry'
import { useExplorer } from '../state/ExplorerContext'
import { ChevronIcon, FolderIcon } from './icons'

function TreeNode({ folder, level }: { folder: FolderRef; level: number }) {
  const { state, location, actions } = useExplorer()
  const expanded = !!state.expanded[folder.id]
  const children = state.children[folder.id]
  const loaded = children !== undefined
  const hasChildren = !loaded || children.length > 0
  const active = location.type === 'folder' && location.folder.id === folder.id
  const error = state.treeErrors[folder.id]

  return (
    <li role="none">
      <div
        role="treeitem"
        aria-expanded={hasChildren ? expanded : undefined}
        aria-selected={active}
        className={active ? 'node node--active' : 'node'}
        style={{ paddingInlineStart: 4 + level * 16 }}
        title={error}
      >
        <button
          type="button"
          className={hasChildren ? 'node__toggle' : 'node__toggle node__toggle--empty'}
          aria-label={expanded ? 'צמצום' : 'הרחבה'}
          tabIndex={-1}
          onClick={() => actions.toggleNode(folder)}
        >
          <ChevronIcon size={12} className={expanded ? 'chev chev--open' : 'chev'} />
        </button>
        <button type="button" className="node__label" onClick={() => actions.openFolder(folder)}>
          <FolderIcon size={16} />
          <span className="ellipsis">{folder.name}</span>
        </button>
      </div>
      {expanded && children && children.length > 0 && (
        <ul role="group" className="tree">
          {children.map((child) => (
            <TreeNode key={child.id} folder={child} level={level + 1} />
          ))}
        </ul>
      )}
    </li>
  )
}

export function FolderTree({ roots }: { roots: FolderRef[] }) {
  return (
    <ul role="tree" aria-label="עץ תיקיות" className="tree">
      {roots.map((root) => (
        <TreeNode key={root.id} folder={root} level={0} />
      ))}
    </ul>
  )
}
