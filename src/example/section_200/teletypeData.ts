import { UINode, NodeType, DocumentMeta } from './types';

export const documentMeta: DocumentMeta = {
  id: '206',
  section_number: '๒๐๖',
  title: 'ระบบเครื่องพิมพ์ Teletype (KSR 43) System', // Placeholder title, user can update
  references: [
    'NAVSEA OP4154 Close In Weapon System Mk.15 Mods 1-6 (Phalanx) Vol.2',
    'Teletype Corporation How to Operate Manual 367',
  ]
};

export const teletypeQuestions: UINode[] = [
  {
    id: '206.1',
    type: NodeType.SECTION,
    q: 'หน้าที่',
    children: [
      {
        id: '206.1.1',
        type: NodeType.QUESTION,
        q: 'ระบบนี้ทําหน้าที่อะไร',
        answerCheckboxes: [
          { checked: true, text: 'เพื่อติดต่อกับคอมพิวเตอร์โดยการป้อนข้อมูลเข้าและแสดงผลข้อมูลโดยการพิมพ์ข้อมูลออกมาเพื่อดูข้อมูล' } // Placeholder
        ],
        children: []
      }
    ]
  },
  {
    id: '206.2',
    type: NodeType.SECTION,
    q: 'ส่วนประกอบและชิ้นส่วนในส่วนประกอบของระบบ',
    description: 'อ้างถึงเอกสารประกอบระบบ หรือตัวอุปกรณ์ เพื่อหาส่วนประกอบและชิ้นส่วนในส่วนประกอบ ดังต่อไปนี้ แล้วตอบคําถามที่กําหนด',
    selectedSubQuestions: [
      'มีหน้าที่อะไร',
      'ตําแหน่งที่ติดตั้งอยู่ที่ไหน',
      'ตําแหน่งที่ใช้งานปกติอยู่ที่ตําแหน่งใด',
    ],
    children: [
      {
        id: '206.2.1',
        type: NodeType.QUESTION,
        q: 'ส่วนควบคุมและแสดงผล "Control and Status"',
        checkboxes: [true, true, false],
        optionsCount: 3,
        optionsHeader: true,
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'เพื่อป้อนข้อมูล ติดต่อสื่อสาร/โหมดในการทํางาน/การทดสอบการซ่อมบํารุงรักษา' },
          { checked: true, label: 'ข.', text: 'ด้านหน้าของ Teletype' },
        ],
        children: [
          {
            id: '206.2.1.1',
            type: NodeType.SUB_QUESTION,
            q: 'Local',
            checkboxes: [true, true, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ยอมให้มีการป้อนข้อมูลแบบ Local' },
              { checked: true, label: 'ข.', text: 'แผงด้านบนซ้าย' },
              { checked: true, label: 'ค.', text: 'ไฟไม่ติด' },
            ],
            children: []
          },
          {
            id: '206.2.1.2',
            type: NodeType.SUB_QUESTION,
            q: 'DATA',
            checkboxes: [true, true, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ยอมให้มีการป้อนข้อมูล/และแสดงผลข้อมูล' },
              { checked: true, label: 'ข.', text: 'แผงด้านบนซ้าย' },
              { checked: true, label: 'ค.', text: 'ปกติไฟติด' },
            ],
            children: []
          },
          {
            id: '206.2.1.3',
            type: NodeType.SUB_QUESTION,
            q: 'TERM READY',
            checkboxes: [true, true, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'แสดงสถานะ Terminal Operating Status' },
              { checked: true, label: 'ข.', text: 'แผงด้านบนซ้าย' },
              { checked: true, label: 'ค.', text: 'ไฟไม่ติด' },
            ],
            children: []
          },
          {
            id: '206.2.1.4',
            type: NodeType.SUB_QUESTION,
            q: 'INTRPT',
            checkboxes: [true, true, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ขัดจังหวะการส่งข้อมูล' },
              { checked: true, label: 'ข.', text: 'แผงด้านบนซ้าย' },
              { checked: true, label: 'ค.', text: 'ไฟไม่ติด' },
            ],
            children: []
          },
          {
            id: '206.2.1.5',
            type: NodeType.SUB_QUESTION,
            q: 'ALARM',
            checkboxes: [true, true, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ไฟติดเมื่อมีเงื่อนไข Alarm' },
              { checked: true, label: 'ข.', text: 'แผงด้านบนซ้าย' },
              { checked: true, label: 'ค.', text: 'ไฟไม่ติด' },
            ],
            children: []
          },
          {
            id: '206.2.1.6',
            type: NodeType.SUB_QUESTION,
            q: 'PRITER TEST',
            checkboxes: [true, true, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ยอมให้มีการทดสอบ Teletype โดยอิสระ' },
              { checked: true, label: 'ข.', text: 'แผงด้านบนขวา' },
              { checked: true, label: 'ค.', text: 'ไฟไม่ติด' },
            ],
            children: []
          },
          {
            id: '206.2.1.7',
            type: NodeType.SUB_QUESTION,
            q: 'PARITY',
            checkboxes: [true, true, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ยอมให้มีการทดสอบ Teletype' },
              { checked: true, label: 'ข.', text: 'แผงด้านบนขวา' },
              { checked: true, label: 'ค.', text: 'ปกติกดขึ้น' },
            ],
            children: []
          },
          {
            id: '206.2.1.8',
            type: NodeType.SUB_QUESTION,
            q: 'Duplex',
            checkboxes: [true, true, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ควบคุมโหมดในการรับ-ส่งข้อมูล Teletype' },
              { checked: true, label: 'ข.', text: 'แผงด้านบนขวา' },
              { checked: true, label: 'ค.', text: 'ปกติกดลง' },
            ],
            children: []
          },
          {
            id: '206.2.1.9',
            type: NodeType.SUB_QUESTION,
            q: 'CPS (Character Per Second)',
            checkboxes: [true, true, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เพื่อร่วมจังหวะข้อมูลระหว่างตัวส่งตัวรับเป็นไปอย่างถูกต้อง' },
              { checked: true, label: 'ข.', text: 'แผงด้านบนขวา' },
              { checked: true, label: 'ค.', text: 'กดลง' },
            ],
            children: []
          },
        ]
      },
      {
        id: '206.2.2',
        type: NodeType.QUESTION,
        q: 'สวิตช์ "ON/OFF"',
        checkboxes: [true, true, true],
        optionsCount: 3,
        optionsHeader: true,
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'จ่ายและเลิกไฟ AC ให้กับ Teletype' },
          { checked: true, label: 'ข.', text: 'มุมด้านล่างซ้าย (ด้านหลัง)' },
          { checked: true, label: 'ค.', text: ' ตําแหน่ง ON' },
        ],
        children: []
      },
      {
        id: '206.2.3',
        type: NodeType.QUESTION,
        q: 'ปุ่มแป้นพิมพ์ "Keyboard"',
        checkboxes: [true, true, false],
        optionsCount: 3,
        optionsHeader: true,
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'ยอมให้มีการป้อนข้อมูล' },
          { checked: true, label: 'ข.', text: 'อยู่ใต้ Operational Controls and Status Indicators' },
        ],
        children: []
      },
      {
        id: '206.2.4',
        type: NodeType.QUESTION,
        q: 'ตลับผ้าหมึก "Ribbon Cartridge"',
        checkboxes: [true, true, false],
        optionsCount: 3,
        optionsHeader: true,
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'ทําให้การพิมพ์ข้อมูลออกมาชัดเจน' },
          { checked: true, label: 'ข.', text: 'อยู่ภายใน Teletype' },
        ],
        children: []
      },
    ]
  },
  {
    id: '206.3',
    type: NodeType.SECTION,
    q: 'หลักการทํางาน',
    children: [
      {
        id: '206.3.1',
        type: NodeType.QUESTION,
        q: 'ส่วนประกอบต่างๆ ทํางานร่วมกันในระบบอย่างไร',
        answerCheckboxes: [
          { checked: true, text: 'ป้อนข้อมูล - พิมพ์ข้อมูลแสดงผล' }
        ],
        children: []
      },
      {
        id: '206.3.2',
        type: NodeType.QUESTION,
        q: 'เมื่อระบบขัดข้องหรือทํางานผิดปกติ มีอะไรเป็นสิ่งบอกเหตุ',
        answerCheckboxes: [
          { checked: true, text: 'Printer ไม่สามารถทํางานในโหมด Local หรือ Remote ได้' }
        ],
        children: []
      },
    ]
  },
  {
    id: '206.4',
    type: NodeType.SECTION,
    q: 'ค่าทํางานปกติ ค่าสูงสุด ต่ำสุด ของการทํางาน',
    description: '(ไม่ต้องอธิบาย)',
    children: []
  },
  {
    id: '206.5',
    type: NodeType.SECTION,
    q: 'การเชื่อมต่อระบบ',
    children: [
      {
        id: '206.5.1',
        type: NodeType.QUESTION,
        q: 'ถ้าไม่มีไฟฟ้ากําลังจ่ายให้กับ Teletype จะมีผลกระทบต่อระบบอย่างไร',
        answerCheckboxes: [
          { checked: true, text: 'Printer ไม่สามารถทํางานในโหมด Local หรือ Remote ได้' },
        ],
        children: []
      },
      {
        id: '206.5.2',
        type: NodeType.QUESTION,
        q: 'Teletype ทํางานร่วมกับ Tape Control Mk. 179 อย่างไร',
        answerCheckboxes: [
          { checked: true, text: 'โดยการรับ - ส่ง ข้อมูลซึ่งกันและกัน' },
        ],
        children: []
      },
    ]
  },
  {
    id: '206.6',
    type: NodeType.SECTION,
    q: 'ข้อระมัดระวังอันตราย',
    children: [
      {
        id: '206.6.1',
        type: NodeType.QUESTION,
        q: 'มีข้อระมัดระวังอันตรายอย่างไรในการเปลี่ยนตลับ Ribbon',
        answerCheckboxes: [
          { checked: true, text: 'ไม่จ่ายไฟเข้า Teletype ขณะทําการเปลี่ยน Ribbon' },
        ],
        children: []
      },
    ]
  },
];
