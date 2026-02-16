import React, { ReactNode } from 'react';

type SectionTheme = 'blue' | 'orange' | 'purple';

interface PqsEditorLayoutProps {
  children: ReactNode;
  section?: '100' | '200' | '300' | string;
  className?: string;
}

const PqsEditorLayout: React.FC<PqsEditorLayoutProps> = ({
  children,
  section = '100',
  className = ''
}) => {
  // Determine theme based on section
  const getTheme = (sec: string): SectionTheme => {
    if (sec.startsWith('2')) return 'orange';
    if (sec.startsWith('3')) return 'purple';
    return 'blue'; // Default to 100/General
  };

  const theme = getTheme(section);

  // Theme-specific styles
  const themeStyles = {
    blue: {
      bg: 'bg-slate-50 dark:bg-slate-950',
      accent: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800'
    },
    orange: {
      bg: 'bg-orange-50 dark:bg-zinc-950', // Warm/Neutral bg
      accent: 'text-orange-600 dark:text-orange-400',
      border: 'border-orange-200 dark:border-orange-800'
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-slate-950',
      accent: 'text-purple-600 dark:text-purple-400',
      border: 'border-purple-200 dark:border-purple-800'
    }
  };

  const currentStyle = themeStyles[theme];

  return (
    <div className={`min-h-screen ${currentStyle.bg} transition-colors duration-500 font-sans ${className}`}>
      <div className="w-full mx-auto px-4 md:px-8 py-8 space-y-6">
        {children}
      </div>
    </div>
  );
};

export default PqsEditorLayout;
