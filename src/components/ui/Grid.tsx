import React from 'react'

interface GridProps {
  children: React.ReactNode
  cols?: 1 | 2 | 3 | 4 | 5 | 6
  gap?: 'small' | 'medium' | 'large'
  className?: string
}

const Grid: React.FC<GridProps> = ({
  children,
  cols = 1,
  gap = 'medium',
  className = ''
}) => {
  const colsClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6'
  }

  const gapClasses = {
    small: 'gap-4',
    medium: 'gap-6 hd:gap-8',
    large: 'gap-8 hd:gap-12 fhd:gap-16'
  }

  return (
    <div className={`grid ${colsClasses[cols]} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  )
}

export default Grid
