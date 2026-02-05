/**
 * Context Menu Types
 */

export interface ContextMenuItem {
  id: string;
  label: string;
  shortcut?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  action: () => void;
}

export interface ContextMenuDivider {
  type: 'divider';
}

export type ContextMenuEntry = ContextMenuItem | ContextMenuDivider;

export interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuEntry[];
  onClose: () => void;
}

export function isDivider(entry: ContextMenuEntry): entry is ContextMenuDivider {
  return 'type' in entry && entry.type === 'divider';
}
