export const HIGHLIGHT_COLORS = [
  { id: 'yellow', bg: '#EAB308', label: 'Yellow' },
  { id: 'green', bg: '#22C55E', label: 'Green' },
  { id: 'blue', bg: '#3B82F6', label: 'Blue' },
  { id: 'pink', bg: '#EC4899', label: 'Pink' },
  { id: 'orange', bg: '#F97316', label: 'Orange' },
  { id: 'purple', bg: '#8B5CF6', label: 'Purple' },
  { id: 'red', bg: '#EF4444', label: 'Red' },
] as const

export type HighlightColorId = typeof HIGHLIGHT_COLORS[number]['id']
