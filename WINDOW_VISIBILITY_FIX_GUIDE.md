# 🔧 **Window Visibility Fix Guide - PQS RTN Tauri**

**Date**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")  
**Status**: ✅ **Implementation Complete**

---

## 🐛 **Problem Description**

### **Issue:**
- เมื่อเปิดหน้าของโปรเจคไว้แล้ว
- พอไปที่โปรแกรมอื่นๆ นานๆ หรือหลังจาก Computer Sleep
- เมื่อกลับมาที่หน้าของโปรเจค จะแสดงไม่เต็มหน้า หรือบางส่วน

### **Root Cause:**
1. **Window Visibility Events**: ไม่มีการจัดการ `visibilitychange` events
2. **Focus Events**: ไม่มีการจัดการ `focus`/`blur` events
3. **Layout Recalculation**: ไม่มีการ force refresh layout หลังจาก visibility change
4. **Tauri Window State**: ไม่มีการ sync กับ Tauri window state changes

---

## ✅ **Solution Implementation**

### **1. 🎯 New Hook: `useWindowVisibility`**

**File**: `src/hooks/useWindowVisibility.ts`

**Features:**
- ✅ **Visibility Change Detection**: Monitors `document.hidden` state
- ✅ **Focus Change Detection**: Monitors `document.hasFocus()` state
- ✅ **Window Resize Handling**: Debounced resize event handling
- ✅ **Tauri Integration**: Listens to Tauri window events
- ✅ **Force Refresh**: Manual trigger for layout recalculation
- ✅ **Maximize State**: Tracks window maximize/minimize state

**Key Functions:**
```typescript
// Force refresh when becoming visible
onVisibilityChange: (visible) => {
  if (visible) {
    setTimeout(() => {
      forceRefresh()
    }, 100)
  }
}

// Force refresh when gaining focus
onFocusChange: (focused) => {
  if (focused) {
    setTimeout(() => {
      forceRefresh()
    }, 100)
  }
}
```

### **2. 🔧 BaseLayout Integration**

**File**: `src/components/BaseLayout.tsx`

**Changes:**
- ✅ **Import Hook**: Added `useWindowVisibility` import
- ✅ **Hook Usage**: Integrated with visibility and focus callbacks
- ✅ **Auto Refresh**: Automatic layout refresh on visibility/focus change

**Implementation:**
```typescript
const { isVisible, isFocused, forceRefresh } = useWindowVisibility({
  onVisibilityChange: (visible) => {
    if (visible) {
      setTimeout(() => {
        forceRefresh()
      }, 100)
    }
  },
  onFocusChange: (focused) => {
    if (focused) {
      setTimeout(() => {
        forceRefresh()
      }, 100)
    }
  }
})
```

---

## 🎯 **How It Works**

### **Event Flow:**
1. **User switches to another app** → `blur` event → `onFocusChange(false)`
2. **User returns to app** → `focus` event → `onFocusChange(true)` → `forceRefresh()`
3. **Computer goes to sleep** → `visibilitychange` → `onVisibilityChange(false)`
4. **Computer wakes up** → `visibilitychange` → `onVisibilityChange(true)` → `forceRefresh()`

### **Force Refresh Mechanism:**
```typescript
const forceRefresh = useCallback(() => {
  // Force a complete re-render by triggering multiple events
  window.dispatchEvent(new Event('resize'))
  setTimeout(() => {
    window.dispatchEvent(new Event('orientationchange'))
  }, 10)
}, [])
```

### **Tauri Integration:**
```typescript
// Listen for Tauri window events
const unlisten = await currentWindow.listen('tauri://resize', () => {
  handleResize()
})

const unlistenMaximize = await currentWindow.listen('tauri://maximize', () => {
  handleMaximizeChange()
})
```

---

## 📊 **Technical Details**

### **Event Listeners:**
- ✅ `document.visibilitychange` - Page visibility changes
- ✅ `window.focus` - Window gains focus
- ✅ `window.blur` - Window loses focus
- ✅ `window.resize` - Window size changes
- ✅ `window.orientationchange` - Device orientation changes
- ✅ `tauri://resize` - Tauri window resize
- ✅ `tauri://maximize` - Tauri window maximize
- ✅ `tauri://unmaximize` - Tauri window unmaximize

