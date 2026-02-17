import React, { ReactNode } from 'react';
import Container from '../ui/Container';

type SectionTheme = 'blue' | 'green' | 'orange' | 'purple';

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
    if (sec.startsWith('1')) return 'green';
    if (sec.startsWith('2')) return 'orange';
    if (sec.startsWith('3')) return 'purple';
    return 'blue'; // Default to Introduction/General
  };

  const theme = getTheme(section);

  // Theme-specific styles
  const themeStyles = {
    blue: {
      bg: 'bg-github-bg-primary',
      accent: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800'
    },
    green: {
      bg: 'bg-github-bg-primary',
      accent: 'text-green-600 dark:text-green-400',
      border: 'border-green-200 dark:border-green-800'
    },
    orange: {
      bg: 'bg-github-bg-primary',
      accent: 'text-orange-600 dark:text-orange-400',
      border: 'border-orange-200 dark:border-orange-800'
    },
    purple: {
      bg: 'bg-github-bg-primary',
      accent: 'text-purple-600 dark:text-purple-400',
      border: 'border-purple-200 dark:border-purple-800'
    }
  };

  const currentStyle = themeStyles[theme];

  return (
    <div className={`min-h-screen ${currentStyle.bg} transition-colors duration-500 font-sans ${className}`}>
      <Container size="medium" padding="large" className="py-8 space-y-6">
        {children}
      </Container>
    </div>
  );
};

export default PqsEditorLayout;
