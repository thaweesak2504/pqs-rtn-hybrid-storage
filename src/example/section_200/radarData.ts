// radarData.ts - Extracted and normalized data for 201 Radar Weapon
// Each node has a unique ID for SQLite compatibility

import { UINode, NodeType, DocumentMeta } from './types';

/**
 * Document metadata
 */
export const documentMeta: DocumentMeta = {
  id: '201',
  section_number: '๒๐๑',
  title: 'ระบบเรดาร์ควบคุมการยิง Radar Weapon Assembly System',
  references: [
    'NAVSEA OP4154 CIWS Mk.15 Mods 1-6 (Phalanx) Vol.1 Pt.1,2',
    'NAVSEA OP4154 CIWS Mk.15 Mods 1-6 (Phalanx) Vol.2',
    'SW221-JO-MMO-010 thru 110, CIWS Mk.15 Mods 11-14'
  ]
};

/**
 * Questions data with unique IDs for each node
 */
export const radarQuestions: UINode[] = [
  {
    id: '201.1',
    type: NodeType.SECTION,
    q: 'หน้าที่',
    isHeader: true,
    children: [
      {
        id: '201.1.1',
        type: NodeType.QUESTION,
        q: 'ระบบนี้ทำหน้าที่อะไร',
        children: [],
        answerCheckboxes: [
          { checked: true, text: 'ชี้เป้าเพื่อที่จะทำการยิงและทำการยิง' }
        ]
      }
    ]
  },
  {
    id: '201.2',
    type: NodeType.SECTION,
    q: 'ส่วนประกอบและชิ้นส่วนในส่วนประกอบของระบบ',
    isHeader: true,
    description: 'อ้างถึงเอกสารประกอบระบบ หรือตัวอุปกรณ์ เพื่อหาส่วนประกอบและชิ้นส่วนในส่วนประกอบ ดังต่อไปนี้ แล้วตอบคำถามที่กำหนด',
    descriptionList: [
      'มีหน้าที่อะไร',
      'ตำแหน่งที่ติดตั้งอยู่ที่ไหน',
      'อุปกรณ์นี้ใช้ป้องกันในลักษณะใด',
      'ในแต่ละตำแหน่งทำหน้าที่อะไร'
    ],
    children: [
      {
        id: '201.2.1',
        type: NodeType.QUESTION,
        q: 'ส่วนประกอบขับเคลื่อนทางหัน "Train Drive Platform Assembly"',
        checkboxes: [true, true, false, false],
        optionsHeader: true,
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'ควบคุมตำแหน่งปืนทางหัน' },
          { checked: true, label: 'ข.', text: 'อยู่บนตู้ Barbette Assembly' }
        ],
        children: [
          {
            id: '201.2.1.1',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์โยกตำแหน่งเก็บทางหัน "Mount Train Stow"',
            checkboxes: [true, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ควบคุมการเคลื่อนตัวเข้าออกของ Stow Pin ทางหัน (Gearlock) และมีไฟแสดง เมื่อ Switch ตัวนี้ทำงานในตำแหน่ง Engage และ Retract.' }
            ],
            children: []
          },
          {
            id: '201.2.1.2',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์โยกแท่นฐานปลอดภัย "Mount Safety"',
            checkboxes: [true, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ห้ามหันและกระดกปืน' },
              { checked: true, label: 'ง.', text: 'ในแต่ละตำแหน่งทำหน้าที่ดังนี้' }
            ],
            subList: [
              'OPERATE เป็นตำแหน่งใช้งานปกติของระบบ',
              'SAFE ห้ามหัน/กระดกและตัดวงจรไฟยิง',
              'RELOAD เหมือนกับตำแหน่ง SAFE และทำให้ระบบ Hydraulic ทำงานขณะทำการ Loading และ Downloading ลูกปืน'
            ],
            children: []
          },
          {
            id: '201.2.1.3',
            type: NodeType.SUB_QUESTION,
            q: 'ขับเคลื่อนทางหันแบบแมนนวล "Mount Train Manual Drive"',
            checkboxes: [true, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เป็นที่หันปืนโดยใช้พวงหมุนขนาด 0.5 นิ้ว และปรับแต่ง Stow Pin ให้อยู่ในตำแหน่ง Engage พอดี' }
            ],
            children: []
          },
          {
            id: '201.2.1.4',
            type: NodeType.SUB_QUESTION,
            q: 'ขับเคลื่อนสลักเก็บตำแหน่งทางหัน "Train Stow Pin Manual Drive"',
            checkboxes: [true, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เพื่อที่จะหมุน TRAIN Stow Pin ให้อยู่ในตำแหน่ง Retract หรือ Engage ด้วยมือ' }
            ],
            children: []
          }
        ]
      },
      {
        id: '201.2.2',
        type: NodeType.QUESTION,
        q: 'ส่วนประกอบขับเคลื่อนทางกระดก "Elevation Drive Assembly"',
        checkboxes: [true, true, false, false],
        optionsHeader: true,
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'ควบคุมตำแหน่งปืนทางกระดก' },
          { checked: true, label: 'ข.', text: 'อยู่บน Train Platform Assembly' }
        ],
        children: [
          {
            id: '201.2.2.1',
            type: NodeType.SUB_QUESTION,
            q: 'ขับเคลื่อนสลักเก็บตำแหน่งทางกระดก "Elevation Stow Pin Manual Drive"',
            checkboxes: [true, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เพื่อที่จะหมุนให้ Elevation Stow Pin อยู่ในตำแหน่ง Stow Engage หรือ Retract ด้วยมือ' }
            ],
            children: []
          },
          {
            id: '201.2.2.2',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์โยกตำแหน่งเก็บทางกระดก "Elevation Stow Pin"',
            checkboxes: [true, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ควบคุม Elevation Stow Pin ให้อยู่ในตำแหน่ง Stow หรือ Retract' }
            ],
            children: []
          },
          {
            id: '201.2.2.3',
            type: NodeType.SUB_QUESTION,
            q: 'คันมือหมุนทางกระดก "Elevation Manual Hand Crank"',
            checkboxes: [true, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เป็นเครื่องมือใช้สำหรับปลดเบรคและหมุนกระดกปืน ขึ้น-ลง' }
            ],
            children: []
          }
        ]
      },
      {
        id: '201.2.3',
        type: NodeType.QUESTION,
        q: 'ปืน 20 mm.',
        checkboxes: [true, true, false, false],
        optionsHeader: true,
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'ทำหน้าที่ยิงทำลายเป้า' },
          { checked: true, label: 'ข.', text: 'ติดตั้งอยู่บน Elevation Yoke Structure' }
        ],
        children: [
          {
            id: '201.2.3.1',
            type: NodeType.SUB_QUESTION,
            q: 'ไฮดรอลิกส์ขับเคลื่อนปืน "Gun Hydraulic Drive"',
            checkboxes: [true, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ขับเคลื่อนปืนและระบบการลำเลียงด้วยระบบไฮโดรลิกในขณะ Uploading/Downloading, Firing' }
            ],
            children: []
          },
          {
            id: '201.2.3.2',
            type: NodeType.SUB_QUESTION,
            q: 'ขอเกียวลำกล้องเกลี้ยง "Clearing Sector Hold Back Tool"',
            checkboxes: [true, false, true, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เมื่อติดตั้งจะรักษาลูกเลื่อน (Breech Bolt) ให้อยู่ในทางเดิน Clearing Cam Path' },
              { checked: true, label: 'ค.', text: 'ป้องกันไม่ให้ลูกปืนเข้าไปในรังเพลิง' }
            ],
            children: []
          }
        ]
      },
      {
        id: '201.2.4',
        type: NodeType.QUESTION,
        q: 'ระบบลำเลียงและบรรจุ "Ammunition Handling/Conveyor System"',
        checkboxes: [true, true, false, false],
        optionsHeader: true,
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'รับ - ส่ง ลูกปืนจาก DRUM ถึงตัวปืน และจากตัวปืนถึง DRUM' },
          { checked: true, label: 'ข.', text: 'ใต้ตัวปืน ๒๐ มม' }
        ],
        children: [
          {
            id: '201.2.4.1',
            type: NodeType.SUB_QUESTION,
            q: 'Feed Chute',
            checkboxes: [true, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'มีหน้าที่ใช้เป็นทางลำเลียงลูกปืน' }
            ],
            children: []
          },
          {
            id: '201.2.4.2',
            type: NodeType.SUB_QUESTION,
            q: 'Element Chuting',
            checkboxes: [true, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'มีหน้าที่ส่ง Element ระหว่าง DRUM และปืน' }
            ],
            children: []
          },
          {
            id: '201.2.4.3',
            type: NodeType.SUB_QUESTION,
            q: 'Entrance Unit',
            checkboxes: [true, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ส่งลูกปืนจาก Chuting เข้าสู่ Drum' }
            ],
            children: []
          },
          {
            id: '201.2.4.4',
            type: NodeType.SUB_QUESTION,
            q: 'Exit Unit',
            checkboxes: [true, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'มีหน้าที่ส่งลูกปืนจาก Drum ไปยัง Feed Chute' }
            ],
            children: []
          },
          {
            id: '201.2.4.5',
            type: NodeType.SUB_QUESTION,
            q: 'Exit Unit Drive Socket',
            checkboxes: [true, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เป็นที่ใส่พวงหมุน (Handcrank) เพื่อทำการ Cycle ลูกปืนด้วยมือ' }
            ],
            children: []
          },
          {
            id: '201.2.4.6',
            type: NodeType.SUB_QUESTION,
            q: 'Loading Gate',
            checkboxes: [true, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เป็นส่วนประกอบของ Exit Unit เมื่อเปิดโดยการยกขึ้นลูกปืนจะสามารถผ่านได้ ขณะ Upload และ Download' }
            ],
            children: []
          },
          {
            id: '201.2.4.7',
            type: NodeType.SUB_QUESTION,
            q: 'Ammunition Drum',
            checkboxes: [true, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'มีหน้าที่เป็นที่เก็บขณะ Loading และส่งผ่านลูกปืน' }
            ],
            children: []
          },
          {
            id: '201.2.4.8',
            type: NodeType.SUB_QUESTION,
            q: 'Drum Timing Pin',
            checkboxes: [true, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'มีหน้าที่ใช้งานสำหรับตั้ง Timing ของ Drum' }
            ],
            children: []
          },
          {
            id: '201.2.4.9',
            type: NodeType.SUB_QUESTION,
            q: 'Hydraulic/Pneumatic Control Actuator',
            checkboxes: [true, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เป็นคันโยกเพื่อควบคุมการหมุนของตัวปืนและส่วนลำเลียงลูกปืนโดยระบบ ไฮโดรลิก' }
            ],
            children: []
          }
        ]
      },
      {
        id: '201.2.5',
        type: NodeType.QUESTION,
        q: 'ส่วนประกอบตัวบรรจุลูกปืน "Ammunition Loader Assembly"',
        checkboxes: [true, true, false, false],
        optionsHeader: true,
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'มีหน้าที่ใช้งานสำหรับการ Upload และ Download ลูกปืนเท่านั้น' },
          { checked: true, label: 'ข.', text: 'ติดตั้งบน Exit Unit' }
        ],
        children: [
          {
            id: '201.2.5.1',
            type: NodeType.SUB_QUESTION,
            q: 'Loader Timing Pin',
            checkboxes: [true, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'มีหน้าที่ตั้ง Timing ของ Loader' }
            ],
            children: []
          },
          {
            id: '201.2.5.2',
            type: NodeType.SUB_QUESTION,
            q: 'Link Chute',
            checkboxes: [true, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ใช้ขณะ Download เพื่อนำลูกปืนที่ยิงแล้วออกจากระบบ' }
            ],
            children: []
          },
          {
            id: '201.2.5.3',
            type: NodeType.SUB_QUESTION,
            q: 'Loader Gears (Rs and LS)',
            checkboxes: [true, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'หน้าที่ทำให้ Gear Timing ในขณะ Upload และ Download เป็นไปอย่างถูกต้อง' }
            ],
            children: []
          }
        ]
      }
    ]
  },
  {
    id: '201.3',
    type: NodeType.SECTION,
    q: 'หลักการทำงาน',
    isHeader: true,
    children: [
      {
        id: '201.3.1',
        type: NodeType.QUESTION,
        q: 'ส่วนประกอบต่างๆ ทำงานร่วมกันในระบบอย่างไร',
        answerCheckboxes: [
          { checked: true, text: 'มีเพื่อชี้ตำแหน่งเป้าหมายและบรรจุลูกปืน' }
        ],
        children: []
      },
      {
        id: '201.3.2',
        type: NodeType.QUESTION,
        q: 'เมื่อระบบขัดข้องหรือทำงานผิดปกติ มีอะไรเป็นสิ่งบอกเหตุ',
        answerCheckboxes: [
          { checked: true, text: 'ไม่สามารถทำการยิงได้' }
        ],
        children: []
      }
    ]
  },
  {
    id: '201.4',
    type: NodeType.SECTION,
    q: 'ค่าทำงานปกติ ค่าสูงสุด ต่ำสุด ของการทำงาน (ไม่ต้องอธิบาย)',
    isHeader: true,
    children: []
  },
  {
    id: '201.5',
    type: NodeType.SECTION,
    q: 'การเชื่อมต่อระบบ',
    isHeader: true,
    children: [
      {
        id: '201.5.1',
        type: NodeType.QUESTION,
        q: 'ถ้าขาดสิ่งดังต่อไปนี้จะมีผลกระทบต่อระบบอย่างไร',
        children: [
          {
            id: '201.5.1.1',
            type: NodeType.SUB_QUESTION,
            q: 'ขาดการควบคุมจาก LCP และ/หรือ RCP',
            answerCheckboxes: [
              { checked: true, text: 'จะไม่ตอบสนองต่อสัญญาณคำสั่งต่าง ๆ' }
            ],
            children: []
          },
          {
            id: '201.5.1.2',
            type: NodeType.SUB_QUESTION,
            q: 'ไม่มีไฟฟ้าเรือจ่ายให้กับระบบ',
            answerCheckboxes: [
              { checked: true, text: 'ไม่สามารถทำการยิงได้' }
            ],
            children: []
          }
        ]
      }
    ]
  },
  {
    id: '201.6',
    type: NodeType.SECTION,
    q: 'ข้อระมัดระวังอันตราย',
    isHeader: true,
    children: [
      {
        id: '201.6.1',
        type: NodeType.QUESTION,
        q: 'มีข้อระมัดระวังอันตรายอะไรบ้าง ในการปฏิบัติงาน ดังต่อไปนี้',
        children: [
          {
            id: '201.6.1.1',
            type: NodeType.SUB_QUESTION,
            q: 'ขณะกระดกปืน โดยวิธีใช้คันมือหมุน',
            answerCheckboxes: [
              { checked: true, text: 'ต้องแน่ใจว่าได้จับพวงหมุนให้แน่น ขณะใส่พวงหมุนเพื่อหมุนปืน' }
            ],
            children: []
          },
          {
            id: '201.6.1.2',
            type: NodeType.SUB_QUESTION,
            q: 'ขณะบรรจุและถอนบรรจุลูกปืน',
            answerCheckboxes: [
              { checked: true, text: 'มีข้อระมัดระวังอันตราย ดังนี้' }
            ],
            subList: [
              'ต้องแน่ใจว่าโหมดการทำงานของเครื่องอยู่ที่ Standby และงดแพร่คลื่นเรดาร์ทุกชนิด',
              'สำหรับลูกปืนที่ใช้งานไม่ได้ควรทิ้งทะเล',
              'ประกาศแจ้งให้ทราบทั่วกันถึงอันตรายที่เกิดจากการแพร่คลื่นต่อระบบอาวุธ (Hero) ก่อนการขนย้ายลูกปืน',
              'บริเวณรอบๆ แท่นปืน ห้ามเข้านอกบริเวณก่อน 30 นาที หลังจากยิงเสร็จ',
              'ต้องสวมถุงมืออย่างหนาขณะทำงาน',
              'หลีกเลี่ยงการสัมผัส Primer และ Primer สัมผัสกับวัตถุที่เป็นโลหะ',
              'พื้นที่ปฏิบัติงานต้องเรียบร้อย',
              'ต้องระมัดระวังมือและเสื้อผ้าที่จะโดนเกี่ยวขณะทำงาน',
              'ต้องไม่เดินระบบไฮโดรลิกนานติดต่อเกิน ๗ นาที',
              'ต้องติดตั้ง Sector Holdback Tool ให้ถูกต้อง',
              'ต้องถอด Mount Safety Connector ที่ Lcp ออก',
              'ตรวจสอบ Guide Bolt ก่อนทำการ Upload และ Download'
            ],
            children: []
          }
        ]
      }
    ]
  }
];
