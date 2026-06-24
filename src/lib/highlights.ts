export const HIGHLIGHT_COLORS = [
  { id: 'yellow', bg: '#FDE68A', label: 'Yellow' },
  { id: 'green', bg: '#86EFAC', label: 'Green' },
  { id: 'blue', bg: '#93C5FD', label: 'Blue' },
  { id: 'pink', bg: '#F9A8D4', label: 'Pink' },
  { id: 'orange', bg: '#FDBA74', label: 'Orange' },
  { id: 'purple', bg: '#C4B5FD', label: 'Purple' },
  { id: 'red', bg: '#FCA5A5', label: 'Red' },
] as const

export type HighlightColorId = typeof HIGHLIGHT_COLORS[number]['id']
