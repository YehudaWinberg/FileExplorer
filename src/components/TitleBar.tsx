import { FolderIcon } from './icons'

export function TitleBar() {
  return (
    <header className="titlebar">
      <FolderIcon size={16} />
      <span className="titlebar__text">סייר הקבצים</span>
    </header>
  )
}
