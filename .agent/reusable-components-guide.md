# PQS RTN Hybrid Storage - Reusable Components Guide

## 📋 Table of Contents
- [Core UI Components](#core-ui-components)
- [Layout Components](#layout-components)
- [Form Components](#form-components)
- [Modal Components](#modal-components)
- [Editor Components](#editor-components)
- [Business Components](#business-components)
- [Usage Guidelines](#usage-guidelines)

---

## 🎨 Core UI Components

### Button
**Location:** `src/components/ui/Button.tsx`

**Purpose:** Standardized button with multiple variants and states

**Props:**
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'small' | 'medium' | 'large'
  loading?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
}
```

**Usage Examples:**
```tsx
// Primary button
<Button variant="primary" size="medium" onClick={handleClick}>
  Submit
</Button>

// Button with icon
<Button variant="outline" size="small" icon={<Plus />}>
  Add Item
</Button>

// Loading state
<Button variant="primary" loading={isLoading}>
  Processing...
</Button>

// Disabled state
<Button variant="ghost" disabled={isDisabled}>
  Cancel
</Button>
```

**Styling:**
- GitHub theme colors (`bg-github-bg-active`, `text-github-text-primary`)
- Hover effects with scale transforms (`hover:scale-[1.02]`)
- Smooth transitions (`duration-200`)
- Consistent border radius (`rounded-lg`)

---

### Modal
**Location:** `src/components/ui/Modal.tsx`

**Purpose:** Reusable modal dialog with multiple sizes

**Props:**
```typescript
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showCloseButton?: boolean
  closeOnBackdrop?: boolean
  closeOnEscape?: boolean
  className?: string
}
```

**Usage Examples:**
```tsx
<Modal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  title="Confirm Action"
  size="md"
>
  <p>Are you sure you want to proceed?</p>
  <div className="flex justify-end gap-2 mt-4">
    <Button variant="outline" onClick={() => setIsModalOpen(false)}>
      Cancel
    </Button>
    <Button variant="primary" onClick={handleConfirm}>
      Confirm
    </Button>
  </div>
</Modal>
```

**Features:**
- Portal rendering for proper z-index
- Escape key handling
- Backdrop click handling
- Size variants with responsive widths

---

### Card
**Location:** `src/components/ui/Card.tsx`

**Purpose:** Flexible container component with multiple variants

**Props:**
```typescript
interface CardProps {
  children?: React.ReactNode
  title?: string
  subtitle?: string
  icon?: React.ReactNode
  variant?: 'default' | 'elevated' | 'outlined' | 'filled'
  size?: 'small' | 'medium' | 'large'
  hover?: boolean
  className?: string
  onClick?: () => void
}
```

**Usage Examples:**
```tsx
// Basic card
<Card variant="default" size="medium">
  <p>Card content goes here</p>
</Card>

// Card with header
<Card
  title="Statistics"
  subtitle="Monthly overview"
  icon={<ChartBar />}
  variant="elevated"
  hover
>
  <div className="grid grid-cols-2 gap-4">
    <div>Revenue: $10,000</div>
    <div>Users: 1,234</div>
  </div>
</Card>

// Clickable card
<Card
  variant="outlined"
  onClick={handleCardClick}
  className="cursor-pointer"
>
  <h3>Click me</h3>
</Card>
```

**Variants:**
- `default`: Standard border and background
- `elevated`: Box shadow for depth
- `outlined`: Transparent background with border
- `filled`: Solid background color

---

### Tooltip
**Location:** `src/components/ui/Tooltip.tsx`

**Purpose:** Contextual help text with positioning

**Props:**
```typescript
interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end';
  className?: string;
  disabled?: boolean;
}
```

**Usage Examples:**
```tsx
<Tooltip content="Click to save changes" position="top">
  <Button variant="ghost" size="small">
    <Save />
  </Button>
</Tooltip>

<Tooltip content="This field is required" position="right">
  <Input />
</Tooltip>
```

**Features:**
- Portal rendering for proper layering
- Smart positioning with boundary detection
- Hover and focus handling
- Custom styling support

---

### Alert
**Location:** `src/components/ui/Alert.tsx`

**Purpose:** Status messages with type-specific styling

**Props:**
```typescript
interface AlertProps {
  type: 'error' | 'warning' | 'info' | 'success'
  title?: string
  message: string
  showCloseButton?: boolean
  onClose?: () => void
  className?: string
}
```

**Usage Examples:**
```tsx
// Success alert
<Alert
  type="success"
  title="Success!"
  message="Your changes have been saved."
  showCloseButton
  onClose={() => setShowAlert(false)}
/>

// Error alert
<Alert
  type="error"
  message="Failed to save changes. Please try again."
/>

// Warning alert
<Alert
  type="warning"
  title="Warning"
  message="This action cannot be undone."
/>
```

**Type Styling:**
- `success`: Green background with checkmark icon
- `error`: Red background with X icon
- `warning`: Yellow background with warning icon
- `info`: Blue background with info icon

---

### DropdownMenu
**Location:** `src/components/ui/DropdownMenu.tsx`

**Purpose:** Context menu with customizable items

**Props:**
```typescript
interface DropdownMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  separator?: boolean;
}

interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownMenuItem[];
  align?: 'left' | 'right';
  className?: string;
}
```

**Usage Examples:**
```tsx
<DropdownMenu
  trigger={
    <Button variant="ghost" size="small">
      Options <ChevronDown />
    </Button>
  }
  items={[
    { label: 'Edit', icon: <Edit />, onClick: handleEdit },
    { label: 'Delete', icon: <Trash />, onClick: handleDelete, danger: true },
    { separator: true },
    { label: 'Export', icon: <Download />, onClick: handleExport },
  ]}
  align="right"
/>
```

**Features:**
- Portal rendering for proper layering
- Keyboard navigation
- Disabled and danger states
- Separator support
- Left/right alignment

---

## 🏗️ Layout Components

### BaseLayout
**Location:** `src/components/BaseLayout.tsx`

**Purpose:** Main application layout wrapper

**Features:**
- Responsive design
- Header and footer integration
- Dark mode support
- Navigation integration

---

### UnifiedLayout
**Location:** `src/components/UnifiedLayout.tsx`

**Purpose:** Unified layout system for all pages

**Features:**
- Consistent spacing
- Responsive breakpoints
- Theme integration
- Navigation state management

---

## 📝 Form Components

### Form Component
**Location:** `src/components/ui/Form.tsx`

**Purpose:** Form wrapper with validation support

**Usage Guidelines:**
- Use for all form containers
- Integrate with validation libraries
- Provide consistent error handling

---

### ContentEditor
**Location:** `src/components/forms/ContentEditor.tsx`

**Purpose:** Rich text content editing

**Features:**
- Markdown support
- Toolbar integration
- Auto-save functionality

---

## 🔧 Modal Components

### ConfirmModal
**Location:** `src/components/modals/ConfirmModal.tsx`

**Purpose:** Standardized confirmation dialogs

**Usage Examples:**
```tsx
<ConfirmModal
  isOpen={showConfirm}
  title="Delete Item"
  message="Are you sure you want to delete this item?"
  confirmText="Delete"
  cancelText="Cancel"
  onConfirm={handleDelete}
  onCancel={() => setShowConfirm(false)}
  variant="danger"
/>
```

---

### AddQuestionModal
**Location:** `src/components/modals/AddQuestionModal.tsx`

**Purpose:** Question creation interface

**Features:**
- Question type selection
- Form validation
- Auto-save drafts

---

## 📚 Editor Components

### QuestionTreeNode
**Location:** `src/components/editor_v2/QuestionTreeNode.tsx`

**Purpose:** Hierarchical question editing interface

**Key Features:**
- Drag-and-drop reordering
- Nested question support
- Real-time validation
- Sub-question selection with bulk actions

**Usage Guidelines:**
- Use for all question editing
- Leverage built-in validation
- Follow established patterns for new question types

---

### QuestionDisplayCard
**Location:** `src/components/editor_v2/QuestionDisplayCard.tsx`

**Purpose:** Question preview and display

**Features:**
- Multiple view modes
- Responsive design
- Print-friendly styling
- Theme integration

---

## 🎯 Business Components

### UserAvatar
**Location:** `src/components/UserAvatar.tsx`

**Purpose:** User profile image display

**Features:**
- Fallback initials
- Size variants
- Online status indicators

---

### UnitSelector
**Location:** `src/components/common/UnitSelector.tsx`

**Purpose:** Military unit selection interface

**Features:**
- Hierarchical selection
- Search functionality
- Multi-select support

---

## 📋 Usage Guidelines

### 1. Component Selection
- **Always check existing components first** before creating new ones
- **Use UI components** for basic interactions (buttons, modals, etc.)
- **Use business components** for domain-specific functionality
- **Follow established patterns** for consistency

### 2. Styling Guidelines
- **Use Tailwind CSS classes** for all styling
- **Follow GitHub theme colors** for consistency
- **Maintain responsive design** principles
- **Use semantic HTML** elements

### 3. TypeScript Guidelines
- **Define clear interfaces** for all props
- **Use proper typing** for all functions
- **Leverage generics** for reusable components
- **Document complex types** with comments

### 4. Performance Guidelines
- **Use React.memo** for expensive components
- **Implement proper key props** for lists
- **Lazy load heavy components** when possible
- **Optimize re-renders** with useCallback/useMemo

### 5. Accessibility Guidelines
- **Provide proper ARIA labels** for interactive elements
- **Support keyboard navigation** for all interactions
- **Maintain focus management** in modals
- **Use semantic HTML** structure

### 6. Testing Guidelines
- **Write unit tests** for complex logic
- **Test component props** thoroughly
- **Verify accessibility** features
- **Test responsive behavior**

---

## 🎨 Theme Integration

### Color System
- **Primary:** GitHub theme colors (`bg-github-bg-active`)
- **Section 200:** Orange theme (`text-orange-600`, `border-orange-200`)
- **Section 300:** Purple theme (`text-purple-600`, `border-purple-200`)
- **Success:** Green (`text-green-600`, `bg-green-50`)
- **Error:** Red (`text-red-600`, `bg-red-50`)
- **Warning:** Yellow (`text-yellow-600`, `bg-yellow-50`)

### Typography
- **Headers:** `text-lg`, `text-xl`, `text-2xl`
- **Body:** `text-sm`, `text-base`
- **Small:** `text-xs`
- **Font weights:** `font-normal`, `font-medium`, `font-bold`

### Spacing
- **XS:** `p-1`, `m-1`, `gap-1`
- **Small:** `p-2`, `m-2`, `gap-2`
- **Medium:** `p-4`, `m-4`, `gap-4`
- **Large:** `p-6`, `m-6`, `gap-6`

---

## 🔄 Component Lifecycle

### 1. Planning Phase
- **Review existing components** for similar functionality
- **Define clear interfaces** and props
- **Plan responsive behavior**
- **Consider accessibility requirements**

### 2. Development Phase
- **Start with TypeScript interfaces**
- **Implement basic functionality**
- **Add styling with Tailwind**
- **Test with different data scenarios**

### 3. Integration Phase
- **Test with parent components**
- **Verify responsive behavior**
- **Check accessibility features**
- **Test error scenarios**

### 4. Documentation Phase
- **Update this guide** with new component
- **Add usage examples**
- **Document props and interfaces**
- **Include testing guidelines**

---

## 📚 Additional Resources

### Internal Documentation
- Component source code in `src/components/`
- Storybook stories (if available)
- Unit tests in `__tests__` directories

### External References
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

## 🔄 Maintenance Guidelines

### Regular Tasks
- **Review component usage** across the application
- **Update dependencies** and test compatibility
- **Refactor duplicate code** into reusable components
- **Update documentation** with changes

### When Adding New Components
1. **Check for existing solutions** first
2. **Follow established patterns** and conventions
3. **Write comprehensive tests**
4. **Update this guide**
5. **Review with team** before merging

### When Modifying Existing Components
1. **Consider backward compatibility**
2. **Update all usage locations**
3. **Test thoroughly** with different scenarios
4. **Update documentation** accordingly
5. **Communicate changes** to the team

---

*This guide should be updated whenever new components are added or existing components are significantly modified.*
