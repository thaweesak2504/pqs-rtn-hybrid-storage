import { UINode, NodeType, DocumentMeta } from './types';

export const documentMeta: DocumentMeta = {
  id: '205',
  section_number: '๒๐๕',
  title: 'ระบบโหลดโปรแกรมการทํางาน Solid State Tape Emulator (SSTE)',
  references: [
    'Technical Manual Solid State Tape Emulator (SSTE)',
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
          { checked: true, text: 'เก็บโปรแกรมการทํางานของระบบ และข้อมูลการทํางาน' }
        ],
        children: []
      }
    ]
  },
  {
    id: '205.2',
    type: NodeType.SECTION,
    q: 'ส่วนประกอบและชิ้นส่วนในส่วนประกอบของระบบ',
    description: 'อ้างถึงเอกสารประกอบระบบ หรือตัวอุปกรณ์ เพื่อหาส่วนประกอบและชิ้นส่วนในส่วนประกอบ ดังต่อไปนี้ แล้วตอบคําถามที่กําหนด',
    selectedSubQuestions: [
      'มีหน้าที่อะไร',
      'ใช้พลังงานหรือกําลังงานอะไรและได้รับมาจากไหน',
      'เมื่อขัดข้องหรือทํางานผิดปกติ มีอะไรเป็นสิ่งบอกเหตุ',
      'สีของไฟแสดงเริ่มต้นและเมื่อเปลี่ยนเป็นสีอะไร',
    ],
    children: [
      {
        id: '205.2.1',
        type: NodeType.QUESTION,
        q: 'SSTE Assembly',
        checkboxes: [true, true, true, false],
        optionsHeader: true,
        optionsCount: 4,
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'เก็บโปรแกรมการทํางานของระบบ เพื่อโหลดเข้าสู่ระบบ และเก็บข้อมูลสถานะ ของระบบต่างๆ ใช้ทดแทนการโหลดจากตลับเทปโปรแกรมเดิม' },
          { checked: true, label: 'ข.', text: 'ไฟฟ้าเรือ 115V.ac 60Hz Single Phase' },
          { checked: true, label: 'ค.', text: 'ไฟแสดงสถานะ "Error" จะติดสว่างสีแดง' },
        ],
        children: []
      },
      {
        id: '205.2.2',
        type: NodeType.QUESTION,
        q: 'ไฟแสดงสถานะ "SSTE Status Indicator"',
        optionsHeader: true,
        optionsCount: 4,
        checkboxes: [true, false, false, false],
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'แสดงสถานการทํางานของ SSTE' },
        ],
        children: [
          {
            id: '205.2.2.1',
            type: NodeType.SUB_QUESTION,
            q: 'ไฟแสดงสถานะ "Status Go"',
            checkboxes: [true, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'แสดงสถานการทํางานปกติ' },
              { checked: true, label: 'ง.', text: 'สีเขียว' },
            ],
            children: []
          },
          {
            id: '205.2.2.2',
            type: NodeType.SUB_QUESTION,
            q: 'ไฟแสดงสถานะ "Error"',
            checkboxes: [true, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'แสดงการทํางานผิดปกติ มีข้อขัดข้องเกิดขึ้น' },
              { checked: true, label: 'ง.', text: 'สีแดง' },
            ],
            children: []
          },
          {
            id: '205.2.2.3',
            type: NodeType.SUB_QUESTION,
            q: 'ไฟแสดงสถานะ "Busy"',
            checkboxes: [true, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'กระพริบเมื่อกําลังมีการถ่ายโอนข้อมูลระหว่าง SSTE กับระบบ CIWS' },
              { checked: true, label: 'ง.', text: 'กระพริบสีเขียว' },
            ],
            children: []
          },
        ],
      },
      {
        id: '205.2.3',
        type: NodeType.QUESTION,
        q: 'สวิตช์โหลดโปรแกรม "Program Load"',
        optionsHeader: true,
        optionsCount: 4,
        checkboxes: [true, false, false, false],
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'กดสวิตช์เริ่มต้นโหลดโปรแกรมจาก SSTE' },
        ],
        children: []
      },
      {
        id: '205.2.4',
        type: NodeType.QUESTION,
        q: 'ช่องเชื่อมต่อกับระบบ "System Interface Connector"',
        optionsHeader: true,
        optionsCount: 4,
        checkboxes: [true, false, false, false],
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'เชื่อมต่อสายสัญญาณข้อมูลระหว่าง SSTE กับระบบ CIWS' },
        ],
        children: []
      },
      {
        id: '205.2.5',
        type: NodeType.QUESTION,
        q: 'ช่องเชื่อมต่อ RS-232 "RS -232 Interface Connector"',
        optionsHeader: true,
        optionsCount: 4,
        checkboxes: [true, false, false, false],
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'เชื่อมต่อกับคอมพิวเตอร์ภายนอกเพื่อโหลดโปรแกรมให้กับ SSTE' },
        ],
        children: []
      },
      {
        id: '205.2.6',
        type: NodeType.QUESTION,
        q: 'แผ่นโปรแกรม CD',
        optionsHeader: true,
        optionsCount: 4,
        checkboxes: [true, false, false, false],
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'บรรจุโปรแกรมการทํางานของระบบ CIWS ที่ติดตั้งใน ทร. ไทย เท่านั้น' },
        ],
        children: []
      }
    ]
  },
  {
    id: '205.3',
    type: NodeType.SECTION,
    q: 'หลักการทํางาน',
    children: [
      {
        id: '205.3.1',
        type: NodeType.QUESTION,
        q: 'ส่วนประกอบต่างๆ ทํางานร่วมกันในระบบอย่างไร',
        answerCheckboxes: [
          { checked: true, text: 'ภายใน SSTE จะเก็บโปรแกรมการทํางานของระบบ CIWS ต้องโหลดโปรแกรมให้ ระบบ CIWS ก่อน' }
        ],
        children: []
      },
      {
        id: '205.3.2',
        type: NodeType.QUESTION,
        q: 'เมื่อระบบขัดข้องหรือทํางานผิดปกติ มีอะไรเป็นสิ่งบอกเหตุ',
        answerCheckboxes: [
          { checked: true, text: 'ไฟแสดงสถานะ "Error" จะติดสว่างสีแดง หรือไม่มีการแสดงของไฟแสดงต่างๆ เลย' }
        ],
        children: []
      }
    ]
  },
  {
    id: '205.4',
    type: NodeType.SECTION,
    q: 'ค่าทํางานปกติ ค่าสูงสุด ต่ำสุด ของการทํางาน',
    description: '(ไม่ต้องอธิบาย)',
    children: []
  },
  {
    id: '205.5',
    type: NodeType.SECTION,
    q: 'การเชื่อมต่อระบบ',
    children: [
      {
        id: '205.5.1',
        type: NodeType.QUESTION,
        q: 'SSTE ทํางานเชื่อมต่อกับคอมพิวเตอร์ของระบบอย่างไร',
        answerCheckboxes: [
          { checked: true, text: 'ด้วยสายเชื่อมตอสัญญาณข้อมูล SSTE จะถ่ายโอนโปรแกรมที่บรรจุอยู่ภายในไปเก็บไว้ ในคอมพิวเตอร์ของระบบ CIWS' },
        ],
        children: []
      },
      {
        id: '205.5.2',
        type: NodeType.QUESTION,
        q: 'SSTE เชื่อมต่อกับคอมพิวเตอร์ภายนอกได้อย่างไร',
        answerCheckboxes: [
          { checked: true, text: 'ด้วยสายเชื่อมต่อข้อมูลแบบ RS-232 ทําให้สามารถใช้คอมพิวเตอร์ทั่วไปที่มีหัวต่อแบบ นี้โหลดโปรแกรมจากแผ่น CD เข้าสู่ SSTE ได้' },
        ],
        children: []
      },
    ]
  },
  {
    id: '205.6',
    type: NodeType.SECTION,
    q: 'ข้อระมัดระวังอันตราย',
    children: [
      {
        id: '205.6.1',
        type: NodeType.QUESTION,
        q: 'มีข้อระมัดระวังอันตรายอะไรบ้างในการใช้งาน SSTE',
        answerCheckboxes: [
          { checked: true, text: 'อุปกรณ์อิเล็กทรอนิกส์ภายในของ SSTE เป็นประเภทที่ไวต่อผลกระทบของไฟฟ้าสถิตย์มาก (ElectroStatic Discharge Sensitive:ESDS) การจับต้องอุปกรณ์ดังกล่าวต้องทำอย่างระมัดระวังและเป็นไปตามมาตรฐาน MIL-STD-1686' }
        ],
        children: []
      },
    ]
  },
];
