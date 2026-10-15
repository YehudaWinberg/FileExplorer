import type { FileSystemEntry } from '../models/entry'

export type FileKind =
  | 'folder'
  | 'image'
  | 'pdf'
  | 'word'
  | 'excel'
  | 'powerpoint'
  | 'text'
  | 'code'
  | 'archive'
  | 'audio'
  | 'video'
  | 'executable'
  | 'generic'

interface TypeInfo {
  kind: FileKind
  label: string
}

const TYPES: Record<string, TypeInfo> = {}

function add(kind: FileKind, label: string, extensions: string[]): void {
  for (const ext of extensions) TYPES[ext] = { kind, label }
}

add('image', 'תמונת JPEG', ['jpg', 'jpeg'])
add('image', 'תמונת PNG', ['png'])
add('image', 'תמונת GIF', ['gif'])
add('image', 'תמונת WebP', ['webp'])
add('image', 'תמונת SVG', ['svg'])
add('image', 'תמונת Bitmap', ['bmp'])
add('image', 'תמונת ICO', ['ico'])
add('pdf', 'מסמך PDF', ['pdf'])
add('word', 'מסמך Word', ['doc', 'docx', 'rtf'])
add('excel', 'גיליון Excel', ['xls', 'xlsx', 'csv'])
add('powerpoint', 'מצגת PowerPoint', ['ppt', 'pptx'])
add('text', 'מסמך טקסט', ['txt', 'log'])
add('text', 'מסמך Markdown', ['md'])
add('code', 'קובץ JSON', ['json'])
add('code', 'קובץ קוד', ['js', 'jsx', 'ts', 'tsx', 'cs', 'py', 'java', 'html', 'css', 'xml', 'yml', 'yaml', 'sql', 'sh', 'ps1', 'cpp', 'c', 'h'])
add('archive', 'תיקייה דחוסה', ['zip', 'rar', '7z', 'tar', 'gz'])
add('audio', 'קובץ שמע', ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg'])
add('video', 'קובץ וידאו', ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'webm'])
add('executable', 'יישום', ['exe', 'msi', 'bat', 'cmd'])

export function getExtension(name: string): string {
  const index = name.lastIndexOf('.')
  return index >= 0 && index < name.length - 1 ? name.slice(index + 1).toLowerCase() : ''
}

export function getFileKind(entry: Pick<FileSystemEntry, 'kind' | 'extension'>): FileKind {
  if (entry.kind === 'folder') return 'folder'
  return TYPES[entry.extension]?.kind ?? 'generic'
}

export function getTypeLabel(entry: Pick<FileSystemEntry, 'kind' | 'extension'>): string {
  if (entry.kind === 'folder') return 'תיקיית קבצים'
  const known = TYPES[entry.extension]
  if (known) return known.label
  return entry.extension ? `קובץ ${entry.extension.toUpperCase()}` : 'קובץ'
}
