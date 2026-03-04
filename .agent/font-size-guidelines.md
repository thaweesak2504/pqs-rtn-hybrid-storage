# Font Size Guidelines for PQS Application

## 🎯 Minimum Font Size Policy

### **Core Principles**
- **Readability First**: ข้อความหลักต้องอ่านง่าย ไม่เล็กกว่า 12px
- **Visual Hierarchy**: ใช้ขนาดฟอนต์สร้างลำดับความสำคัญ
- **Consistency**: ใช้ขนาดที่สม่ำเสมอกันทั่วแอปพลิเคชัน

### **📏 Minimum Font Size Rules**

| ประเภทข้อความ | ขนาดขั้นต่ำ | คำแนะนำ | ตัวอย่าง |
|---|---|---|---|
| **ข้อความหลัก** | `text-xs` (12px) | ✅ ขนาดที่อ่านง่ายที่สุด | Labels, Content |
| **ข้อความหนา** | `text-sm` (14px) | ✅ Bold ต้องใหญ่กว่าปกติ | Headers, Important |
| **ตัวพิมพ์ใหญ่** | `text-sm` (14px) | ✅ Uppercase ต้องใหญ่ขึ้น | Headers, Badges |
| **ข้อความรอง** | `text-xs` (12px) | ✅ ใช้ `font-medium` | Secondary info |
| **Icons/Symbols** | `text-[10px]` | ✅ เล็กได้ถ้าเป็น icon | ✓, ⚠, numbers |

### **🚫 ห้ามใช้**
- ❌ `text-[8px]` - เล็กเกินไป อ่านไม่ได้
- ❌ `text-[9px]` - เล็กไป อ่านยาก
- ❌ `text-[10px]` + `font-bold` - เล็กและหนาเกินไป
- ❌ `text-xs` + `font-bold` + `uppercase` - เล็กเกินไปสำหรับ uppercase

## 🎨 Tailwind CSS Font Size Reference

| Class | Size | Pixel | Use Case |
|---|---|---|---|
| `text-xs` | 0.75rem | 12px | **Minimum for text** |
| `text-sm` | 0.875rem | 14px | **Minimum for bold/uppercase** |
| `text-base` | 1rem | 16px | Normal body text |
| `text-lg` | 1.125rem | 18px | Large text |
| `text-xl` | 1.25rem | 20px | Headers |
| `text-2xl` | 1.5rem | 24px | Main headers |

## 📋 Implementation Examples

### **✅ Good Examples**
```tsx
// ข้อความหลัก - ขนาดขั้นต่ำ
<span className="text-xs">รายการคำถามย่อย</span>

// ข้อความหนา - ต้องใหญ่กว่า
<span className="text-sm font-bold">สำคัญ</span>

// Uppercase - ต้องใหญ่กว่า
<span className="text-sm font-bold uppercase">HEADER</span>

// Secondary labels - ขนาดขั้นต่ำแต่น้ำหนักปกติ
<span className="text-xs font-medium">รหัส</span>

// Icons - เล็กได้
<span className="text-[10px]">✓</span>
```

### **❌ Bad Examples**
```tsx
// เล็กเกินไป
<span className="text-[8px]">อ่านไม่ได้</span>

// เล็กและหนาเกินไป
<span className="text-[10px] font-bold">ดูไม่ดี</span>

// เล็กและ uppercase เกินไป
<span className="text-xs font-bold uppercase">BAD</span>
```

## 🔧 Real-World Applications

### **Case Study: Sub-Question Lists (QuestionTreeNode.tsx)**

**Before:**
```tsx
// ปัญหา: ใช้ขนาดต่างกัน
<span className="text-sm">ข้อความ</span>  // 14px
<span className="text-xs">ข้อความ</span>  // 12px
```

**After:**
```tsx
// แก้ไข: ทำให้สม่ำเสมอ
<span className="text-xs">ข้อความ</span>  // 12px ทั้งหมด
```

### **Case Study: Inline Checkboxes (QuestionDisplayCard.tsx)**

**Before:**
```tsx
// ปัญหา: Prefix เล็กไป
<span className="font-bold">ก.</span>  // inherit ≈ 12px
```

**After:**
```tsx
// แก้ไข: Prefix ใหญ่ขึ้นแต่ไม่หนา
<span className="text-sm font-normal">ก.</span>  // 14px normal
```

## 🎯 Visual Hierarchy Best Practices

### **Header Levels**
```tsx
// H1 - Main Header
<h1 className="text-2xl font-bold">หัวข้อหลัก</h1>

// H2 - Section Header  
<h2 className="text-xl font-bold">หัวข้อรอง</h2>

// H3 - Sub-section
<h3 className="text-lg font-bold">หัวข้อย่อย</h3>

// H4 - Component Header
<h4 className="text-sm font-bold uppercase">คอมโพเนนต์</h4>

// Labels
<label className="text-xs font-medium">ป้ายชื่อ</label>
```

### **Content Hierarchy**
```tsx
// Primary Content
<p className="text-base">เนื้อหาหลัก</p>

// Secondary Content  
<p className="text-sm">เนื้อหารอง</p>

// Meta Information
<span className="text-xs">ข้อมูลเพิ่มเติม</span>

// Helper Text
<small className="text-xs text-slate-500">คำแนะนำ</small>
```

## 📱 Accessibility Considerations

### **WCAG Guidelines**
- **AA Standard**: ข้อความต้องมีขนาดอย่างน้อย 14px หรือ 18.66px ถ้าเป็นตัวหนา
- **AAA Standard**: ข้อความต้องมีขนาดอย่างน้อย 16px หรือ 21.33px ถ้าเป็นตัวหนา

### **Our Policy (AA Compliant)**
- **Normal text**: 12px+ (text-xs)
- **Bold text**: 14px+ (text-sm)  
- **High contrast**: ใช้สีที่มี contrast ratio ≥ 4.5:1

## 🔍 Code Review Checklist

เมื่อ review code ให้ตรวจสอบ:

- [ ] ไม่มี `text-[8px]` หรือ `text-[9px]` สำหรับข้อความ
- [ ] `text-[10px]` ใช้เฉพาะกับ icons/symbols
- [ ] `text-xs` + `font-bold` ไม่ใช่กับ uppercase
- [ ] `text-sm` ใช้สำหรับ bold/uppercase text
- [ ] มี visual hierarchy ที่ชัดเจน
- [ยังไม่ได้] ขนาดฟอนต์สม่ำเสมอกันใน component เดียวกัน

## 🚀 Quick Reference

```tsx
// ✅ ใช้นี้เป็นหลัก
text-xs    // 12px - ขนาดขั้นต่ำสำหรับข้อความ
text-sm    // 14px - ขนาดขั้นต่ำสำหรับ bold/uppercase  
text-base  // 16px - ขนาดปกติ
text-lg    // 18px - ขนาดใหญ่

// ✅ ใช้ร่วมกับ font weight
text-xs font-medium     // 12px - secondary labels
text-sm font-bold       // 14px - important text
text-base font-normal   // 16px - body text

// ❌ หลีกเหลี่ยง
text-[8px]              // เล็กเกินไป
text-[9px]              // เล็กไป
text-xs font-bold       // เล็กเกินไปสำหรับ bold
```

---

**📝 Note**: Guidelines นี้สร้างจากประสบการณ์จริงในโปรเจค PQS และการปรับปรุง UI/UX ครั้งล่าสุด (Mar 2026)
