// elxData.ts - Extracted and normalized data for 204 Electronic Enclosure
// Each node has a unique ID for SQLite compatibility
// Using data from 204_elx_system.html

import { UINode, NodeType, DocumentMeta } from './types';

export const documentMeta: DocumentMeta = {
  id: '204',
  section_number: '๒๐๔',
  title: 'ระบบอิเล็กทรอนิคส์ Electronics (ELX) Enclosure System',
  references: [
    'NAVSEA OP4154 CIWS Mk.15 Mods 1-6 (Phalanx) Vol.1 Pt.1,2',
    'NAVSEA OP4154 CIWS Mk.15 Mods 1-6 (Phalanx) Vol.2',
    'SW221-JO-MMO-010 thru 110, CIWS Mk.15 Mods 11-14'
  ]
};

export const elxQuestions: UINode[] = [
  {
    id: '204.1',
    type: NodeType.SECTION,
    q: 'หน้าที่',
    children: [
      {
        id: '204.1.1',
        type: NodeType.QUESTION,
        q: 'ระบบนี้ทําหน้าที่อะไร',
        answerCheckboxes: [
          { checked: true, text: 'เป็นที่ติดตั้งของระบบอิเล็กทรอนิกส์ มีการป้องกันมิดชิดและมีระบบรักษาอุณภูมิ' }
        ],
        children: []
      }
    ]
  },
  {
    id: '204.2',
    type: NodeType.SECTION,
    q: 'ส่วนประกอบและชิ้นส่วนในส่วนประกอบของระบบ',
    isHeader: true,
    description: 'อ้างถึงเอกสารประกอบระบบ หรือตัวอุปกรณ์ เพื่อหาส่วนประกอบและชิ้นส่วนในส่วนประกอบ ดังต่อไปนี้ แล้วตอบคําถามที่กําหนด',
    descriptionList: [
      'มีหน้าที่อะไร',
      'ตำแหน่งที่ติดตั้งอยู่ที่ไหน',
      'ใช้พลังงานหรือกําลังงานอะไรและได้รับมาจากไหน',
      'แบบการทํางานหรือการควบคุมมีอะไรบ้าง',
      'อุปกรณ์ป้องกันหรือให้ความปลอดภัยมีอะไรบ้าง',
      'อุปกรณ์นี้ใช้ป้องกันในลักษณะใด',
      'ในแต่ละตําแหน่งทําหน้าที่อะไร',
      'สีของไฟแสดงเริ่มต้นและเมื่อเปลี่ยนเป็นสีอะไร'
    ],
    children: [
      {
        id: '204.2.1',
        type: NodeType.QUESTION,
        q: '(2A1) Elevation Servo Electronics Removable Unit',
        checkboxes: [true, true, false, false, false, false, false, false],
        optionsHeader: true,
        answerCheckboxes: [
          {
            checked: true,
            label: 'ก.',
            text: 'ควบคุมแท่นปืนทางกระดก',
            subList: [
              'สวิตช์ปุ่มกดไฟแสดง "Reset/Norm/Disable"',
              'สวิตช์ปุ่มกดไฟแสดง "Reset/Norm/Disable" ตัวเลือกของหน้าที่จะทำการตั้งค่าให้เป็นค่าเริ่มต้น',
            ]
          },
          { checked: true, label: 'ข.', text: 'มุมบนด้านซ้ายของตู ELX (2A1)' },
        ],
        children: [
          {
            id: '204.2.1.1',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ "Reset/Norm/Disable"',
            checkboxes: [true, true, false, false, true, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ในแต่ละตำแหน่งมีหน้าที่ ดังนี้' },
            ],
            children: []
          },
        ]
      },
      {
        id: '204.2.2',
        type: NodeType.QUESTION,
        q: '(2A4) Train Servo Electronic Removable Unit',
        checkboxes: [true, true, false, false, false, false, false, false],
        optionsHeader: true,
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'ควบคุมแท่นปืนทางหัน' },
          { checked: true, label: 'ข.', text: 'อยู่ใต้ Elevation Servo Electronic Removable Unit' },
        ],
        children: []
      },
    ]
  },
];