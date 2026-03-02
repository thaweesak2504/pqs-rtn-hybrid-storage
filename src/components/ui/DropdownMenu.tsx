import { ChevronRight } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface DropdownMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  separator?: boolean;
  subItems?: DropdownMenuItem[];
}

interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownMenuItem[];
  align?: 'left' | 'right';
  className?: string;
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({ trigger, items, align = 'right', className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [openSubmenu, setOpenSubmenu] = useState<number | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Global click listener to close menu
    if (!isOpen) return;

    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Don't close if clicking inside menu content (portal)
      if (target.closest('.dropdown-portal-content')) return;
      // Don't close if clicking trigger (toggle handles usage of stopping propagation, but just in case)
      if (triggerRef.current && triggerRef.current.contains(target)) return;

      setIsOpen(false);
    };

    // Use mousedown to catch clicks before they trigger other things
    document.addEventListener('mousedown', handleGlobalClick);

    // Optional: Close on window resize/scroll to prevent floating menu in wrong place
    const handleResize = () => setIsOpen(false);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      document.removeEventListener('mousedown', handleGlobalClick);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [isOpen]);

  const toggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (isOpen) {
      setIsOpen(false);
      return;
    }

    // Calculate position immediately before opening
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const menuWidth = 220; // Approx width

      // Default to aligning right edge of menu with right edge of trigger
      let x = align === 'right' ? rect.right - menuWidth : rect.left;
      let y = rect.bottom + 4; // Default Down

      // Calculate estimated height (Precise for text-xs)
      const btnHeight = 30; // ~28px + buffer
      const sepHeight = 9;  // 1px + 8px margin
      const padding = 10;   // Container py-1

      const estimatedHeight = items.reduce((acc, item) => {
        return acc + (item.separator ? sepHeight : btnHeight);
      }, padding);

      // Horizontal Boundary checks
      if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 8;
      if (x < 8) x = 8;

      // Vertical Boundary check (Flip Up if bottom overflows)
      if (y + estimatedHeight > window.innerHeight) {
        // Check if there is enough space on top
        const spaceTop = rect.top;
        const spaceBottom = window.innerHeight - rect.bottom;

        if (spaceTop > spaceBottom && spaceTop > estimatedHeight) {
          y = rect.top - estimatedHeight - 4;
        }
      }

      setPosition({ x, y });
      setIsOpen(true);
    }
  };

  return (
    <>
      <div
        className={`relative inline-block text-left ${className}`}
        ref={triggerRef}
        onClick={toggleOpen}
      >
        <div className="cursor-pointer">
          {trigger}
        </div>
      </div>

      {isOpen && createPortal(
        <div
          className="dropdown-portal-content fixed z-[9999] min-w-[200px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100"
          style={{ top: position.y, left: position.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Menu Items */}
          <div className="py-1">
            {items.map((item, index) => {
              if (item.separator) {
                return <div key={index} className="h-px bg-slate-100 dark:bg-slate-700 my-1" />;
              }

              return (
                <div key={index} className="relative"
                  onMouseEnter={() => { if (item.subItems && item.subItems.length > 0) setOpenSubmenu(index); }}
                  onMouseLeave={() => setOpenSubmenu(null)}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!item.disabled && item.onClick) {
                        item.onClick();
                        setIsOpen(false);
                      }
                    }}
                    disabled={item.disabled}
                    className={`
                      group flex w-full items-center px-3 py-1.5 text-xs text-left transition-colors
                      ${item.disabled
                        ? 'text-slate-400 cursor-not-allowed opacity-50'
                        : item.danger
                          ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                      }
                    `}
                  >
                    {item.icon && (
                      <span className={`mr-2 h-3.5 w-3.5 flex items-center justify-center
                        ${item.disabled
                          ? 'text-slate-300 dark:text-slate-600'
                          : item.danger
                            ? 'text-red-500'
                            : 'text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white'
                        }
                      `}>
                        {React.isValidElement(item.icon)
                          ? React.cloneElement(item.icon as React.ReactElement<{ className?: string }>, { className: 'w-3.5 h-3.5' })
                          : item.icon
                        }
                      </span>
                    )}
                    <span className="flex-1">{item.label}</span>
                    {item.subItems && item.subItems.length > 0 && (
                      <ChevronRight className="w-3 h-3 ml-1 opacity-50" />
                    )}
                  </button>

                  {/* Sub-menu */}
                  {item.subItems && item.subItems.length > 0 && openSubmenu === index && (
                    <div className="absolute left-full top-0 ml-1 min-w-[180px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1 z-10">
                      {item.subItems.map((subItem, subIndex) => {
                        if (subItem.separator) {
                          return <div key={subIndex} className="h-px bg-slate-100 dark:bg-slate-700 my-1" />;
                        }
                        return (
                          <button
                            key={subIndex}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!subItem.disabled && subItem.onClick) {
                                subItem.onClick();
                                setIsOpen(false);
                                setOpenSubmenu(null);
                              }
                            }}
                            disabled={subItem.disabled}
                            className={`
                              group flex w-full items-center px-3 py-1.5 text-xs text-left transition-colors
                              ${subItem.disabled
                                ? 'text-slate-400 cursor-not-allowed opacity-50'
                                : subItem.danger
                                  ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                              }
                            `}
                          >
                            {subItem.icon && (
                              <span className={`mr-2 h-3.5 w-3.5 flex items-center justify-center
                                ${subItem.disabled
                                  ? 'text-slate-300 dark:text-slate-600'
                                  : subItem.danger
                                    ? 'text-red-500'
                                    : 'text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white'
                                }
                              `}>
                                {React.isValidElement(subItem.icon)
                                  ? React.cloneElement(subItem.icon as React.ReactElement<{ className?: string }>, { className: 'w-3.5 h-3.5' })
                                  : subItem.icon
                                }
                              </span>
                            )}
                            {subItem.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default DropdownMenu;
