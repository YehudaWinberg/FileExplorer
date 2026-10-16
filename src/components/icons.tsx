import type { ReactNode } from 'react'
import type { FileKind } from '../lib/utils/fileTypes'

interface IconProps {
  size?: number
  className?: string
}

function Stroke({ size = 16, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

/** בכיוון RTL "אחורה" מצביע ימינה. */
export const BackIcon = (p: IconProps) => (
  <Stroke {...p}><path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" /></Stroke>
)
export const ForwardIcon = (p: IconProps) => (
  <Stroke {...p}><path d="M13.5 8h-11M7 3.5 2.5 8 7 12.5" /></Stroke>
)
export const UpIcon = (p: IconProps) => (
  <Stroke {...p}><path d="M8 13.5v-11M3.5 7 8 2.5 12.5 7" /></Stroke>
)
export const RefreshIcon = (p: IconProps) => (
  <Stroke {...p}><path d="M13 8a5 5 0 1 1-1.5-3.5M13 2.5v3h-3" /></Stroke>
)
export const ChevronIcon = (p: IconProps) => (
  <Stroke {...p}><path d="M10 3.5 5.5 8l4.5 4.5" /></Stroke>
)
export const SortArrowIcon = (p: IconProps) => (
  <Stroke {...p}><path d="M4 9.5 8 5.5l4 4" /></Stroke>
)
export const FilterIcon = ({ active, ...p }: IconProps & { active?: boolean }) => (
  <Stroke {...p}>
    <path
      d="M2.5 3h11L9.5 8v4.5l-3 1.5V8z"
      fill={active ? 'currentColor' : 'none'}
    />
  </Stroke>
)
export const HomeIcon = (p: IconProps) => (
  <Stroke {...p}><path d="M2.5 7.5 8 2.5l5.5 5M4 6.5v7h8v-7M6.5 13.5v-4h3v4" /></Stroke>
)
export const StarIcon = (p: IconProps) => (
  <Stroke {...p}><path d="m8 2 1.8 3.8 4.2.5-3.1 2.9.8 4.1L8 11.2 4.3 13.3l.8-4.1L2 6.3l4.2-.5z" /></Stroke>
)
export const PcIcon = (p: IconProps) => (
  <Stroke {...p}><path d="M2.5 3h11v7h-11zM5.5 13.5h5M8 10v3.5" /></Stroke>
)
export const DesktopIcon = (p: IconProps) => (
  <Stroke {...p}><path d="M2.5 3h11v7.5h-11zM6 13.5h4M8 10.5v3" /></Stroke>
)
export const DocumentsIcon = (p: IconProps) => (
  <Stroke {...p}><path d="M4 2h5.5L12.5 5v9H4zM9.5 2v3h3M6 8h4.5M6 10.5h4.5" /></Stroke>
)
export const DownloadsIcon = (p: IconProps) => (
  <Stroke {...p}><path d="M8 2.5v8M4.5 7 8 10.5 11.5 7M3 13.5h10" /></Stroke>
)
export const PicturesIcon = (p: IconProps) => (
  <Stroke {...p}><path d="M2.5 3h11v10h-11zM2.5 11l3.5-3.5 3 3 2-2 2.5 2.5M10.5 6h.01" /></Stroke>
)
export const FolderPlusIcon = (p: IconProps) => (
  <Stroke {...p}><path d="M2 4.5h4l1.2 1.5H14v7H2zM8 8v3.5M6.25 9.75h3.5" /></Stroke>
)

/** אייקון תיקייה צבעוני בסגנון Windows 11. */
export function FolderIcon({ size = 18, className }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 6a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v1H2z" fill="#E0A020" />
      <path d="M2 9h20v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" fill="#FFCA4D" />
    </svg>
  )
}

/** אייקון כונן. */
export function DriveIcon({ size = 18, className }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="8" width="20" height="9" rx="2" fill="#9AA3AD" />
      <rect x="2" y="8" width="20" height="3" rx="1.5" fill="#C3CAD1" />
      <circle cx="18" cy="14" r="1.2" fill="#2E9E4F" />
    </svg>
  )
}

const KIND_STYLE: Record<Exclude<FileKind, 'folder'>, { color: string; mark: string }> = {
  image: { color: '#2A9D8F', mark: '' },
  pdf: { color: '#D33B30', mark: 'PDF' },
  word: { color: '#2B579A', mark: 'W' },
  excel: { color: '#217346', mark: 'X' },
  powerpoint: { color: '#D24726', mark: 'P' },
  text: { color: '#6B7280', mark: '' },
  code: { color: '#7C3AED', mark: '{}' },
  archive: { color: '#B7791F', mark: 'ZIP' },
  audio: { color: '#DB2777', mark: '♪' },
  video: { color: '#0F766E', mark: '▶' },
  executable: { color: '#374151', mark: 'EXE' },
  generic: { color: '#6B7280', mark: '' },
}

export function FileKindIcon({ kind, size = 18, className }: { kind: FileKind } & IconProps) {
  if (kind === 'folder') return <FolderIcon size={size} className={className} />
  const { color, mark } = KIND_STYLE[kind]
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 2h8l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"
        fill="#fff"
        stroke={color}
        strokeWidth="1.4"
      />
      <path d="M14 2v5h5" fill="none" stroke={color} strokeWidth="1.4" />
      {kind === 'image' && (
        <path d="M7 18l3.5-4 2.5 2.5 2-2 2 3.5z" fill={color} />
      )}
      {kind === 'text' && <path d="M7.5 11h9M7.5 14h9M7.5 17h6" stroke={color} strokeWidth="1.3" />}
      {mark && (
        <text
          x="11.5"
          y="18"
          textAnchor="middle"
          fontSize={mark.length > 2 ? 6 : 8}
          fontWeight="700"
          fill={color}
          fontFamily="Segoe UI, sans-serif"
        >
          {mark}
        </text>
      )}
    </svg>
  )
}
