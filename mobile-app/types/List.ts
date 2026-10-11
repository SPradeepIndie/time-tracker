/**
 * List.ts
 *
 * Types and constraints for Checklists and Sticky Notes.
 */

export const MAX_LISTS = 5;
export const MAX_ITEMS_PER_LIST = 30;
export const MAX_STICKY_NOTES = 10;
export const MAX_NOTE_CHARACTERS = 255;

export interface StickyColorOption {
  id: string;
  name: string;
  bgLight: string;
  bgDark: string;
  borderLight: string;
  borderDark: string;
  textLight: string;
  textDark: string;
}

export const STICKY_COLORS: StickyColorOption[] = [
  {
    id: 'yellow',
    name: 'Warm Yellow',
    bgLight: '#FEF9C3',
    bgDark: '#422006',
    borderLight: '#FDE047',
    borderDark: '#713F12',
    textLight: '#713F12',
    textDark: '#FEF08A',
  },
  {
    id: 'green',
    name: 'Mint Green',
    bgLight: '#DCFCE7',
    bgDark: '#052E16',
    borderLight: '#86EFAC',
    borderDark: '#14532D',
    textLight: '#14532D',
    textDark: '#BBF7D0',
  },
  {
    id: 'blue',
    name: 'Sky Blue',
    bgLight: '#E0F2FE',
    bgDark: '#082F49',
    borderLight: '#7DD3FC',
    borderDark: '#075985',
    textLight: '#075985',
    textDark: '#BAE6FD',
  },
  {
    id: 'pink',
    name: 'Soft Rose',
    bgLight: '#FCE7F3',
    bgDark: '#500724',
    borderLight: '#F472B6',
    borderDark: '#831843',
    textLight: '#831843',
    textDark: '#FBCFE8',
  },
  {
    id: 'purple',
    name: 'Lavender',
    bgLight: '#F3E8FF',
    bgDark: '#3B0764',
    borderLight: '#C084FC',
    borderDark: '#581C87',
    textLight: '#581C87',
    textDark: '#E9D5FF',
  },
  {
    id: 'orange',
    name: 'Peach',
    bgLight: '#FFEDD5',
    bgDark: '#431407',
    borderLight: '#FDBA74',
    borderDark: '#7C2D12',
    textLight: '#7C2D12',
    textDark: '#FED7AA',
  },
];

export interface ChecklistItem {
  id: string;
  listId: string;
  text: string;
  isCompleted: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface Checklist {
  id: string;
  title: string;
  items: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
}

export interface StickyNote {
  id: string;
  content: string; // strictly <= 255 characters
  color: string;   // color id from STICKY_COLORS, e.g., 'yellow'
  createdAt: string;
  updatedAt: string;
}
