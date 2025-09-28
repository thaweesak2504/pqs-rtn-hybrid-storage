# 🎨 UI Components Guidelines

## 📋 **Components Overview**

### 🎯 **Available Components**

#### **1. Title Component**
- **Purpose**: สำหรับสร้าง Headers และ Titles ที่มีโครงสร้างมาตรฐาน
- **Features**: Title, Subtitle, Description, Responsive sizing, Alignment options
- **Variants**: Small, Medium, Large sizes

#### **2. Card Component**
- **Purpose**: สำหรับสร้าง Content containers ที่มี styling มาตรฐาน
- **Features**: Title, Subtitle, Icon, Multiple variants, Hover effects
- **Variants**: Default, Elevated, Outlined, Filled

#### **3. Button Component**
- **Purpose**: สำหรับสร้าง Interactive buttons ที่มี states ครบถ้วน
- **Features**: Multiple variants, Sizes, Loading states, Icons, Full width
- **Variants**: Primary, Secondary, Outline, Ghost, Danger

#### **4. Container Component**
- **Purpose**: สำหรับจัดการ Layout containers และ responsive behavior
- **Features**: Multiple sizes, Padding options, Centered layout
- **Sizes**: Small, Medium, Large, Full

#### **5. Grid Component**
- **Purpose**: สำหรับสร้าง Responsive grid layouts
- **Features**: Responsive columns, Gap options, Mobile-first
- **Columns**: 1-6 columns with responsive breakpoints

## 🎯 **Usage Examples**

### **Title Component**
```tsx
import { Title } from '../ui'

// Basic Usage
<Title
  title="Main Heading"
  subtitle="Subtitle text"
  description="Description text"
/>

// With Options
<Title
  title="Custom Title"
  subtitle="Custom Subtitle"
  size="large"
  align="left"
  className="mb-8"
/>
```

### **Card Component**
```tsx
import { Card } from '../ui'
import { Code } from 'lucide-react'

// Basic Card
<Card title="Card Title">
  <p>Card content goes here</p>
</Card>

// Advanced Card
<Card
  title="Feature Card"
  subtitle="Feature description"
  icon={<Code className="w-6 h-6 text-blue-600" />}
  variant="elevated"
  hover
  onClick={() => console.log('Card clicked')}
>
  <p>Advanced card content</p>
</Card>
```

### **Button Component**
```tsx
import { Button } from '../ui'
import { Plus, ArrowRight } from 'lucide-react'

// Basic Button
<Button onClick={() => console.log('Clicked')}>
  Click Me
</Button>

// Advanced Button
<Button
  variant="primary"
  size="large"
  icon={<Plus className="w-4 h-4" />}
  loading={isLoading}
  fullWidth
  onClick={handleClick}
>
  Add Item
</Button>

// Button with Right Icon
<Button
  variant="outline"
  icon={<ArrowRight className="w-4 h-4" />}
  iconPosition="right"
>
  Continue
</Button>
```

### **Container Component**
```tsx
import { Container } from '../ui'

// Basic Container
<Container>
  <p>Content goes here</p>
</Container>

// Custom Container
<Container
  size="large"
  padding="large"
  className="bg-gray-100"
>
  <p>Custom container content</p>
</Container>
```

### **Grid Component**
```tsx
import { Grid } from '../ui'

// Basic Grid
<Grid cols={3} gap="medium">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</Grid>

// Responsive Grid
<Grid cols={4} gap="large">
  <Card title="Card 1">Content 1</Card>
  <Card title="Card 2">Content 2</Card>
  <Card title="Card 3">Content 3</Card>
  <Card title="Card 4">Content 4</Card>
</Grid>
```

## 🎨 **Design System Integration**

### **Typography Classes**
```tsx
// Title Component uses these classes:
.text-display-1    // Large titles
.text-heading-1    // Section headers
.text-heading-2    // Subsection headers
.text-heading-3    // Card headers
.text-body-large   // Large body text
.text-body-medium  // Standard body text
.text-body-small   // Small body text
```

### **Color Variables**
```tsx
// All components use CSS variables:
var(--github-text-primary)      // Main text color
var(--github-text-secondary)    // Secondary text color
var(--github-text-tertiary)     // Tertiary text color
var(--github-bg-primary)        // Primary background
var(--github-bg-secondary)      // Secondary background
var(--github-bg-tertiary)       // Tertiary background
var(--github-border-primary)    // Primary border color
var(--github-accent-primary)    // Primary accent color
```

### **Responsive Breakpoints**
```tsx
// Mobile First Approach:
sm: 640px   // Small devices
md: 768px   // Medium devices
lg: 1024px  // Large devices
xl: 1280px  // Extra large devices
2xl: 1536px // 2X large devices
```

## 🔧 **Component Props**

### **Title Props**
```tsx
interface TitleProps {
  title: string                    // Required: Main title text
  subtitle?: string               // Optional: Subtitle text
  description?: string            // Optional: Description text
  align?: 'left' | 'center' | 'right'  // Text alignment
  size?: 'small' | 'medium' | 'large'  // Title size
  className?: string              // Additional CSS classes
}
```

### **Card Props**
```tsx
interface CardProps {
  children: React.ReactNode       // Required: Card content
  title?: string                  // Optional: Card title
  subtitle?: string               // Optional: Card subtitle
  icon?: React.ReactNode          // Optional: Card icon
  variant?: 'default' | 'elevated' | 'outlined' | 'filled'
  size?: 'small' | 'medium' | 'large'
  hover?: boolean                 // Enable hover effects
  className?: string              // Additional CSS classes
  onClick?: () => void            // Click handler
}
```

