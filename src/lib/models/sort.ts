export type SortKey = 'name' | 'modified' | 'elapsed' | 'type' | 'size'
export type SortDirection = 'asc' | 'desc'

export interface SortState {
  key: SortKey
  direction: SortDirection
}
