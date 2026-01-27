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
    description: 'อ้างถึงเอกสารประกอบระบบ หรือตัวอุปกรณ์ เพื่อหาส่วนประกอบและชิ้นส่วนในส่วนประกอบ ดังต่อไปนี้ แล้วตอบคําถามที่กําหนด',
    selectedSubQuestions: [
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
            text: 'ควบคุมแท่นปืนทางกระดก'
          },
          { checked: true, label: 'ข.', text: 'มุมบนด้านซ้ายของตู้ ELX (2A1)' },
        ],
        children: [
          {
            id: '204.2.1.1',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ "Reset/Norm/Disable"',
            checkboxes: [true, true, false, false, true, false, false, false],
            answerCheckboxes: [
              {
                checked: true,
                label: 'ก.',
                text: 'ในแต่ละตำแหน่งมีหน้าที่ ดังนี้',
                subList: [
                  'Reset : เพื่อรีเซ็ต Elevation Status GO หลังจากมีการขัดจังหวะ',
                  'Norm : เป็นตำแหน่งการทำงานปกติ',
                  'Disable : เป็นการขัดจังหวะวงจร Mount Elevation Drive Circuit ส่วนของ วงจรอื่นสามารถทดสอบได้ตามปกติ',
                ],
              },
              {
                checked: true,
                label: 'ข.',
                text: 'อยู่ที่มุมล่างด้านซ้าย'
              },
              {
                checked: true,
                label: 'จ.',
                text: 'เป็นสวิทช์แบบ Toggle ๓ ทาง'
              },
            ],
            children: []
          },
          {
            id: '204.2.1.2',
            type: NodeType.SUB_QUESTION,
            q: 'ไฟแสดง "Status Go"',
            checkboxes: [true, true, false, false, false, false, false, false],
            answerCheckboxes: [
              {
                checked: true,
                label: 'ก.',
                text: 'ไฟติดสีเขียวเมื่อสถานะปืนทางกระดกพร้อมและสามารถกระดกปืน ขึ้น-ลง ได้',
              },
              {
                checked: true,
                label: 'ข.',
                text: 'มุมบนด้านขวา'
              },
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
        children: [
          {
            id: '204.2.2.1',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ "Reset/Norm/Disable"',
            checkboxes: [true, true, false, false, true, false, false, false],
            answerCheckboxes: [
              {
                checked: true,
                label: 'ก.',
                text: 'ในแต่ละตำแหน่งมีหน้าที่ ดังนี้',
                subList: [
                  'Reset : เพื่อรีเซ็ทให้ Train Status GO  หลังจากมีการขัดจังหวะ',
                  'Norm : เป็นตำแหน่งการทำงานปกติ',
                  'Disable : เป็นตําแหน่งขัดจังหวะวงจร Mount Train Drive Circuit  ในขณะที่ วงจรอื่นๆ ทํางานปกติ สามารถทดสอบได้',
                ],
              },
              {
                checked: true,
                label: 'ข.',
                text: 'อยู่ที่มุมล่างด้านซ้าย'
              },
              {
                checked: true,
                label: 'จ.',
                text: 'เป็นสวิทช์แบบ Toggle ๓ ทาง'
              },
            ],
            children: []
          },
          {
            id: '204.2.2.2',
            type: NodeType.SUB_QUESTION,
            q: 'ไฟแสดง "Status Go"',
            checkboxes: [true, true, false, false, false, false, false, false],
            answerCheckboxes: [
              {
                checked: true,
                label: 'ก.',
                text: 'แสดงสถานะเพื่อบอกว่าสถานะของแท่นปืนพร้อมที่จะหัน ซ้าย-ขวา ได้',
              },
              {
                checked: true,
                label: 'ข.',
                text: 'อยู่ด้านบนขวาของตู้อุปกรณ์ 2A4'
              },
            ],
            children: []
          },
        ],
      },
      {
        id: '204.2.3',
        type: NodeType.QUESTION,
        q: '(2A5) Gun Control Unit (GCU) Removable Unit',
        checkboxes: [true, true, false, false, false, false, false, false],
        optionsHeader: true,
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'ควบคุมการจ่ายไฟและคําสั่งต่างๆ ไปยังปืนพร้อมทั้งบอกสถานะของปืน' },
          { checked: true, label: 'ข.', text: 'อยู่ด้านล่างซ้ายของตู้อุปกรณ์ ELX' },
        ],
        children: [
          {
            id: '204.2.3.1',
            type: NodeType.SUB_QUESTION,
            q: 'ไฟแสดง "System Status Go"',
            checkboxes: [true, true, false, false, false, false, false, false],
            answerCheckboxes: [
              {
                checked: true,
                label: 'ก.',
                text: 'ไฟติดสีเขียวเมื่อสถานะของปืนพร้อม (GO)',
              },
              {
                checked: true,
                label: 'ข.',
                text: 'อยู่ด้านบนสุดซ้าย'
              },
            ],
            children: []
          },
          {
            id: '204.2.3.2',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์กุญแจ "Fire Integrity"',
            checkboxes: [true, true, false, false, false, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ในตําแหน่ง Open จะตัดไฟยิงไปยังปืน ในตําแหน่ง Close จะต่อไฟยิงให้กับปืน ปกติต้องอยู่ในตําแหน่ง Open จะเปลี่ยนเป็น Close ก่อนทําการยิงเท่านั้น' },
              { checked: true, label: 'ข.', text: 'ด้านบนสุดด้านขวาของ 2A5' },
            ],
            children: []
          },
          {
            id: '204.2.3.3',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ "Gun Maintenance Clear Command"',
            checkboxes: [true, true, false, false, false, false, false, false],
            answerCheckboxes: [
              {
                checked: true,
                label: 'ก.',
                text: 'จะกดก็ต่อเมื่ออยู่ในโหมด AIR Ready หรือสูงกว่าจะเป็นการ Disable ไฟยิง แต่ปืนจะมีอาการ Cycle เหมือนทําการยิงทุกประการ',
              },
              {
                checked: true,
                label: 'ข.',
                text: 'อยู่ด้านบนกลางของ 2A5',
              },
            ],
            children: []
          },
        ]
      },
      {
        id: '204.2.4',
        type: NodeType.QUESTION,
        q: '(2A8) Weapon Control Group (WCG) Unit',
        checkboxes: [true, true, false, false, false, false, false, false],
        optionsHeader: true,
        optionsCount: 4, // ทดสอบการกำหนดจำนวน Header เป็น 4 (ก.-ง.)
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'ประมวลผลข้อมูลทางเข้าและส่งข้อมูลออกให้ระบบย่อยต่างๆ' },
          { checked: true, label: 'ข.', text: 'ด้านขวาของตู้ ELX' },
        ],
        children: [
          {
            id: '204.2.4.1',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ควบคุม "Test Set"',
            checkboxes: [true, true, false, true, false, false, true, true],
            answerCheckboxes: [
              {
                checked: true,
                label: 'ก.',
                text: 'ในตําแหน่ง Enable จะยอมให้มีการทดสอบระบบแต่จะไม่ยอมให้มีการอาน ข้อมูลจาก ROM ในตําแหน่ง Disable จะเป็นการ Disable วงจรทดสอบ',
              },
              {
                checked: true,
                label: 'ข.',
                text: 'ด้านล่างซ้ายของ 2A8'
              },
              {
                checked: true,
                label: 'ง.',
                text: 'Enable/Disable'
              },
              {
                checked: true,
                label: 'ช.',
                text: 'ในตําแหน่ง Enable ยอมให้วงจรทดสอบทํางาน ในตําแหน่ง Disable ไม่ยอมให้ วงจรทดสอบ ทํางาน'
              },
              {
                checked: true,
                label: 'ซ.',
                text: 'Disable'
              },
            ],
            children: []
          },
          {
            id: '204.2.4.2',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ "Computer Mode"',
            checkboxes: [true, true, false, true, false, false, true, true],
            answerCheckboxes: [
              {
                checked: true,
                label: 'ก.',
                text: 'เปลี่ยนให้คอมพิวเตอร์อยู่ในตำแหน่ง Stop หรือ Run ไฟสีแดงติดแสดงว่าอยู่ใน ตำแหน่ง Run',
              },
              {
                checked: true,
                label: 'ข.',
                text: 'ด้านล่างขวาของ 2A8'
              },
              {
                checked: true,
                label: 'ง.',
                text: 'Stop/Run'
              },
              {
                checked: true,
                label: 'ช.',
                text: 'Run ยอมให้การทำงานเป็นไปอย่างปกติ Stop หยุดการทำงานของ คอมพิวเตอร์'
              },
              {
                checked: true,
                label: 'ซ.',
                text: 'Run'
              },
            ],
            children: []
          },
        ]
      },
      {
        id: '204.2.5',
        type: NodeType.QUESTION,
        q: '(2A15) Junction Box',
        optionsHeader: true,
        checkboxes: [true, true, false, false, false, false, false, false],
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'เป็นที่ติดตั้ง CBS1, 2 (MODS 1-4,6) เป็นที่ติดตั้ง CB1 (MODS 11-14)' },
          { checked: true, label: 'ข.', text: 'ด้านขวาของตู้ ELX' },
        ],
        children: [
          {
            id: '204.2.5.1',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ "CB1"',
            checkboxes: [true, true, false, false, false, true, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ควบคุมไฟ 440V. 60Hz 3 เฟส ไฟ EM ให้กับระบบ CIWS' },
              { checked: true, label: 'ข.', text: 'ภายใน 2A15' },
              { checked: true, label: 'ฉ.', text: 'ป้องกันการ Overload' },
              { checked: true, label: 'ช.', text: 'ตําแหน่ง ON (ผลักขึ้น)' },
            ],
            children: []
          },
          {
            id: '204.2.5.2',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ "CB2"',
            checkboxes: [true, true, false, false, false, true, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ควบคุมไฟ 440V. 60Hz 3 เฟส ไฟ ELX ให้กับระบบ CIWS' },
              { checked: true, label: 'ข.', text: 'ภายใน 2A15' },
              { checked: true, label: 'ฉ.', text: 'ป้องกันการ Overload' },
              { checked: true, label: 'ช.', text: 'ตําแหน่ง ON (ผลักขึ้น)' },
            ],
            children: []
          },
        ]
      },
      {
        id: '204.2.6',
        type: NodeType.QUESTION,
        q: '(2A6A1) Power Supply and Control Group (PSCG) Panel',
        optionsHeader: true,
        checkboxes: [true, true, false, false, false, false, false, false],
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'ควบคุมไฟการแจกจ่ายไฟทางออกของ PSCG' },
          { checked: true, label: 'ข.', text: 'ด้านซ้ายล่างของตู้ ELX' },
        ],
        children: [
          {
            id: '204.2.6.1',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ "CBS 1-9"',
            checkboxes: [true, true, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ควบคุมการจ่ายไฟให้กับระบบย่อยต่างๆ' },
              { checked: true, label: 'ข.', text: 'ด้านหน้า 2A6A1' },
              { checked: true, label: 'ซ.', text: 'ตําแหน่ง ON (ผลักขึ้น)' },
            ],
            children: []
          },
        ]
      },
      {
        id: '204.2.7',
        type: NodeType.QUESTION,
        q: '(2A12A1) PSCG Panel',
        checkboxes: [true, true, false, false, false, false, false, false],
        optionsHeader: true,
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'ควบคุมการแจกจ่ายไฟทางออกของ PSCG' },
          { checked: true, label: 'ข.', text: 'ด้านล่างขวาของตู้ ELX' },
        ],
        children: [
          {
            id: '204.2.7.1',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ "CBS 1-9"',
            checkboxes: [true, true, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ควบคุมการจ่ายไฟ 440Vac' },
              { checked: true, label: 'ข.', text: 'ด้านหน้าของ 2A12A1' },
              { checked: true, label: 'ซ.', text: 'ในตำแหน่ง ON (กดเข้า)' },
            ],
            children: []
          },
        ]
      },
      {
        id: '204.2.8',
        type: NodeType.QUESTION,
        q: '(2A13) Liquid to Liquid Heat Exchanger',
        checkboxes: [true, true, false, false, false, false, false, false],
        optionsHeader: true,
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'เป็นอุปกรณ์ระบายความร้อนจากสารหล่อเย็นไปยังน้ำทะเลแล้วระบายออกนอก ตัวเรือ' },
          { checked: true, label: 'ข.', text: 'ด้านซ้ายมือของตู้ ELX' },
        ],
        children: [
          {
            id: '204.2.8.1',
            type: NodeType.SUB_QUESTION,
            q: 'M-1 Flow Meter',
            checkboxes: [true, true, false, false, false, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'แสดงจํานวนอัตราการไหลของน้ําทะเล (20-25 gpm)' },
              { checked: true, label: 'ข.', text: 'อยู่ด้านล่าง Heat Exchange' },
            ],
            children: []
          },
          {
            id: '204.2.8.2',
            type: NodeType.SUB_QUESTION,
            q: 'V-1 Globe Valve',
            checkboxes: [true, true, false, false, false, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ควบคุมอัตราการไหลของน้ําทะเลที่ผ่าน Heat Exchanger' },
              { checked: true, label: 'ข.', text: 'ใต้ตู้ ELX' },
            ],
            children: []
          },
        ]
      },
      {
        id: '204.2.9',
        type: NodeType.QUESTION,
        q: '(2A16) Suppressor Assembly Indicator',
        checkboxes: [true, true, true, false, false, false, false, false],
        optionsHeader: true,
        optionsCount: 8, // ก. - ข. (8 ตัว) ถ้าไม่กำหนดก็จะใช้ Default 8 ตัว ซึ่งตำแหน่งนี้ไม่ต้องกำหนดก็ได้(เอาออกก็ได้)
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'แสดงผลว่าไฟ 440V.ac 3 เฟส ที่จะจ่ายให้ระบบ CIWS พร้อมใช้งาน' },
          { checked: true, label: 'ข.', text: 'ด้านล่างขวาของตู้ ELX' },
          { checked: true, label: 'ค.', text: 'แผงสวิตช์บอร์ดในเรือ' },
        ],
        children: []
      },
    ]
  },
  {
    id: '204.3',
    type: NodeType.SECTION,
    q: 'หลักการทํางาน',
    children: [
      {
        id: '204.3.1',
        type: NodeType.QUESTION,
        q: 'ส่วนประกอบต่างๆ ทํางานร่วมกันในระบบอย่างไร',
        answerCheckboxes: [
          { checked: true, text: 'มีการจ่ายไฟสัญญาณคําสั่งควบคุมและป้องกันอุปกรณ์อิเล็กทรอนิกส์จาก สภาพแวดล้อมภายนอก' }
        ],
        children: []
      },
    ]
  },
  {
    id: '204.4',
    type: NodeType.SECTION,
    q: 'ค่าทํางานปกติ ค่าสูงสุด ต่ำสุด ของการทํางาน',
    description: 'อธิบายถึงค่าการทํางานปกติ ค่าสูงสุด ต่ำสุด ของอุปกรณ์ โดยใช้คําถาม ดังต่อไปนี้',
    // selectedSubQuestions: [],
    selectedSubQuestions: [
      'ค่าที่แสดงถึงการทํางานปกติ',
      'ขีดจํากัดสูงสุดที่อนุญาตให้ทํางานได้',
      'อ่านค่าได้จากที่ไหน',
      'ค่าที่จุดใดที่ตั้งไว้เพื่อใช้แจ้งเป็นสัญญาณเตือน',
    ],
    children: [
      {
        id: '204.4.1',
        type: NodeType.QUESTION,
        q: 'มิเตอร์ M -1 Flowmeter',
        checkboxes: [true, true, true, true],
        optionsHeader: true,
        optionsCount: 4, // ก. - ง. (4 ตัว)
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: '๒๐-๒๕ แกลลอนต่อนาที' },
          { checked: true, label: 'ข.', text: '๑๐-๒๕ แกลลอนต่อนาที' },
          { checked: true, label: 'ค.', text: 'อยู่ใต้ชุดระบายความร้อนของเหลวสู่ของเหลว (Liquid to Liquid Heat Exchanger)' },
          { checked: true, label: 'ง.', text: 'น้อยกว่า ๑๐ แกลลอนต่อนาที' },
        ],
        children: []
      },
    ]
  },
  {
    id: '204.5',
    type: NodeType.SECTION,
    q: 'การเชื่อมต่อระบบ',
    children: [
      {
        id: '204.5.1',
        type: NodeType.QUESTION,
        q: 'ถ้าขาดสิ่งดังต่อไปนี้จะมีผลกระทบต่อระบบอย่างไร',
        children: [
          {
            id: '204.5.1.1',
            type: NodeType.SUB_QUESTION,
            q: 'ไม่มีน้ำหล่อเย็นจากภายนอก',
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ระบบ CIWS จะไม่สามารถทํางานได้' },
            ],
            children: []
          },
          {
            id: '204.5.1.2',
            type: NodeType.SUB_QUESTION,
            q: 'ไม่มีไฟฟ้าเรือจ่ายให้กับระบบ',
            answerCheckboxes: [
              { checked: true, label: 'ข.', text: 'ELX Enclosure ไม่ทํางาน' },
            ],
            children: []
          },
        ]
      }
    ]
  },
  {
    id: '204.6',
    type: NodeType.SECTION,
    q: 'ข้อระมัดระวังอันตราย',
    children: [
      {
        id: '204.6.1',
        type: NodeType.QUESTION,
        q: 'มีข้อระมัดระวังอันตรายเกี่ยวกับ Fire Integrity Key Switch',
        answerCheckboxes: [
          { checked: true, text: 'ต้องแน่ใจว่าสวิทช์อยู่ในตำแหน่ง Open จนกว่าจะทำการยิง' }
        ],
        children: []
      },
    ]
  },
];