export type SortKey = 'name' | 'modified' | 'type' | 'size'
export type SortDirection = 'asc' | 'desc'

export interface SortState {
  key: SortKey
  direction: SortDirection
}
