export interface SearchResult {
  text: string
  element: HTMLElement
  index: number
  query: string
  textNode: Text
}

export interface SearchState {
  query: string
  results: SearchResult[]
  currentIndex: number
  isOpen: boolean
  total: number
}

export interface SearchContextType {
  state: SearchState
  search: (query: string) => void
  next: () => void
  previous: () => void
  clear: () => void
  toggle: () => void
  close: () => void
}
