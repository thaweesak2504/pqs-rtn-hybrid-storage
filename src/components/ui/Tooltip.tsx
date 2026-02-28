import React, { ReactNode } from 'react';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string; // Applied to the wrapper
  disabled?: boolean;
}

const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  className = '',
  disabled = false,
}) => {
  if (disabled || !content) {
    return <>{children}</>;
  }

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
    left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
    right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-slate-200 dark:border-t-slate-700 border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-200 dark:border-b-slate-700 border-l-transparent border-r-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-slate-200 dark:border-l-slate-700 border-t-transparent border-b-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-slate-200 dark:border-r-slate-700 border-t-transparent border-b-transparent border-l-transparent',
  };

  return (
    <div className={`relative group inline-block ${className}`}>
      {children}
      <div className={`absolute z-[9999] whitespace-nowrap px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none ${positionClasses[position]}`}>
        {content}
        {/* Arrow (Outer border) */}
        <div className={`absolute border-[6px] w-0 h-0 ${arrowClasses[position]}`}></div>
        {/* Arrow (Inner fill to match bg) */}
        <div className={`absolute border-[5px] w-0 h-0
          ${position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -mt-[2px] border-t-white dark:border-t-slate-900 border-l-transparent border-r-transparent border-b-transparent' : ''}
          ${position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 -mb-[2px] border-b-white dark:border-b-slate-900 border-l-transparent border-r-transparent border-t-transparent' : ''}
          ${position === 'left' ? 'left-full top-1/2 -translate-y-1/2 -ml-[2px] border-l-white dark:border-l-slate-900 border-t-transparent border-b-transparent border-r-transparent' : ''}
          ${position === 'right' ? 'right-full top-1/2 -translate-y-1/2 -mr-[2px] border-r-white dark:border-r-slate-900 border-t-transparent border-b-transparent border-l-transparent' : ''}
        `}></div>
      </div>
    </div>
  );
};

export default Tooltip;
