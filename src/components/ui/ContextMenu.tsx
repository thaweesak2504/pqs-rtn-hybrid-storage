import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  shortcut?: string;
  className?: string;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
}

interface ContextMenuProps {
  children: React.ReactNode;
  items: ContextMenuItem[];
  className?: string;
  disabled?: boolean;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ children, items, className = '', disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      if (isOpen) setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('scroll', handleScroll, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  const handleContextMenu = (e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();

    // Calculate position
    let x = e.clientX;
    let y = e.clientY;

    // Adjust if close to edge (simple adjustment, can be improved)
    const menuWidth = 200;
    const menuHeight = items.length * 36 + 20; // Approx height

    if (x + menuWidth > window.innerWidth) {
      x -= menuWidth;
    }
    if (y + menuHeight > window.innerHeight) {
      y -= menuHeight;
    }

    setPosition({ x, y });
    setIsOpen(true);
  };

  return (
    <div onContextMenu={handleContextMenu} className={className}>
      {children}
      {isOpen && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[9999] min-w-[180px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100"
          style={{ top: position.y, left: position.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item, index) => {
            if (item.separator) {
              return <div key={index} className="h-px bg-slate-100 dark:bg-slate-700 my-1" />;
            }

            return (
              <button
                key={index}
                onClick={() => {
                  if (!item.disabled) {
                    item.onClick();
                    setIsOpen(false);
                  }
                }}
                disabled={item.disabled}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors
                  ${item.disabled
                    ? 'opacity-50 cursor-not-allowed text-slate-400'
                    : item.danger
                      ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                  }
                  ${item.className || ''}
                `}
              >
                {item.icon && <span className="w-4 h-4 shrink-0 flex items-center justify-center">{item.icon}</span>}
                <span className="flex-1 truncate">{item.label}</span>
                {item.shortcut && <span className="text-xs text-slate-400 ml-2 font-mono">{item.shortcut}</span>}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
};

export default ContextMenu;