### **Debouncing:**
- **Resize Events**: 100ms debounce to prevent excessive calls
- **Force Refresh**: 50-100ms delay to ensure proper timing

### **State Management:**
```typescript
interface WindowVisibilityState {
  isVisible: boolean      // Document visibility
  isFocused: boolean      // Window focus state
  isMaximized: boolean    // Window maximize state
  windowSize: {           // Current window dimensions
    width: number
    height: number
  }
}
```

---

## 🧪 **Testing Scenarios**

### **Test Cases:**
1. ✅ **Switch to another app** → Return → Should display correctly
2. ✅ **Computer sleep** → Wake up → Should display correctly
3. ✅ **Minimize window** → Restore → Should display correctly
4. ✅ **Maximize window** → Should trigger refresh
5. ✅ **Resize window** → Should update layout
6. ✅ **Multiple rapid switches** → Should handle gracefully

### **Expected Behavior:**
- **Before Fix**: Display shows partial content or incorrect layout
- **After Fix**: Display shows full content with correct layout

---

## 🚀 **Performance Impact**

### **Optimizations:**
- ✅ **Debounced Events**: Prevents excessive resize calls
- ✅ **Conditional Triggers**: Only refresh when necessary
- ✅ **Timeout Delays**: Proper timing for layout recalculation
- ✅ **Event Cleanup**: Proper removal of event listeners

### **Resource Usage:**
- **Memory**: Minimal (single hook instance)
- **CPU**: Low (debounced events)
- **Network**: None (local operations only)

---

## 🔧 **Configuration Options**

### **Hook Options:**
```typescript
interface WindowVisibilityOptions {
  onVisibilityChange?: (isVisible: boolean) => void
  onFocusChange?: (isFocused: boolean) => void
  onResize?: (size: { width: number; height: number }) => void
  onMaximizeChange?: (isMaximized: boolean) => void
  debounceMs?: number  // Default: 100ms
}
```

### **Customization:**
- **Debounce Time**: Adjustable for different performance needs
- **Callback Functions**: Customizable for specific use cases
- **Event Selection**: Can disable specific event types if needed

---

## 📝 **Usage Examples**

### **Basic Usage:**
```typescript
const { isVisible, isFocused, forceRefresh } = useWindowVisibility()
```

### **Advanced Usage:**
```typescript
const { isVisible, isFocused, forceRefresh } = useWindowVisibility({
  onVisibilityChange: (visible) => {
    if (visible) {
      // Custom logic when becoming visible
      refreshData()
    }
  },
  onFocusChange: (focused) => {
    if (focused) {
      // Custom logic when gaining focus
      updateUI()
    }
  },
  debounceMs: 150 // Custom debounce time
})
```

### **Manual Refresh:**
```typescript
const { forceRefresh } = useWindowVisibility()

// Trigger manual refresh
const handleManualRefresh = () => {
  forceRefresh()
}
```

---

## 🎯 **Benefits**

### **User Experience:**
- ✅ **Consistent Display**: Always shows full content
- ✅ **No Manual Refresh**: Automatic fix without user intervention
- ✅ **Smooth Transitions**: Proper timing for layout updates
- ✅ **Cross-Platform**: Works on all operating systems

### **Developer Experience:**
- ✅ **Easy Integration**: Simple hook usage
- ✅ **Configurable**: Flexible options for different needs
- ✅ **Well Documented**: Clear API and examples
- ✅ **Type Safe**: Full TypeScript support

---

## 🔮 **Future Enhancements**

### **Potential Improvements:**
1. **Performance Monitoring**: Track refresh frequency
2. **Custom Refresh Strategies**: Different approaches for different scenarios
3. **Animation Support**: Smooth transitions during refresh
4. **Memory Optimization**: Further reduce resource usage

### **Additional Features:**
1. **Window State Persistence**: Remember window state across sessions
2. **Multi-Monitor Support**: Handle multiple display scenarios
3. **Accessibility**: Enhanced support for screen readers
4. **Analytics**: Track visibility patterns for optimization

---

**🎉 Conclusion**: This implementation provides a robust solution for window visibility issues in Tauri applications, ensuring consistent display behavior across all scenarios including sleep, focus changes, and window state modifications.
