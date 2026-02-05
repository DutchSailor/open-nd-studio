/**
 * Context Menu Component
 * A reusable right-click context menu with keyboard navigation
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { ContextMenuProps, ContextMenuItem } from './types';
import { isDivider } from './types';

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // Get only actionable items for keyboard navigation
  const actionableItems = items.filter((item): item is ContextMenuItem => !isDivider(item));

  // Adjust position to keep menu in viewport
  useEffect(() => {
    if (!menuRef.current) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = x;
    let adjustedY = y;

    // Adjust horizontal position
    if (x + rect.width > viewportWidth - 8) {
      adjustedX = viewportWidth - rect.width - 8;
    }
    if (adjustedX < 8) {
      adjustedX = 8;
    }

    // Adjust vertical position
    if (y + rect.height > viewportHeight - 8) {
      adjustedY = viewportHeight - rect.height - 8;
    }
    if (adjustedY < 8) {
      adjustedY = 8;
    }

    setPosition({ x: adjustedX, y: adjustedY });
  }, [x, y]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Use setTimeout to avoid closing immediately on the same click that opened the menu
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = prev + 1;
          return next >= actionableItems.length ? 0 : next;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = prev - 1;
          return next < 0 ? actionableItems.length - 1 : next;
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < actionableItems.length) {
          const item = actionableItems[focusedIndex];
          if (!item.disabled) {
            onClose();
            item.action();
          }
        }
        break;
    }
  }, [actionableItems, focusedIndex, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Handle item click
  const handleItemClick = (item: ContextMenuItem) => {
    if (item.disabled) return;
    onClose();
    item.action();
  };

  // Track which item in the full list corresponds to focused actionable item
  const getFocusedId = () => {
    if (focusedIndex < 0 || focusedIndex >= actionableItems.length) return null;
    return actionableItems[focusedIndex].id;
  };

  const focusedId = getFocusedId();

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[180px] py-1 bg-cad-surface border border-cad-border rounded shadow-lg"
      style={{ left: position.x, top: position.y }}
      role="menu"
    >
      {items.map((entry, index) => {
        if (isDivider(entry)) {
          return (
            <div
              key={`divider-${index}`}
              className="my-1 border-t border-cad-border"
              role="separator"
            />
          );
        }

        const item = entry;
        const isFocused = item.id === focusedId;
        const isDisabled = item.disabled;

        return (
          <div
            key={item.id}
            className={`
              flex items-center justify-between px-3 py-1.5 text-xs cursor-default
              ${isDisabled ? 'text-cad-text-muted opacity-50' : 'text-cad-text'}
              ${isFocused && !isDisabled ? 'bg-cad-hover' : ''}
              ${!isDisabled ? 'hover:bg-cad-hover' : ''}
            `}
            onClick={() => handleItemClick(item)}
            onMouseEnter={() => {
              if (!isDisabled) {
                const actionableIndex = actionableItems.findIndex(ai => ai.id === item.id);
                setFocusedIndex(actionableIndex);
              }
            }}
            role="menuitem"
            aria-disabled={isDisabled}
          >
            <div className="flex items-center gap-2">
              {item.icon && <span className="w-4 h-4">{item.icon}</span>}
              <span>{item.label}</span>
            </div>
            {item.shortcut && (
              <span className="ml-4 text-cad-text-secondary text-[10px]">
                {item.shortcut}
              </span>
            )}
          </div>
        );
      })}
    </div>,
    document.body
  );
}
