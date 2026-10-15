import type { ReactNode } from 'react'
import type { SpecialFolderKey } from '../lib/models/entry'
import { DesktopIcon, DocumentsIcon, DownloadsIcon, PicturesIcon } from './icons'

export const SPECIAL_FOLDERS: Array<{ key: SpecialFolderKey; label: string; icon: ReactNode }> = [
  { key: 'desktop', label: 'שולחן העבודה', icon: <DesktopIcon /> },
  { key: 'documents', label: 'מסמכים', icon: <DocumentsIcon /> },
  { key: 'downloads', label: 'הורדות', icon: <DownloadsIcon /> },
  { key: 'pictures', label: 'תמונות', icon: <PicturesIcon /> },
]
