// 🎨 Title Component with Improved Color Scheme

import React from 'react'

interface TitleProps {
  title: string
  subtitle?: string
  description?: string
  align?: 'left' | 'center' | 'right'
  size?: 'small' | 'medium' | 'large'
  className?: string
}

const Title: React.FC<TitleProps> = ({
  title,
  subtitle,
  description,
  align = 'center',
  size = 'medium',
  className = ''
}) => {
  const alignmentClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right'
  }

  const sizeClasses = {
    small: {
      title: 'text-base sm:text-lg font-semibold',
      subtitle: 'text-xs sm:text-sm font-medium',
      description: 'text-xs font-normal'
    },
    medium: {
      title: 'text-lg sm:text-xl font-semibold',
      subtitle: 'text-sm sm:text-base font-medium',
      description: 'text-xs sm:text-sm font-normal'
    },
    large: {
      title: 'text-xl sm:text-2xl font-semibold',
      subtitle: 'text-base sm:text-lg font-medium',
      description: 'text-sm sm:text-base font-normal'
    }
  }

  return (
    <div className={`${alignmentClasses[align]} ${className}`}>
      {/* Main Title - Primary Hierarchy */}
      <h1 className={`${sizeClasses[size].title} text-github-text-primary mb-2 sm:mb-3`}>
        {title}
      </h1>
      
      {/* Subtitle - Secondary Hierarchy */}
      {subtitle && (
        <h2 className={`${sizeClasses[size].subtitle} text-github-text-secondary mb-3 sm:mb-4`}>
          {subtitle}
        </h2>
      )}
      
      {/* Description - Tertiary Hierarchy */}
      {description && (
        <p className={`${sizeClasses[size].description} text-github-text-tertiary leading-relaxed max-w-3xl ${align === 'center' ? 'mx-auto' : ''}`}>
          {description}
        </p>
      )}
    </div>
  )
}

export default Title

// 🎯 Usage Examples:

/* 
// Example 1: Hero Section
<Title
  title="Welcome to PQS RTN"
  subtitle="กองทัพเรือไทย"
  description="ระบบมาตรฐานกำลังพลสำหรับการจัดการข้อมูลและติดตามผลงานของบุคลากรในกองทัพเรือ"
  size="large"
  align="center"
/>

// Example 2: Page Header
<Title
  title="High Ranks Management"
  subtitle="จัดการข้อมูลผู้บังคับบัญชาสูงสุด"
  description="อัปเดตและจัดการข้อมูลผู้บังคับบัญชาสูงสุดของกองทัพเรือ"
  size="medium"
  align="center"
/>

// Example 3: Section Header
<Title
  title="Contact Information"
  subtitle="ติดต่อเรา"
  description="สำหรับคำถามหรือข้อสงสัยใดๆ"
  size="small"
  align="left"
/>
*/

// 🎨 Color Hierarchy Explanation:

/*
1. PRIMARY (Title):
   - Dark Mode: #ffffff (Pure white)
   - Light Mode: #1a1a1a (Deep black)
   - Usage: Main headings, most important text
   - Contrast: 21:1 (Dark) / 16.5:1 (Light) - Excellent

2. SECONDARY (Subtitle):
   - Dark Mode: #a8b2d1 (Soft blue-gray)
   - Light Mode: #4a5568 (Medium gray)
   - Usage: Section headers, card titles
   - Contrast: 4.8:1 (Dark) / 7.2:1 (Light) - Good

3. TERTIARY (Description):
   - Dark Mode: #7c7c7c (Neutral gray)
   - Light Mode: #718096 (Light gray)
   - Usage: Descriptions, captions, metadata
   - Contrast: 3.2:1 (Dark) / 4.5:1 (Light) - Acceptable
*/
