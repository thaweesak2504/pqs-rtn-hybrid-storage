# 🎨 Typography Guidelines

## 📱 **Responsive Font System**

### 🎯 **Typography Classes**

#### **Display Text (สำหรับ Headlines หลัก)**
```css
.text-display-1  /* Mobile: 1.875rem, Tablet: 2.25rem, Desktop: 3rem, Large: 3.75rem */
.text-display-2  /* Mobile: 1.5rem, Tablet: 1.875rem, Desktop: 2.25rem, Large: 3rem */
```

#### **Heading Text (สำหรับ Headings)**
```css
.text-heading-1  /* Mobile: 1.25rem, Tablet: 1.5rem, Desktop: 1.875rem, Large: 2.25rem */
.text-heading-2  /* Mobile: 1.125rem, Tablet: 1.25rem, Desktop: 1.5rem, Large: 1.875rem */
.text-heading-3  /* Mobile: 1rem, Tablet: 1.125rem, Desktop: 1.25rem, Large: 1.5rem */
```

#### **Body Text (สำหรับเนื้อหาหลัก)**
```css
.text-body-large   /* Mobile: 1rem, Tablet: 1.125rem, Desktop: 1.25rem */
.text-body-medium  /* Mobile: 0.875rem, Tablet: 1rem, Desktop: 1.125rem */
.text-body-small   /* Mobile: 0.75rem, Tablet: 0.875rem, Desktop: 1rem */
```

#### **Caption Text (สำหรับข้อความเล็ก)**
```css
.text-caption  /* Mobile: 0.75rem, Tablet: 0.875rem */
```

## 📊 **Breakpoint System**

### **Tailwind Breakpoints**
```css
/* Mobile First */
sm: 640px   /* Small devices */
md: 768px   /* Medium devices */
lg: 1024px  /* Large devices */
xl: 1280px  /* Extra large devices */
2xl: 1536px /* 2X large devices */
```

### **Font Size Progression**
```
Mobile (default): 16px base
├── text-xs: 12px
├── text-sm: 14px
├── text-base: 16px
├── text-lg: 18px
├── text-xl: 20px
├── text-2xl: 24px
└── text-3xl: 30px

Tablet (sm+): 16px base
├── text-sm: 14px
├── text-base: 16px
├── text-lg: 18px
├── text-xl: 20px
├── text-2xl: 24px
├── text-3xl: 30px
└── text-4xl: 36px

Desktop (md+): 16px base
├── text-base: 16px
├── text-lg: 18px
├── text-xl: 20px
├── text-2xl: 24px
├── text-3xl: 30px
├── text-4xl: 36px
└── text-5xl: 48px

Large (lg+): 16px base
├── text-lg: 18px
├── text-xl: 20px
├── text-2xl: 24px
├── text-3xl: 30px
├── text-4xl: 36px
├── text-5xl: 48px
└── text-6xl: 60px
```

## 🎯 **Usage Guidelines**

### **1. Main Headlines**
```tsx
// Hero Section Main Title
<h1 className="text-display-1 text-[var(--github-text-primary)]">
  Build and ship software on a single, collaborative platform
</h1>

// Section Headers
<h2 className="text-display-2 text-[var(--github-text-primary)]">
  Section Title
</h2>
```

### **2. Section Headings**
```tsx
// Page Sections
<h2 className="text-heading-1 text-[var(--github-text-primary)]">
  About Us
</h2>

// Sub Sections
<h3 className="text-heading-2 text-[var(--github-text-primary)]">
  Our Mission
</h3>

// Card Headers
<h4 className="text-heading-3 text-[var(--github-text-primary)]">
  Feature Title
</h4>
```

### **3. Body Content**
```tsx
// Main Content
<p className="text-body-large text-[var(--github-text-secondary)]">
  Main paragraph content with larger text for better readability.
</p>

// Regular Content
<p className="text-body-medium text-[var(--github-text-secondary)]">
  Regular paragraph content with standard text size.
</p>

// Small Content
<p className="text-body-small text-[var(--github-text-tertiary)]">
  Smaller text for secondary information.
</p>
```

