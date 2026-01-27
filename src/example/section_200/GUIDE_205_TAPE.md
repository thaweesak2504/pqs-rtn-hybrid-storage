# คู่มือการสร้างหน้า ๒๐๕ ระบบจำลองเทป (Tape Emulator)

คู่มือนี้จะช่วยให้คุณสามารถสร้างหน้า `205TapeEmulator.tsx` โดยใช้ `204Elx.tsx` เป็นต้นแบบ เนื่องจากมีโครงสร้างและ Logic การทำงานที่เหมือนกัน รวมถึงรองรับ Dark Mode เรียบร้อยแล้ว

---

## ขั้นตอนที่ ๑: สร้างไฟล์ข้อมูล (`tapeEmulatorData.ts`)

สร้างไฟล์ `src/example/section_200/tapeEmulatorData.ts` เพื่อเก็บข้อมูลคำถามและคำตอบ

### โครงสร้างพื้นฐาน:
```typescript
import { UINode, NodeType, DocumentMeta } from './types';

export const documentMeta: DocumentMeta = {
  id: '205',
  section_number: '๒๐๕',
  title: 'ระบบจำลองเทป (Tape Emulator)',
  references: [
    'NAVSEA OP4154 CIWS Mk.15 Mods 1-6 (Phalanx) Vol.1 Pt.1,2',
    'NAVSEA OP4154 CIWS Mk.15 Mods 1-6 (Phalanx) Vol.2',
    'SW221-JO-MMO-010 thru 110, CIWS Mk.15 Mods 11-14'
  ]
};

export const tapeEmulatorQuestions: UINode[] = [
  {
    id: '205.1',
    type: NodeType.SECTION,
    q: 'หน้าที่',
    children: [
      {
        id: '205.1.1',
        type: NodeType.QUESTION,
        q: 'ระบบนี้ทําหน้าที่อะไร',
        answerCheckboxes: [
          { checked: true, text: 'ใช้สำหรับโหลดและบันทึกข้อมูลโปรแกรม (Program Loading and Recording)' }
        ],
        children: []
      }
    ]
  },
  // เพิ่มหัวข้ออื่นๆ ต่อได้ที่นี่
];
```

---

## ขั้นตอนที่ ๒: สร้างไฟล์ Component (`205TapeEmulator.tsx`)

สร้างไฟล์ `src/example/section_200/205TapeEmulator.tsx` โดยการคัดลอก Code จาก `204Elx.tsx`

### วิธีการสร้าง:
1.  คัดลอก Code ทั้งหมดจาก `204Elx.tsx`
2.  วางลงใน `205TapeEmulator.tsx`
3.  แก้ไขจุดที่ Import ข้อมูล:
    ```typescript
    // เปลี่ยนจาก elxData เป็น tapeEmulatorData
    import { documentMeta, tapeEmulatorQuestions } from './tapeEmulatorData';
    ```
4.  แก้ไขชื่อ Component และตัวแปรคำถาม:
    ```typescript
    const TapeEmulator205: React.FC = () => {
      // ...
      const questions = tapeEmulatorQuestions; // เปลี่ยนตรงนี้
      // ...
    }
    // ...
    export default TapeEmulator205;
    ```
5.  แก้ไขเลขหน้าในส่วน Render (ด้านล่างสุด):
    ```typescript
    // เปลี่ยนเลข ๒๐๔ เป็น ๒๐๕
    {tapeEmulatorQuestions.map((item, index) => renderQuestion(item, index, 0, "๒๐๕"))}
    ```

---

## ขั้นตอนที่ ๓: เชื่อมต่อหน้าจอใน `VisitorPage.tsx`

ไปที่ไฟล์ `src/components/pages/VisitorPage.tsx` เพื่อเพิ่มหน้าใหม่ในเมนู

1.  **Import Component:**
    ```typescript
    import TapeEmulator205 from '../../example/section_200/205TapeEmulator'
    ```

2.  **เพิ่ม State:**
    ```typescript
    // เพิ่ม 'tapeEmulator205' เข้าไปใน Type
    const [activeTab, setActiveTab] = useState<... | 'tapeEmulator205'>('home')
    ```

3.  **เพิ่ม Case:**
    ```typescript
    case 'tapeEmulator205':
      return <TapeEmulator205 />
    ```

4.  **เพิ่มปุ่มในเมนู:**
    ```tsx
    <button
      onClick={() => setActiveTab('tapeEmulator205')}
      className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'tapeEmulator205'
        ? 'bg-github-bg-active text-github-text-primary'
        : 'text-github-text-secondary hover:bg-github-bg-hover hover:text-github-text-primary'
        }`}
    >
      <BookOpen className="mr-3 h-5 w-5" />
      205 Tape Emulator
    </button>
    ```

---

## ✅ ตรวจสอบความถูกต้อง
*   เช็คว่าหน้า ๒๐๕ แสดงผลหัวข้อและเนื้อหาถูกต้องตามที่ใส่ใน `tapeEmulatorData.ts`
*   เช็คว่า Dark Mode ทำงานถูกต้อง (พื้นหลังเข้ม, ตัวหนังสือขาว)
