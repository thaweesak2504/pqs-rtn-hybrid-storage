---
description: มาตรฐานการพัฒนา Frontend UI และการจัดการ Dark/Light Mode
---
# Skill: Frontend UI & Design Standards

มาตรฐานการพัฒนา User Interface เพื่อให้ระบบมีความสม่ำเสมอ (Consistency) รองรับ Dark Mode อย่างสมบูรณ์ และดูเป็นระเบียบร้อย

## 1. Core Principles
- **Use Shared Components**: ห้ามสร้าง Input/Button เอง ให้ใช้ Component จาก `src/components/ui/` เท่านั้น
- **High Contrast Dark Mode**: เน้นความชัดเจนใน Dark Mode โดยใช้ค่าสีที่สว่างพอ (เช่น `text-gray-400` แทนที่จะเป็นสีจางๆ จนมองไม่เห็น)
- **Explicit Colors**: ในจุดที่ Theme Variable แสดงผลไม่ชัดเจน ให้ใช้ Tailwind Class ระบุสีตรงๆ

## 2. Shared Components Usage
ต้องเรียกใช้ Components เหล่านี้แทน HTML Tags ปกติ:

### ปุ่ม (Button)
ไฟล์เป้าหมาย: `src/components/ui/Button.tsx`
```tsx
import Button from '../ui/Button'

// ✅ Correct
<Button variant="primary" icon={<Save />} onClick={handleSubmit}>
  Save Changes
</Button>

// ❌ Incorrect
<button className="bg-blue-600 text-white...">Save</button>
```

### ฟอร์มและการกรอกข้อมูล (Forms)
ไฟล์เป้าหมาย: `src/components/ui/Form.tsx`
ประกอบด้วย `FormInput`, `FormSelect`, `FormTextarea`, `FormGroup`

```tsx
import { FormInput, FormGroup } from '../ui/Form'

<FormGroup>
  <FormInput
    name="username"
    label="Username"
    placeholder="Enter username"
    required
    value={form.username}
    onChange={handleChange}
  />
</FormGroup>
```

> **Note**: Component เหล่านี้ถูกปรับจูนเรื่อง **Border** และ **Color** ให้รองรับทั้ง Light/Dark Mode เรียบร้อยแล้ว (ใช้ `border-gray-300 dark:border-gray-600`)

### การจัด Layout
- **Container**: ใช้ `src/components/ui/Container.tsx` เพื่อคุมความกว้างและ Padding
- **Grid/Flex**: ใช้ Tailwind Grid/Flex ปกติ

## 3. Styling Guidelines

### Border & Separators
ปัญหาที่พบบ่อยคือมองไม่เห็นเส้นขอบใน Dark Mode ให้ใช้:
- **Light**: `border-gray-200` หรือ `border-gray-300`
- **Dark**: `dark:border-gray-600` หรือ `dark:border-gray-700` (ห้ามใช้สีที่จางกว่า 700)

### Text Colors
- **Header/Primary**: `text-gray-900` / `dark:text-gray-100`
- **Secondary/Description**: `text-gray-600` / `dark:text-gray-400` (อย่าใช้ 500 หรือต่ำกว่าใน Dark Mode เพราะจะกลืนกับพื้นหลัง)
- **Inactive/Disabled**: `opacity-50`

### Hover States
ต้องระบุ Hover ให้ครบทั้งสองโหมด:
- `hover:bg-gray-100 dark:hover:bg-gray-800` (สำหรับ List Item)
- `hover:text-blue-600 dark:hover:text-blue-400` (สำหรับ Link/Action)

## 4. Checklist ก่อนส่งงาน UI
- [ ] ทดสอบเปลี่ยนเป็น **Dark Mode** แล้วรายละเอียด (Border, Text) ยังเห็นชัดหรือไม่?
- [ ] ปุ่มกดต่างๆ (Button) ใช้ Component กลาง หรือไม่?
- [ ] Input Form ต่างๆ ใช้ `FormInput` / `FormSelect` หรือไม่?
- [ ] เมื่อ Hover แล้วสีเปลี่ยนชัดเจนหรือไม่?