### **4. UI Elements**
```tsx
// Navigation
<nav className="text-body-medium">
  <a href="#" className="text-[var(--github-text-secondary)]">Home</a>
</nav>

// Buttons
<button className="text-body-medium font-semibold">
  Click Me
</button>

// Form Labels
<label className="text-body-small font-medium">
  Email Address
</label>

// Captions
<span className="text-caption text-[var(--github-text-tertiary)]">
  Last updated: 2024-01-27
</span>
```

## 🎨 **Font Weight Guidelines**

### **Weight Usage**
```css
font-thin      /* 100 - สำหรับ decorative text */
font-light     /* 300 - สำหรับ large display text */
font-normal    /* 400 - สำหรับ body text */
font-medium    /* 500 - สำหรับ emphasis */
font-semibold  /* 600 - สำหรับ headings */
font-bold      /* 700 - สำหรับ strong emphasis */
```

### **Weight Combinations**
```tsx
// Display Text
<h1 className="text-display-1 font-bold">Bold Display</h1>

// Headings
<h2 className="text-heading-1 font-semibold">Semibold Heading</h2>

// Body Text
<p className="text-body-medium font-normal">Normal Body Text</p>

// Emphasis
<span className="text-body-medium font-medium">Medium Emphasis</span>
```

## 🌙 **Dark Mode Considerations**

### **Color Variables**
```css
/* Light Mode */
--github-text-primary: #24292f;    /* Main text */
--github-text-secondary: #656d76;  /* Secondary text */
--github-text-tertiary: #656d76;   /* Tertiary text */

/* Dark Mode */
--github-text-primary: #f0f6fc;    /* Main text */
--github-text-secondary: #7d8590;  /* Secondary text */
--github-text-tertiary: #8b949e;   /* Tertiary text */
```

### **Usage Example**
```tsx
<h1 className="text-display-1 text-[var(--github-text-primary)]">
  Title that adapts to dark mode
</h1>

<p className="text-body-medium text-[var(--github-text-secondary)]">
  Body text that adapts to dark mode
</p>
```

## 📱 **Mobile-First Approach**

### **Best Practices**
1. **เริ่มจาก Mobile**: ใช้ขนาดฟอนต์ที่เหมาะสมกับมือถือก่อน
2. **Progressive Enhancement**: เพิ่มขนาดฟอนต์ตาม breakpoint
3. **Readability**: ตรวจสอบความอ่านง่ายในทุกขนาดหน้าจอ
4. **Touch Targets**: ใช้ขนาดที่เหมาะสมสำหรับการแตะ

### **Example Implementation**
```tsx
// ✅ Good - Mobile First
<h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl">
  Responsive Title
</h1>

// ❌ Bad - Desktop First
<h1 className="text-6xl lg:text-5xl md:text-4xl sm:text-3xl">
  Non-responsive Title
</h1>
```

## 🔧 **Implementation**

### **CSS Classes (ใน index.css)**
```css
@layer base {
  .text-display-1 {
    @apply text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold;
  }
  
  .text-heading-1 {
    @apply text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold;
  }
  
  .text-body-large {
    @apply text-base sm:text-lg md:text-xl;
  }
}
```

### **Tailwind Config (ใน tailwind.config.js)**
```js
theme: {
  extend: {
    fontFamily: {
      'sans': ['Kanit', 'sans-serif'],
      'kanit': ['Kanit', 'sans-serif'],
      'th-sarabun': ['TH Sarabun New', 'serif'],
    },
  },
}
```

---

**สร้างโดย:** thaweesak2504  
**อัปเดตล่าสุด:** 2025-01-27  
**เวอร์ชัน:** 1.0.0
