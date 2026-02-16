---
description: มาตรฐาน UI และ Theme ของโปรเจกต์ (Color Scheme, Tailwind)
---

# Skill: UI Standards

รวบรวมมาตรฐานการออกแบบเพื่อให้หน้าจอทั้งหมดมีความสวยงามและสม่ำเสมอ

## 1. Color Palette (Tailwind)

เราเน้น Clean, Modern Look รองรับ Dark Mode

### Backgrounds
- **Light Mode**: `bg-white` (Main), `bg-gray-50` (Page/Body)
- **Dark Mode**: `dark:bg-gray-900` (Page/Body), `dark:bg-gray-800` (Cards/Containers)

### Text Colors
- **Headings**: `text-gray-900` (Light), `dark:text-gray-100` (Dark)
- **Body Text**: `text-gray-700` (Light), `dark:text-gray-300` (Dark)
- **Muted/Secondary**: `text-gray-500` (Light), `dark:text-gray-400` (Dark)

### Accents & Buttons
- **Blue (Primary)**: `text-blue-600`, `bg-blue-600`, `hover:bg-blue-700` (Buttons/Links)
- **Red (Question Status)**: `text-red-600`, `focus:ring-red-500` (ใช้กับ Checkbox หน้าคำถาม)
- **Green (Answer Status)**: `accent-green-600` (ใช้กับ Checkbox ในเฉลยคำตอบ)

## 2. Common Components

### Cards (Container)
ใช้สำหรับครอบเนื้อหาหลักของหน้า
```tsx
<div className="p-4 mx-auto max-w-4xl bg-white dark:bg-gray-800 rounded-lg shadow-sm">
  {/* Content */}
</div>
```

### Action Buttons
ปุ่มกดทั่วไป (เช่น แสดง/ซ่อนคำตอบ)
```tsx
<button className="px-4 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors">
  Click Me
</button>
```

### Checkboxes (Read-only)

**แบบที่ 1: หน้าคำถาม (Question Checkbox)** -> ใช้สี **แดง (Red)**
```tsx
<input
  type="checkbox"
  checked={isChecked}
  readOnly
  className="w-[0.7em] h-[0.7em] text-red-600 rounded focus:ring-red-500"
/>
```

**แบบที่ 2: ในเฉลย (Answer Checkbox)** -> ใช้สี **เขียว (Green)**
```tsx
<input
  type="checkbox"
  checked={isChecked}
  readOnly
  className="w-[0.7em] h-[0.7em] mt-2.5 accent-green-600"
/>
```

## 3. Typography
- **Thai Font**: ตรวจสอบให้แน่ใจว่าโปรเจกต์โหลด Font ไทยแล้ว (ปกติจัดการที่ `index.css` หรือ `index.html`)
- **Indentation**: ใช้ `indent-6` สำหรับย่อหน้า และ `ml-[Xch]` สำหรับการจัด Indent แบบละเอียดของ List

## 4. Writing & Wording Standard
มาตรฐานการเขียนและเลือกใช้คำ เพื่อความเป็นมืออาชีพและลดความขัดแย้งของ Creator ในการใช้ภาษา:

### Tone & Style
- **Formal & Technical**: ใช้ภาษาทางการ เชิงเทคนิคแบบวิศวกรรม
- **Concise**: กระชับ เน้นใจความสำคัญ ตัดคำฟุ่มเฟือย
- **Functionality-Focused**: เน้นอธิบาย "หน้าที่" และ "การทำงาน" ของระบบมากกว่าการบรรยาย

### Do & Don't
- **Do**: "ทำหน้าที่..." "ใช้สำหรับ..." "ส่วนควบคุม..."
- **Don't**: ใช้ภาษาพูด, คำขยายที่เน้นอารมณ์, หรือประโยคที่ยาวเกินความจำเป็น

### ตัวอย่างเปรียบเทียบ
| เดิม (Generic) | ใหม่ (Engineering Standard) | เหตุผล |
| :--- | :--- | :--- |
| "มีหน้าที่ควบคุมและแสดงสถานะต่างๆ ของระบบ" | "**ส่วนควบคุมและแสดงค่าสถานะระบบ**" | กระชับ, ตรงฟังก์ชัน |
| "เอาไว้สำหรับกดเพื่อเริ่มการทำงาน" | "**ปุ่มเริ่มการทำงาน**" | ลดคำฟุ่มเฟือย |
