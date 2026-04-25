import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end';
  className?: string; // Applied to the wrapper
  disabled?: boolean;
}

const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position: preferredPosition = 'top',
  className = '',
  disabled = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [actualPosition, setActualPosition] = useState(preferredPosition);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<any>(null);

  const updatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipWidth = tooltipRef.current.offsetWidth || 0;
    const tooltipHeight = tooltipRef.current.offsetHeight || 0;
    const buffer = 8;
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    let top = 0;
    let left = 0;
    let currentPos = preferredPosition;

    // Smart Flip Logic: Check if there's space above for 'top' positions
    if (preferredPosition.startsWith('top') && triggerRect.top < tooltipHeight + buffer + 10) {
      currentPos = preferredPosition.replace('top', 'bottom') as typeof preferredPosition;
    } else if (preferredPosition.startsWith('bottom') && window.innerHeight - triggerRect.bottom < tooltipHeight + buffer + 10) {
      currentPos = preferredPosition.replace('bottom', 'top') as typeof preferredPosition;
    }

    setActualPosition(currentPos);

    // Calculate Coords based on actualPosition
    switch (currentPos) {
      case 'top':
        top = triggerRect.top - tooltipHeight - buffer;
        left = triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2;
        break;
      case 'top-start':
        top = triggerRect.top - tooltipHeight - buffer;
        left = triggerRect.left;
        break;
      case 'top-end':
        top = triggerRect.top - tooltipHeight - buffer;
        left = triggerRect.right - tooltipWidth;
        break;
      case 'bottom':
        top = triggerRect.bottom + buffer;
        left = triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2;
        break;
      case 'bottom-start':
        top = triggerRect.bottom + buffer;
        left = triggerRect.left;
        break;
      case 'bottom-end':
        top = triggerRect.bottom + buffer;
        left = triggerRect.right - tooltipWidth;
        break;
      case 'left':
        top = triggerRect.top + triggerRect.height / 2 - tooltipHeight / 2;
        left = triggerRect.left - tooltipWidth - buffer;
        break;
      case 'right':
        top = triggerRect.top + triggerRect.height / 2 - tooltipHeight / 2;
        left = triggerRect.right + buffer;
        break;
    }

    setCoords({ top: top + scrollY, left: left + scrollX });
  };

  const handleMouseEnter = () => {
    if (disabled || !content) return;
    // Small delay (e.g., 300ms) before showing
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, 300);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  useEffect(() => {
    if (isVisible) {
      updatePosition();
      // Use a small RAF or timeout to ensure dimensions are ready
      const timer = setTimeout(updatePosition, 0);

      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (disabled || !content) {
    return <>{children}</>;
  }

  const arrowClasses: Record<string, string> = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-yellow-300 dark:border-t-yellow-600 border-l-transparent border-r-transparent border-b-transparent',
    'top-start': 'top-full left-4 border-t-yellow-300 dark:border-t-yellow-600 border-l-transparent border-r-transparent border-b-transparent',
    'top-end': 'top-full right-4 border-t-yellow-300 dark:border-t-yellow-600 border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-yellow-300 dark:border-b-yellow-600 border-l-transparent border-r-transparent border-t-transparent',
    'bottom-start': 'bottom-full left-4 border-b-yellow-300 dark:border-b-yellow-600 border-l-transparent border-r-transparent border-t-transparent',
    'bottom-end': 'bottom-full right-4 border-b-yellow-300 dark:border-b-yellow-600 border-l-transparent border-r-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-yellow-300 dark:border-l-yellow-600 border-t-transparent border-b-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-yellow-300 dark:border-r-yellow-600 border-t-transparent border-b-transparent border-l-transparent',
  };

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`inline-block ${className}`}
    >
      {children}
      {isVisible && createPortal(
        <div
          ref={tooltipRef}
          style={{
            position: 'absolute',
            top: coords.top,
            left: coords.left,
            pointerEvents: 'none',
          }}
          className="z-[9999] whitespace-nowrap px-3 py-2 text-xs font-normal text-amber-700 dark:text-amber-400 bg-yellow-50/95 dark:bg-slate-900/95 backdrop-blur-sm border border-yellow-300 dark:border-yellow-600 rounded-md shadow-lg"
        >
          {content}
          {/* Arrow (Outer border) */}
          <div className={`absolute border-[6px] w-0 h-0 ${arrowClasses[actualPosition]}`}></div>
          {/* Arrow (Inner fill to match bg) */}
          <div className={`absolute border-[5px] w-0 h-0
            ${actualPosition.startsWith('top') ? `top-full -mt-[2px] border-t-yellow-50 dark:border-t-slate-900 border-l-transparent border-r-transparent border-b-transparent ${actualPosition === 'top' ? 'left-1/2 -translate-x-1/2' : actualPosition === 'top-start' ? 'left-4' : 'right-4'}` : ''}
            ${actualPosition.startsWith('bottom') ? `bottom-full -mb-[2px] border-b-yellow-50 dark:border-b-slate-900 border-l-transparent border-r-transparent border-t-transparent ${actualPosition === 'bottom' ? 'left-1/2 -translate-x-1/2' : actualPosition === 'bottom-start' ? 'left-4' : 'right-4'}` : ''}
            ${actualPosition === 'left' ? 'left-full top-1/2 -translate-y-1/2 -ml-[2px] border-l-yellow-50 dark:border-l-slate-900 border-t-transparent border-b-transparent border-r-transparent' : ''}
            ${actualPosition === 'right' ? 'right-full top-1/2 -translate-y-1/2 -mr-[2px] border-r-yellow-50 dark:border-r-slate-900 border-t-transparent border-b-transparent border-l-transparent' : ''}
          `}></div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Tooltip;
