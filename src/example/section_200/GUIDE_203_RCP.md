# คู่มือการสร้างหน้า ๒๐๓ ระบบควบคุม Remote Control Panel (RCP)

คู่มือนี้จะช่วยให้คุณสามารถสร้างหน้า `203Rcp.tsx` จากไฟล์ต้นแบบ `203_rcp.html` ได้ด้วยตนเอง โดยยึดตามรูปแบบของหน้า ๒๐๑ และ ๒๐๒ ที่ได้ทำสำเร็จไปแล้ว

---

## ขั้นตอนที่ ๑: สร้างไฟล์ข้อมูล (`rcpData.ts`)

สร้างไฟล์ `src/example/section_200/rcpData.ts` เพื่อเก็บข้อมูลคำถามและคำตอบ โดยโครงสร้างข้อมูลจะเป็นแบบ Tree ตามที่กำหนดไว้ใน `types.ts`

### โครงสร้างพื้นฐาน:
```typescript
import { UINode, NodeType, DocumentMeta } from './types';

export const documentMeta: DocumentMeta = {
  id: '203',
  section_number: '๒๐๓',
  title: 'ระบบควบคุม Remote Control Panel (RCP)',
  references: [
    'NAVSEA OP4154 CIWS Mk.15 Mods 1-6 (Phalanx) Vol.1 Pt.1,2',
    'NAVSEA OP4154 CIWS Mk.15 Mods 1-6 (Phalanx) Vol.2',
    'SW221-JO-MMO-010 thru 110, CIWS Mk.15 Mods 11-14'
  ]
};

export const rcpQuestions: UINode[] = [
  {
    id: '203.1',
    type: NodeType.QUESTION,
    q: 'หน้าที่',
    isHeader: true,
    children: [
      {
        id: '203.1.1',
        type: NodeType.QUESTION,
        q: 'ระบบนี้ทำหน้าที่อะไร',
        answerCheckboxes: [
          { checked: true, text: 'ใช้สำหรับควบคุมและบอกสถานะของระบบ CIWS' }
        ],
        children: []
      }
    ]
  },
  {
    id: '203.2',
    type: NodeType.QUESTION,
    q: 'ส่วนประกอบและชิ้นส่วนในส่วนประกอบของระบบ',
    isHeader: true,
    description: 'อ้างถึงเอกสารประกอบระบบ หรือตัวอุปกรณ์ เพื่อหาส่วนประกอบและชิ้นส่วนในส่วนประกอบ ดังต่อไปนี้ แล้วตอบคำถามที่กำหนด',
    descriptionList: [
      'มีหน้าที่อะไร',
      'ตำแหน่งที่ติดตั้งอยู่ที่ไหน',
      'ใช้พลังงานหรือกำลังงานอะไรและได้รับมาจากไหน',
      // ... เพิ่มให้ครบตาม HTML
    ],
    optionsHeader: true,
    children: [
      {
        id: '203.2.1',
        type: NodeType.QUESTION,
        q: 'สวิตช์ปุ่มกดไฟแสดง "Battle Short"',
        checkboxes: [true, true, false, false, true, false, false, true], // ก. ข. ค. ง. จ. ฉ. ช. ซ.
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'เมื่อกดปุ่มนี้จะส่งสัญญาณผ่าน LCP ไปยัง PSCG และ WCG เพื่อข้ามสัญญาณ Interlock ต่างๆ และไฟติดสีแดง' },
          { checked: true, label: 'ข.', text: 'อยู่บน RCP' },
          { checked: true, label: 'จ.', text: 'เป็นปุ่มที่มีฝาครอบ' },
          { checked: true, label: 'ซ.', text: 'แดง / แดง' }
        ],
        children: []
      },
      // ... เพิ่มข้อต่อๆ ไป
    ]
  }
];
```

---

## ขั้นตอนที่ ๒: สร้างไฟล์ Component (`203Rcp.tsx`)

สร้างไฟล์ `src/example/section_200/203Rcp.tsx` โดยการคัดลอก Logic จาก `201RadarWeapon.tsx` และเปลี่ยนเพียงการ Import ข้อมูล

### วิธีการสร้าง:
1. คัดลอก Code ทั้งหมดจาก `201RadarWeapon.tsx`
2. วางลงใน `203Rcp.tsx`
3. แก้ไขจุดที่ Import ข้อมูล:
   ```typescript
   // จากเดิม
   // import { documentMeta, radarQuestions } from './radarData';
   // const questions = radarQuestions;
   
   // เปลี่ยนเป็น
   import { documentMeta, rcpQuestions } from './rcpData';
   const questions = rcpQuestions;
   ```
4. เปลี่ยนชื่อ Component (Optional แต่แนะนำ):
   ```typescript
   const Rcp203: React.FC = () => { ... }
   // อยู่ล่างสุด
   export default Rcp203;
   ```
5. ในส่วนการ Render ท้ายไฟล์ ให้เปลี่ยนค่าเริ่มต้นของ Path:
   ```typescript
   // จากเดิม
   {questions.map((item, index) => renderQuestion(item, index, 0, "๒๐๑"))}
   
   // เปลี่ยนเป็น (เปล่ี่ยนแล้ว)
   {questions.map((item, index) => renderQuestion(item, index, 0, "๒๐๓"))}
   ```

---

## ขั้นตอนที่ ๓: เชื่อมต่อหน้าจอใน `VisitorPage.tsx`

ไปที่ไฟล์ `src/components/pages/VisitorPage.tsx` เพื่อเพิ่มหน้าใหม่ในเมนู

### ๑. เพิ่มการ Import:
```typescript
import Rcp203 from '../../example/section_200/203Rcp'
```

### ๒. เพิ่มสถานะ `activeTab`:
```typescript
const [activeTab, setActiveTab] = useState<... | 'rcp203'>('home')
```

### ๓. เพิ่มเงื่อนไขใน `renderContent`:
```typescript
case 'rcp203':
  return <Rcp203 />
```

### ๔. เพิ่มปุ่มในเมนู (Aside):
```tsx
<button
  onClick={() => setActiveTab('rcp203')}
  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'rcp203'
    ? 'bg-github-bg-active text-github-text-primary'
    : 'text-github-text-secondary hover:bg-github-bg-hover hover:text-github-text-primary'
    }`}
>
  <BookOpen className="mr-3 h-5 w-5" />
  203 Remote Panel (RCP)
</button>
```

---

## 💡 เคล็ดลับเพิ่มเติม

*   **Checkbox Group**: ในหัวข้อ ๒๐๓.๒ จะมี Checkbox ๘ ตัว (ก. ถึง ซ.) ให้ใส่ใน Array `checkboxes` ในไฟล์ `rcpData.ts` ให้ครบ ๘ ค่า เช่น `[true, true, false, false, true, false, false, true]`
*   **Thai Numerals**: ฟังก์ชัน `toThaiNumber` ใน Component จะจัดการเปลี่ยนเลข 1, 2, 3 เป็น ๑, ๒, ๓ ให้โดยอัตโนมัติ
*   **Nesting**: หากมีหัวข้อย่อย (เช่น ๒๐๓.๒.๗) ให้ใส่ข้อมูลลงใน Array `children` ของข้อนั้นๆ
*   **Formatting**: หากต้องการขึ้นบรรทัดใหม่ในคำอธิบาย ให้ใช้ `\n` หรือ Template String แบบปกติได้เลย

---
🎯 **สำเร็จแล้ว!** หากทำตามขั้นตอนนี้ คุณจะได้หน้า RCP ที่สวยงามและทำงานเหมือนหน้าก่อนหน้าทุกประการ
