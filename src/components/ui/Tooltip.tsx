import React, { ReactNode } from 'react';

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
  position = 'top',
  className = '',
  disabled = false,
}) => {
  if (disabled || !content) {
    return <>{children}</>;
  }

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
    'top-start': 'bottom-full left-0 mb-1.5',
    'top-end': 'bottom-full right-0 mb-1.5',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
    'bottom-start': 'top-full left-0 mt-1.5',
    'bottom-end': 'top-full right-0 mt-1.5',
    left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
    right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
  };

  const arrowClasses = {
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
    <div className={`relative group inline-block ${className}`}>
      {children}
      <div className={`absolute z-[9999] whitespace-nowrap px-3 py-2 text-xs font-normal text-amber-700 dark:text-amber-400 bg-yellow-50/95 dark:bg-slate-900/95 backdrop-blur-sm border border-yellow-300 dark:border-yellow-600 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none ${positionClasses[position]}`}>
        {content}
        {/* Arrow (Outer border) */}
        <div className={`absolute border-[6px] w-0 h-0 ${arrowClasses[position]}`}></div>
        {/* Arrow (Inner fill to match bg) */}
        <div className={`absolute border-[5px] w-0 h-0
          ${position.startsWith('top') ? `top-full -mt-[2px] border-t-yellow-50 dark:border-t-slate-900 border-l-transparent border-r-transparent border-b-transparent ${position === 'top' ? 'left-1/2 -translate-x-1/2' : position === 'top-start' ? 'left-4' : 'right-4'}` : ''}
          ${position.startsWith('bottom') ? `bottom-full -mb-[2px] border-b-yellow-50 dark:border-b-slate-900 border-l-transparent border-r-transparent border-t-transparent ${position === 'bottom' ? 'left-1/2 -translate-x-1/2' : position === 'bottom-start' ? 'left-4' : 'right-4'}` : ''}
          ${position === 'left' ? 'left-full top-1/2 -translate-y-1/2 -ml-[2px] border-l-yellow-50 dark:border-l-slate-900 border-t-transparent border-b-transparent border-r-transparent' : ''}
          ${position === 'right' ? 'right-full top-1/2 -translate-y-1/2 -mr-[2px] border-r-yellow-50 dark:border-r-slate-900 border-t-transparent border-b-transparent border-l-transparent' : ''}
        `}></div>
      </div>
    </div>
  );
};

export default Tooltip;