### **Button Props**
```tsx
interface ButtonProps {
  children: React.ReactNode       // Required: Button text
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean              // Disable button
  loading?: boolean               // Show loading state
  icon?: React.ReactNode          // Button icon
  iconPosition?: 'left' | 'right' // Icon position
  fullWidth?: boolean             // Full width button
  className?: string              // Additional CSS classes
  onClick?: () => void            // Click handler
  type?: 'button' | 'submit' | 'reset'
}
```

### **Container Props**
```tsx
interface ContainerProps {
  children: React.ReactNode       // Required: Container content
  size?: 'small' | 'medium' | 'large' | 'full'
  padding?: 'none' | 'small' | 'medium' | 'large'
  className?: string              // Additional CSS classes
}
```

### **Grid Props**
```tsx
interface GridProps {
  children: React.ReactNode       // Required: Grid items
  cols?: 1 | 2 | 3 | 4 | 5 | 6   // Number of columns
  gap?: 'small' | 'medium' | 'large'
  className?: string              // Additional CSS classes
}
```

## 📱 **Responsive Behavior**

### **Grid Responsive Columns**
```tsx
// 2 Columns: 1 col (mobile) → 2 cols (tablet+)
<Grid cols={2}>

// 3 Columns: 1 col (mobile) → 2 cols (tablet) → 3 cols (desktop)
<Grid cols={3}>

// 4 Columns: 1 col (mobile) → 2 cols (tablet) → 4 cols (desktop)
<Grid cols={4}>
```

### **Typography Responsive Sizing**
```tsx
// Title sizes scale automatically:
.text-display-1 {
  @apply text-3xl sm:text-4xl md:text-5xl lg:text-6xl;
  /* Mobile: 30px → Tablet: 36px → Desktop: 48px → Large: 60px */
}
```

### **Container Responsive Padding**
```tsx
// Container padding scales:
.padding-medium {
  @apply px-4 sm:px-6 lg:px-8;
  /* Mobile: 16px → Tablet: 24px → Desktop: 32px */
}
```

## 🌙 **Dark Mode Support**

### **Automatic Dark Mode**
```tsx
// All components automatically support dark mode:
// Light Mode: Uses :root CSS variables
// Dark Mode: Uses .dark CSS variables

// Example:
<Card title="Dark Mode Card">
  <p>This card automatically adapts to dark mode</p>
</Card>
```

### **Color Variables**
```css
/* Light Mode */
:root {
  --github-text-primary: #24292f;
  --github-bg-primary: #ffffff;
}

/* Dark Mode */
.dark {
  --github-text-primary: #f0f6fc;
  --github-bg-primary: #010409;
}
```

## 🎯 **Best Practices**

### **1. Component Composition**
```tsx
// ✅ Good: Combine components
<Container size="large">
  <Title title="Section Title" size="medium" />
  <Grid cols={3} gap="medium">
    <Card title="Card 1">Content 1</Card>
    <Card title="Card 2">Content 2</Card>
    <Card title="Card 3">Content 3</Card>
  </Grid>
</Container>

// ❌ Bad: Don't override component styles
<Card className="bg-red-500 text-white">
  {/* Don't override component colors */}
</Card>
```

### **2. Responsive Design**
```tsx
// ✅ Good: Use responsive props
<Grid cols={3} gap="medium">
  {/* Grid automatically handles responsive behavior */}
</Grid>

// ❌ Bad: Don't use fixed widths
<div className="w-96">
  {/* Don't use fixed widths */}
</div>
```

### **3. Accessibility**
```tsx
// ✅ Good: Include proper labels
<Button aria-label="Add new item" icon={<Plus />}>
  Add Item
</Button>

// ✅ Good: Use semantic HTML
<Title title="Main Heading" />
{/* Renders as <h1> automatically */}
```

### **4. Performance**
```tsx
// ✅ Good: Use proper event handlers
<Button onClick={handleClick}>
  Click Me
</Button>

// ❌ Bad: Don't create functions inline
<Button onClick={() => console.log('clicked')}>
  Click Me
</Button>
```

## 📚 **Import and Usage**

### **Import All Components**
```tsx
import { Title, Card, Button, Container, Grid } from '../ui'
```

### **Import Individual Components**
```tsx
import Title from '../ui/Title'
import Card from '../ui/Card'
import Button from '../ui/Button'
```

### **Example Page Structure**
```tsx
import React from 'react'
import { Title, Card, Button, Container, Grid } from '../ui'

const ExamplePage: React.FC = () => {
  return (
    <Container size="large" padding="large">
      <Title
        title="Example Page"
        subtitle="Using UI Components"
        description="This page demonstrates the usage of our UI components."
        size="large"
      />
      
      <Grid cols={3} gap="medium">
        <Card
          title="Feature 1"
          subtitle="Description"
          variant="elevated"
          hover
        >
          <p>Content for feature 1</p>
          <Button variant="primary" size="small">
            Learn More
          </Button>
        </Card>
        
        {/* More cards... */}
      </Grid>
    </Container>
  )
}

export default ExamplePage
```

---

**สร้างโดย:** thaweesak2504  
**อัปเดตล่าสุด:** 2025-01-27  
**เวอร์ชัน:** 1.0.0
