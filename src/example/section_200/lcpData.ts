// lcpData.ts - Extracted and normalized data for 202 Local Control Panel
// Each node has a unique ID for SQLite compatibility

import { UINode, NodeType, DocumentMeta } from './types';

/**
 * Document metadata
 */
export const documentMeta: DocumentMeta = {
  id: '202',
  section_number: '๒๐๒',
  title: 'ระบบควบคุม Local Control Panel (LCP) System',
  references: [
    'NAVSEA OP4154 CIWS Mk.15 Mods 1-6 (Phalanx) Vol.1 Pt.1,2',
    'NAVSEA OP4154 CIWS Mk.15 Mods 1-6 (Phalanx) Vol.2',
    'SW221-JO-MMO-010 thru 110, CIWS Mk.15 Mods 11-14'
  ]
};

/**
 * Questions and answers data with unique IDs for each node
 */
export const lcpQuestions: UINode[] = [
  {
    id: '202.1',
    type: NodeType.SECTION,
    q: 'หน้าที่',
    children: [
      {
        id: '202.1.1',
        type: NodeType.QUESTION,
        q: 'ระบบนี้ทําหน้าที่อะไร',
        answerCheckboxes: [
          { checked: true, text: 'มีหน้าที่ควบคุมและแสดงสถานะต่างๆ ของระบบ' }
        ],
        children: []
      }
    ]
  },
  {
    id: '202.2',
    type: NodeType.SECTION,
    q: 'ส่วนประกอบและชิ้นส่วนในส่วนประกอบของระบบ',
    description: 'อ้างถึงเอกสารประกอบระบบ หรือตัวอุปกรณ์ เพื่อหาส่วนประกอบและชิ้นส่วนในส่วนประกอบ ดังต่อไปนี้ แล้วตอบคําถามที่กําหนด',
    descriptionList: [
      'มีหน้าที่อะไร',
      'ตําแหน่งที่ติดตั้งอยู่ที่ไหน',
      'ใช้พลังงานหรือกําลังงานอะไรและได้รับมาจากไหน',
      'แบบการทํางานหรือการควบคุมมีอะไรบ้าง',
      'อุปกรณ์ป้องกันหรือให้ความปลอดภัยมีอะไรบ้าง',
      'อุปกรณ์นี้ใช้ป้องกันในลักษณะใด',
      'ในแต่ละตําแหน่งทําหน้าที่อะไร',
      'สีของไฟแสดงเริ่มต้นและเมื่อเปลี่ยนเป็นสีอะไร'
    ],
    children: [
      {
        id: '202.2.1',
        type: NodeType.QUESTION,
        q: 'ภาคส่วนการเดินระบบ \"LCP Power Section\"',
        checkboxes: [true, true, false, false, false, false, false, false],
        optionsHeader: true,
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'จ่ายไฟให้กับแผงด้านหน้า Lcp' },
          { checked: true, label: 'ข.', text: 'อยู่ด้านบนซ้ายของตู้ LCP' }
        ],
        children: [
          {
            id: '202.2.1.1',
            type: NodeType.SUB_QUESTION,
            q: 'ปุ่มปรับค่าความสว่าง \"Lamp Intensity\"',
            checkboxes: [true, false, false, false, false, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'รับแต่งความเข้มแสงของ สวิตช์และหลอดไฟแสดงผล' }
            ],
            children: []
          },
          {
            id: '202.2.1.2',
            type: NodeType.SUB_QUESTION,
            q: 'ปุ่มปรับค่าความสว่าง \"Readout Intensity\"',
            checkboxes: [true, false, false, false, false, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ปรับแต่งความเข้มแสงของตัวเลขแสดงผล' }
            ],
            children: []
          },
          {
            id: '202.2.1.3',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกด \"CB\"',
            checkboxes: [true, false, true, false, false, true, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ในตําแหน่ง On กดลงจะจ่ายไฟ 115v. ให้กับตู้ LCP และป้องกัน Power Supply จากหม้อแปลง 115v. ของ Pscg ที่เกิดจากการ Over Load' },
              { checked: true, label: 'ค.', text: 'มาจากตู้ Electronics (Elx) Enclosure' },
              { checked: true, label: 'ฉ.', text: 'ป้องกันการ Over Load' }
            ],
            children: []
          },
          {
            id: '202.2.1.4',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกดไฟแสดง \"Alarm Reset\"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'มีหน้าที่ที่จะเกิดเสียง Alarm ดังขึ้น และไฟติดสีขาว ก็ต่อเมื่อกำลังดันน้ำทะเล, กำลังดันอากาศไม่ปกติ และสถานะของเครื่อง No Go สัญญาณเสียงจะหยุดดังก็ต่อเมื่อกดซ้ำ อีก ๑ ครั้ง' },
              { checked: true, label: 'ซ.', text: 'ขาว / -' }
            ],
            children: []
          },
          {
            id: '202.2.1.5',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกดไฟแสดง \"POWER OFF (AVAIL)\"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ไฟแสดงติดสีเหลืองเมื่อไฟ 115v. พร้อมใช้งานที่ LCP และไฟ Power On จะติด เมื่อกดปุ่มนี้จะเลิกไฟจากตู้อ LCP' },
              { checked: true, label: 'ซ.', text: 'เหลือง / -' }
            ],
            children: []
          },
          {
            id: '202.2.1.6',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกดไฟแสดง \"POWER ON\"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ควบคุมการจ่ายไฟให้กับ LCP ไฟติดสีขาวเมื่อกดปุ่มนี้' },
              { checked: true, label: 'ซ.', text: 'ขาว / -' }
            ],
            children: []
          },
          {
            id: '202.2.1.7',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกด \"LAMP TEST\"',
            checkboxes: [true, false, false, false, false, false, true, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ประยุกต์ไฟเพื่อที่จะทดสอบหลอดไฟและการแสดงผลต่างๆ บนตู้อ LCP' },
              { checked: true, label: 'ช.', text: 'Primary/Off/Alternate : แสดง ไฟสีหลัก/ไม่ตรวจสอบ/สีที่สอง' }
            ],
            children: []
          }
        ]
      },
      {
        id: '202.2.2',
        type: NodeType.QUESTION,
        q: 'มิเตอร์จับเวลาการทํางาน \"Run Time Meter\"',
        optionsHeader: true,
        checkboxes: [true, true, false, false, false, false, false, false],
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'แสดงเวลาการทํางานเป็นชั่วโมง' },
          { checked: true, label: 'ข.', text: 'ที่มุมด้านซ้ายของตู้อ LCP' }
        ],
        children: [
          {
            id: '202.2.2.1',
            type: NodeType.SUB_QUESTION,
            q: 'มิเตอร์ \"ENVIR\"',
            checkboxes: [true, false, false, false, false, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'แสดงเวลาการทํางานโดยรวมทั้งหมดของวงจร Ecg แสดงเวลาเป็นชั่วโมง' }
            ],
            children: []
          },
          {
            id: '202.2.2.2',
            type: NodeType.SUB_QUESTION,
            q: 'มิเตอร์ \"ELECTRONICS\"',
            checkboxes: [true, false, false, false, false, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'แสดงเวลาที่มีการจ่ายไฟ Elx ไปใหกับ Unit 2 และ 3 แสดงเวลาเป็นชั่วโมง' }
            ],
            children: []
          },
          {
            id: '202.2.2.3',
            type: NodeType.SUB_QUESTION,
            q: 'มิเตอร์ \"RADIATE\"',
            checkboxes: [true, false, false, false, false, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'แสดงเวลาทั้งหมดที่มีการแพร่คลื่น' }
            ],
            children: []
          },
          {
            id: '202.2.2.4',
            type: NodeType.SUB_QUESTION,
            q: 'มิเตอร์ \"AUTO PWR\"',
            checkboxes: [true, false, false, false, false, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'แสดงเวลาทั้งหมดที่ระบบทํางานในโหมด Auto Power' }
            ],
            children: []
          }
        ]
      },
      {
        id: '202.2.3',
        type: NodeType.QUESTION,
        q: 'ภาคส่วนสําหรับการซ่อมบํารุง \"Maintenance Section\"',
        optionsHeader: true,
        checkboxes: [true, true, false, false, false, false, false, false],
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'ใช้สําหรับการซ่อมบํารุงเครื่อง' },
          { checked: true, label: 'ข.', text: 'อยู่ด้านบนซ้ายของแผงด้านหน้าตู้ LCP' }
        ],
        children: [
          {
            id: '202.2.3.1',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกดไฟแสดง \"Auto Power\"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เมื่อกดปุ่มนี้ไฟจะติดสีขาวระบบ CIWS จะอยู่ในโหมด Auto Power ถ้าเครื่อง อยู่ที่ โหมด Air Ready หรือ AAW Mode ถ้าต้องการกลับมาอยู่ในโหมดปกติให้กดปุ่ม Standby' },
              { checked: true, label: 'ซ.', text: 'ขาว / -' }
            ],
            children: []
          },
          {
            id: '202.2.3.2',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกดไฟแสดง \"ELX Power\"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เมื่อกดปุ่มนี้จะมีไฟ Elx และแจกจ่ายไฟ Elx ให้กับตู้ Electronic Enclosure สวิตช์จะติดสีเขียว (ไฟอยู่ในเกณฑ์ที่ยอมรับได้) ถ้าติดสีเหลือง (ไฟไม่อยู่ในเกณฑ์ที่ยอมรับได้)' },
              { checked: true, label: 'ซ.', text: 'เหลือง / เขียว' }
            ],
            children: []
          },
          {
            id: '202.2.3.3',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกดไฟแสดง \"MAINT\"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เมื่อกดปุ่มนี้เครื่องจะอยู่ในโหมด Maintenance และไฟที่สวิตช์จะเปลี่ยนจาก สีขาวเป็นสีเขียว เมื่อคอมพิวเตอร์ WCG สั่งให้เครื่องอยู่ในโหมด Maintenance' },
              { checked: true, label: 'ซ.', text: 'ขาว / เขียว' }
            ],
            children: []
          },
          {
            id: '202.2.3.4',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกดไฟแสดง \"AIM CALIB\"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เมื่อกดปุ่มจะสั่งให้ระบบ CIWS อยู่ในโหมดย่อย Preaction Aim Calibrate ไฟ จะเปลี่ยนจากสีขาวเป็นสีเหลืองเมื่อคอมพิวเตอร์ WCG สั่งให้ CIWS อยู่ในโหมดPreaction Aim Calibrate เรียบร้อย' },
              { checked: true, label: 'ซ.', text: 'ขาว / เหลือง' }
            ],
            children: []
          },
          {
            id: '202.2.3.5',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกดไฟแสดง \"OPR Test\"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เมื่อกดปุ่มจะสั่งให้ CIWS อยู่ในโหมดย่อย Operability Test ไฟที่สวิตช์เปลี่ยน จากสีขาวเป็นสีเหลืองแสดงว่า Program Test กำลังทำงานอยู่' },
              { checked: true, label: 'ซ.', text: 'ขาว / เหลือง' }
            ],
            children: []
          },
          {
            id: '202.2.3.6',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกดไฟแสดง \"End Test\"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เมื่อกดปุ่มนี้จะสิ้นสุดการทดสอบ เมื่อกดปุ่มนี้ไฟจะติดสีขาวแล้วเปลี่ยนเป็นสี เขียว ๑ วินาที หลังจากนั้นไฟจะดับเมื่อการทดสอบสิ้นสุดลง ใช้ในการสิ้นสุดการทดสอบ ดังต่อไปนี้' },
              { checked: true, label: 'ซ.', text: 'ขาว / เขียว' }
            ],
            subList: [
              'Xmtr Test (Transmitter Test)',
              'Calib (Aim Calibration)',
              'Opr Test (Operability)',
              'Search Only'
            ],
            children: []
          }
        ]
      },
      {
        id: '202.2.4',
        type: NodeType.QUESTION,
        q: 'ภาคส่วนควบคุมขั้นการทํางาน \"Mode Control Section\"',
        optionsHeader: true,
        checkboxes: [true, true, false, false, false, false, false, false],
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'สําหรับเลือก Mode การทํางานต่างๆ ของระบบ CIW' },
          { checked: true, label: 'ข.', text: 'ด้านบนมุมซ้ายของบนตู้อุปกรณ์ LCP' }
        ],
        children: [
          {
            id: '202.2.4.1',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกดไฟแสดง \"Battery Off\"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เมื่อกดปุ่มนี้ CIWS จะอยู่ในโหมดการทํางาน Battery Off ไฟที่สวิตช์จะติดสีขาว' },
              { checked: true, label: 'ซ.', text: 'ขาว / -' }
            ],
            children: []
          },
          {
            id: '202.2.4.2',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกดไฟแสดง \"XMTR Coolant\"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ควบคุมการทํางานของ Transmitter Coolant Environment . ให้ทํางานไฟที่สวิตช์จะเปลี่ยนจากสีเหลืองเป็นสีเขียวก็ต่อเมื่อ ระบบ Coolant พร้อมใช้งาน' },
              { checked: true, label: 'ซ.', text: 'เหลือง / เขียว' }
            ],
            children: []
          },
          {
            id: '202.2.4.3',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกดไฟแสดง \"Standby\"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เมื่อกดปุ่มนี้จะสั่งให้ระบบ CIWS อยู่ในโหมด Standby และไฟจะเปลี่ยนจากสี ขาวเป็นสีเขียวก็ต่อเมื่อเงื่อนไข Standby พร้อม และจะดับเมื่อเลือกโหมดการทํางานอื่นๆ' },
              { checked: true, label: 'ซ.', text: 'ขาว / เขียว' }
            ],
            children: []
          },
          {
            id: '202.2.4.4',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกดไฟแสดง \"Stow Engaged/Stow Retract\"',
            checkboxes: [true, true, false, false, false, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ควบคุมเคลื่อนตัวเข้า - ออก ของ Stow Pin ถ้า Stow Pin อยู่ในตำแหน่ง Stow Engaged ไฟจะติดสีเหลือง ถ้าอยู่ในตำแหน่ง Retract ไฟจะติดสีเขียว' },
              { checked: true, label: 'ซ.', text: 'เหลือง / เขียว' }
            ],
            children: []
          },
          {
            id: '202.2.4.5',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกดไฟแสดง \"Air Ready\"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เมื่อกดปุ่มนี้จะสั่งให้ระบบ CIWS อยู่ในโหมดการทำงาน Air Ready และไฟ แสดงสีขาวจะเปลี่ยนเป็นสีเขียวเมื่อ WCG คอมพิวเตอร์สั่งให้อยู่ในโหมด Air Ready และไฟจะดับเมื่อมีการเลือกการทำงาน Mode อื่นๆ' },
              { checked: true, label: 'ซ.', text: 'ขาว / เขียว' }
            ],
            children: []
          },
          {
            id: '202.2.4.6',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกดไฟแสดง \"AAW Manual\"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เมื่อกดปุ่มนี้ WCG คอมพิวเตอร์จะสั่งให้ระบบ CIWS อยู่ในโหมดการทำงาน AAW Manual และไฟแสดงสีขาวจะเปลี่ยนเป็นสีเขียว และไฟจะดับเมื่อมีการเลือกโหมดการ ทำงานอื่นๆ' },
              { checked: true, label: 'ซ.', text: 'ขาว / เขียว' }
            ],
            children: []
          },
          {
            id: '202.2.4.7',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกดไฟแสดง \"AAW Auto\"',
            checkboxes: [true, false, false, false, true, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เมื่อกดปุ่มนี้ WCG คอมพิวเตอร์จะสั่งให้ระบบ CIWS อยู่ในโหมดการทำงาน AAW Auto ไฟแสดงสีขาวจะเปลี่ยนเป็นสีเขียว และไฟจะดับเมื่อมีการเลือกโหมดการทำงานอื่น' },
              { checked: true, label: 'จ.', text: 'เปลี่ยนเป็นสวิตช์ที่มีฝาครอบ' },
              { checked: true, label: 'ซ.', text: 'ขาว / เขียว' }
            ],
            children: []
          },
          {
            id: '202.2.4.8',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกดไฟแสดง \"Surface\"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เมื่อกดปุ่มนี้ WCG คอมพิวเตอร์จะสั่งให้ระบบ CIWS อยู่ในโหมดการทำงาน Surface และไฟแสดงสีขาวจะเปลี่ยนเป็นสีเขียว ไฟจะดับเมื่อมีการเลือกโหมดการทำงาน อื่น ๆ ไม่มีใช้งานใน ทร.ไทย' },
              { checked: true, label: 'ซ.', text: 'ขาว / เขียว' }
            ],
            children: []
          },
          {
            id: '202.2.4.9',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกดไฟแสดง \"Remote DESIG\"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เมื่อกด LCP จะต่อสัญญาน Synchro ที่เป็นข้อมูลเป้าหมายที่ได้รับการชี้เป้าส่งให้กับ Synchro ของแท่นยิงและส่งสัญญาณ Remote Designate ให้กับ WCG ที่สวิตช์จะมีไฟ แสดงสีขาวเมื่อกด จะเปลี่ยนจากสีขาวเป็นสีเขียวเมื่อ WCG สั่งให้ทำงานในโหมดนี้แล้ว' },
              { checked: true, label: 'ซ.', text: 'ขาว / เขียว' }
            ],
            children: []
          }
        ]
      },
      {
        id: '202.2.5',
        type: NodeType.QUESTION,
        q: 'ภาคส่วนสถานะการติดตามเป้า \"Engagement Status\"',
        optionsHeader: true,
        checkboxes: [true, true, false, false, false, false, false, false],
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'ใช้สําหรับแสดงสถานะการติดตามเป้าของระบบ CIWS' },
          { checked: true, label: 'ข.', text: 'อยู่มุมบนขวาของแผงด้านหน้า LCP' }
        ],
        children: [
          {
            id: '202.2.5.1',
            type: NodeType.SUB_QUESTION,
            q: 'ไฟแสดงสถานะค้นหา \"Search\"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เมื่อไฟติดสีเขียวแสดงว่า Radar search กําลังทํางาน' },
              { checked: true, label: 'ซ.', text: 'เขียว / เขียว' }
            ],
            children: []
          },
          {
            id: '202.2.5.2',
            type: NodeType.SUB_QUESTION,
            q: 'ไฟแสดงยิงได้ \"Recommend Fire\"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เมื่อไฟติดสีเหลืองแสดงว่า พนักงานสามารถกดปุ่มยิง (FIRE) ได้ในขณะทําการยิง PAC fire และ AAW MANUAL' },
              { checked: true, label: 'ซ.', text: 'เหลือง / เหลือง' }
            ],
            children: []
          },
          {
            id: '202.2.5.3',
            type: NodeType.SUB_QUESTION,
            q: 'ไฟแสดงเตือนมีคลื่นรบกวน \"Interference Alert\"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ไฟติดสีเหลืองแสดงว่า เรดาร์ CIWS กําลังถูกรบกวน ( Interference )' },
              { checked: true, label: 'ซ.', text: 'เหลือง / -' }
            ],
            children: []
          },
          {
            id: '202.2.5.4',
            type: NodeType.SUB_QUESTION,
            q: 'ไฟแสดงกําลังยิง \"Gun Firing\"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'แสดงไฟสีแดงขณะทําการยิง' },
              { checked: true, label: 'ซ.', text: 'แดง / แดง' }
            ],
            children: []
          },
          {
            id: '202.2.5.5',
            type: NodeType.SUB_QUESTION,
            q: 'ไฟแสดงพบเป้า \"Detect\"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'แสดงไฟสีเขียวขณะที่ Search Radar ตรวจจับเป้าได้' },
              { checked: true, label: 'ซ.', text: 'เขียว / เขียว' }
            ],
            children: []
          },
          {
            id: '202.2.5.6',
            type: NodeType.SUB_QUESTION,
            q: 'ไฟแสดงไม่ได้ปรับกลุ่มกระสุนแบบต่อเนื่อง \"CAC Inhibit\"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'แสดงไฟสีเหลืองแสดงว่าไม่มีการแก้จุดแล้วยิง' },
              { checked: true, label: 'ซ.', text: 'เหลือง / เหลือง' }
            ],
            children: []
          },
          {
            id: '202.2.5.7',
            type: NodeType.SUB_QUESTION,
            q: 'ไฟแสดงเข้าต่อตี \"Assign\"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'จะติดสีเขียวก็ต่อเมื่อข้อมูลเป้าได้มาจากสายอากาศ (track) เปลี่ยน Search เป็น Track แล้ว' },
              { checked: true, label: 'ซ.', text: 'เขียว / เขียว' }
            ],
            children: []
          },
          {
            id: '202.2.5.8',
            type: NodeType.SUB_QUESTION,
            q: 'ไฟแสดงเป้าถูกทําลาย \"Kill\"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'จะแสดงเมื่อเป้าได้ถูกทําลายแล้ว' },
              { checked: true, label: 'ซ.', text: 'เขียว / เขียว' }
            ],
            children: []
          },
          {
            id: '202.2.5.9',
            type: NodeType.SUB_QUESTION,
            q: 'ไฟแสดงกําลังติดตามเป้า \"Track\"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'จะติดสีเขียวเมื่อเรดาร์ได้ทําการติดตามเป้าแล้วโดยสายอากาศ Track' },
              { checked: true, label: 'ซ.', text: 'เขียว / -' }
            ],
            children: []
          }
        ]
      },
      {
        id: '202.2.6',
        type: NodeType.QUESTION,
        q: 'ภาคส่วนสถานะระบบ \"System Status Section\"',
        optionsHeader: true,
        checkboxes: [true, true, false, false, false, false, false, false],
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'ใช้แสดงสถานะของระบบ' },
          { checked: true, label: 'ข.', text: 'อยู่มุมบนด้านขวาของแผงควบคุม LCP' }
        ],
        children: [
          {
            id: '202.2.6.1',
            type: NodeType.SUB_QUESTION,
            q: 'ไฟแสดง \"Local/Remote\"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ไฟ Local ติดสีขาวแสดงว่าควบคุมโดย LCP ไฟ Remote ติดสีขาวแสดงว่าควบคุมโดย RCP' },
              { checked: true, label: 'ซ.', text: 'ขาว / ขาว' }
            ],
            children: []
          },
          {
            id: '202.2.6.2',
            type: NodeType.SUB_QUESTION,
            q: 'ไฟแสดง \"Go/No Go\"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ถ้าไฟ GO ติดสีเขียวแสดงว่าการทำงานของระบบถูกต้อง ถ้าไฟ NO GO ติดสีแดงแสดงว่าการทำงานของระบบไม่ถูกต้อง ถ้าอยู่ในโหมดการซ่อม ถ้าไฟ GO ติดแสดงว่าการตรวจสอบระบบผ่าน ถ้าไฟ NO GO ติดแสดงว่าระบบมีการขัดข้อง' },
              { checked: true, label: 'ซ.', text: 'เขียว / แดง' }
            ],
            children: []
          },
          {
            id: '202.2.6.3',
            type: NodeType.SUB_QUESTION,
            q: 'ไฟแสดง \"Relative COORD/True COORD\"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ถ้าหลอดไฟดวงใดติดแสดงว่าข้อมูลเป้าหมายที่แสดงออกมาเป็นเทียบทิศเหนือจริงหรือเทียบกับทิศหัวเรือ' },
              { checked: true, label: 'ซ.', text: 'ขาว / ขาว' }
            ],
            children: []
          },
          {
            id: '202.2.6.4',
            type: NodeType.SUB_QUESTION,
            q: 'ไฟแสดง \"Air System Normal/Air System Abnormal\"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ถ้าไฟ NORMAL ติดสีเขียวแสดงว่าสถานะของอากาศหมุนเวียนในระบบและการไหลของน้ำทะเลเป็นไปอย่างปกติ ถ้าติด ABNORMAL แสดงว่าระบบทั้งสองหรืออย่างใดอย่างหนึ่งผิดปกติ' },
              { checked: true, label: 'ซ.', text: 'เขียว / -' }
            ],
            children: []
          },
          {
            id: '202.2.6.5',
            type: NodeType.SUB_QUESTION,
            q: 'ไฟแสดง \"Mount Motion Inhibit\"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ไฟติดสีเหลืองเมื่อสวิตช์ SAFE/Operate/Reload อยู่ในตำแหน่ง SAFE หรือ Reload ไฟจะติดในโหมด Standby หรือสูงกว่า' },
              { checked: true, label: 'ซ.', text: 'เหลือง / เหลือง' }
            ],
            children: []
          },
          {
            id: '202.2.6.6',
            type: NodeType.SUB_QUESTION,
            q: 'ไฟแสดง \"Radome Temp Normal/Radome Temp Abnormal\"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ไฟ NORMAL สีเขียวแสดงว่าอุณหภูมิภายใน Radome ปกติ ถ้าอุณหภูมิสูงกว่าเกณฑ์จะติด ABNORMAL สีเหลือง' },
              { checked: true, label: 'ซ.', text: 'เขียว / เหลือง' }
            ],
            children: []
          },
          {
            id: '202.2.6.7',
            type: NodeType.SUB_QUESTION,
            q: 'ไฟแสดง \"WCG Data Error/RCP Data Error\"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ถ้า RCP Data Error ติดสีแดงเมื่อการส่งข้อมูลระหว่าง RCP และ LCP ไม่ถูกต้อง ถ้า WCG Data Error ติดสีแดงเมื่อการส่งข้อมูลระหว่าง WCG และ LCP ไม่ถูกต้อง' },
              { checked: true, label: 'ซ.', text: 'แดง / แดง' }
            ],
            children: []
          },
          {
            id: '202.2.6.8',
            type: NodeType.SUB_QUESTION,
            q: 'ไฟแสดง \"Gun Status Go/Gun Status No Go\"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ในโหมดการทำงาน AIR Ready หรือโหมดที่สูงกว่า ไฟ GO ติดสีเขียวแสดงว่าปืนอยู่ในตำแหน่ง ARMED และปืนพร้อมยิง ถ้าไฟ NO GO ติดสีแดงแสดงว่าปืนไม่อยู่ในตำแหน่ง ARMED หรือสถานะปืนไม่พร้อมยิง' },
              { checked: true, label: 'ซ.', text: 'เขียว / แดง' }
            ],
            children: []
          },
          {
            id: '202.2.6.9',
            type: NodeType.SUB_QUESTION,
            q: 'ไฟแสดง \"Gun Bore Clear\"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ไฟแสดงติดสีเขียวเมื่อไม่มีลูกปืนหรือลองเปล่าอยู่ในลำกล้อง ลูกเลื่อนจะอยู่ใน clearing cam path ในโหมดการทำงาน AIR Ready หรือสูงกว่า' },
              { checked: true, label: 'ซ.', text: 'เขียว / เขียว' }
            ],
            children: []
          },
          {
            id: '202.2.6.10',
            type: NodeType.SUB_QUESTION,
            q: 'ไฟแสดง \"Fire CKT OPEN/CB OPEN\"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'FIRE CKT Open จะติดสีแดงเมื่อกุญแจตัด/ต่อไฟยิงที่ 2A5 อยู่ในตำแหน่ง Open ส่วน CB Open จะติดสีแดงเมื่อ Circuit breaker ตัวใดตัวหนึ่งหรือหลายตัวที่ PSCG ของตู้ Electronic enclosure อยู่ในตำแหน่ง Open' },
              { checked: true, label: 'ซ.', text: 'แดง / แดง' }
            ],
            children: []
          }
        ]
      },
      {
        id: '202.2.7',
        type: NodeType.QUESTION,
        q: 'ภาคส่วนคุณสมบัติของเป้า \"Target Data Section\"',
        optionsHeader: true,
        checkboxes: [true, true, false, false, false, false, false, false],
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'แสดงข้อมูลต่างๆ ของเป้า' },
          { checked: true, label: 'ข.', text: 'อยู่มุมด้านบนขวาของแผงด้านหน้า' }
        ],
        children: [
          {
            id: '202.2.7.1',
            type: NodeType.SUB_QUESTION,
            q: 'ตัวแสดงผลระยะ \"Range\"',
            checkboxes: [true, false, false, false, false, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'แสดงข้อมูลระยะของเป้าเป็นหลา' }
            ],
            children: []
          },
          {
            id: '202.2.7.2',
            type: NodeType.SUB_QUESTION,
            q: 'ตัวแสดงผลความเร็ว \"Range Rate\"',
            checkboxes: [true, false, false, false, false, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'แสดงข้อมูลความเร็วของเป้าเป็นน็อต' }
            ],
            children: []
          },
          {
            id: '202.2.7.3',
            type: NodeType.SUB_QUESTION,
            q: 'ตัวแสดงผลแบริ่ง \"Bearing\"',
            checkboxes: [true, false, false, false, false, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'แสดงข้อมูลมุมของเป้า (Bearing) เป็นแบริ่งจริงหรือแบริ่งสัมพันธ์ ขึ้นอยู่กับการเลือก มีหน่วยเป็นองศา' }
            ],
            children: []
          },
          {
            id: '202.2.7.4',
            type: NodeType.SUB_QUESTION,
            q: 'ตัวแสดงผลความสูง \"Height\"',
            checkboxes: [true, false, false, false, false, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'แสดงความสูงของเป้า มีหน่วยเป็นฟุต' }
            ],
            children: []
          }
        ]
      },
      {
        id: '202.2.8',
        type: NodeType.QUESTION,
        q: 'ภาคส่วนคุณลักษณะของเป้า \"Engagement Criteria\"',
        optionsHeader: true,
        checkboxes: [true, true, false, false, false, false, false, false],
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'เพื่อให้มีการเลือกป้อนข้อมูลคุณลักษณะเป้าที่จะต่อตี engagement criteria' },
          { checked: true, label: 'ข.', text: 'มุมด้านล่างซ้ายของแผงควบคุมด้านหน้า LCP' }
        ],
        children: [
          {
            id: '202.2.8.1',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกด \"Change Coord\"',
            checkboxes: [true, false, false, false, false, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เมื่อกดปุ่มนี้จะเลือกแบริ่งจริงหรือแบริ่งสัมพันธ์' }
            ],
            children: []
          },
          {
            id: '202.2.8.2',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกด \"First Hit Range\"',
            checkboxes: [true, false, false, true, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เมื่อกดปุ่มนี้เพื่อให้พนักงาน LCP ป้อนข้อมูลระยะกระสุนเริ่มต้นกระทบเป้า' },
              { checked: true, label: 'ง.', text: 'AIR Ready, AAW Manual, AAW Auto' },
              { checked: true, label: 'ซ.', text: 'ขาว / -' }
            ],
            children: []
          },
          {
            id: '202.2.8.3',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกด \"Maximum Range Rate\"',
            checkboxes: [true, false, false, true, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'กดปุ่มนี้ไฟจะติดสีขาวและเพื่อให้พนักงาน LCP ป้อนค่าความเร็วสูงสุดที่จะทำการต่อสู้' },
              { checked: true, label: 'ง.', text: 'AIR Ready, AAW Manual, AAW Auto' },
              { checked: true, label: 'ซ.', text: 'ขาว / -' }
            ],
            children: []
          },
          {
            id: '202.2.8.4',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกด \"Minimum Range Rate\"',
            checkboxes: [true, false, false, true, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เมื่อกดปุ่มนี้ไฟจะติดสีขาวเพื่อให้พนักงาน LCP ป้อนค่าความเร็วต่ำสุดของเป้าที่ จะทำการต่อสู้' },
              { checked: true, label: 'ง.', text: 'AIR Ready, AAW Manual, AAW Auto' },
              { checked: true, label: 'ซ.', text: 'ขาว / -' }
            ],
            children: []
          },
          {
            id: '202.2.8.5',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกด \"Bearing/Enter Bearing\"',
            checkboxes: [true, false, false, true, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เมื่อกดปุ่มนี้ไฟแบริ่งจะติดสีขาวใช้สำหรับป้อนค่าความเร็วต่ำสุดของเป้าที่ Search Sector โดยใช้ LCP Keyboard และสวิตช์ Sector Selector' },
              { checked: true, label: 'ง.', text: 'AIR Ready, AAW Manual, AAW Auto' },
              { checked: true, label: 'ซ.', text: 'ขาว / -' }
            ],
            children: []
          },
          {
            id: '202.2.8.6',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกด \"Width\"',
            checkboxes: [true, false, false, true, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'สําหรับป้อนค่าความกว้างของมุม NO Engage หรือ Search Sector โดยใช้ LCP Keyboard และสวิตช์ Sector Selector' },
              { checked: true, label: 'ง.', text: 'AIR Ready, AAW Manual, AAW Auto' },
              { checked: true, label: 'ซ.', text: 'ขาว / -' }
            ],
            children: []
          },
          {
            id: '202.2.8.7',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกด \" Sector Selector\"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'สําหรับให้พนักงาน Lcp เลือก No Engage Sector หรือ Search Sector เพื่อ ป้อนค่ามุมและความกว้างที่จะทําการ แพร่/งดแพร่คลื่น เรดาร์ที่ Lcp Keyboard' },
              {
                checked: true,
                label: 'ซ.',
                text: 'เลือกประเภท Sector และกำหนดความกว้าง ดังนี้',
                table: {
                  headers: ['Sectors (Name)', 'Width (Degrees)'],
                  rows: [
                    ['No Engage Sector 1', '0-359 องศา'],
                    ['No Engage Sector 2', '0-60 องศา'],
                    ['No Engage Sector 3', '0-60 องศา'],
                    ['Search Sector', '0-360 องศา']
                  ]
                }
              }
            ],
            children: []
          }
        ]
      },
      {
        id: '202.2.9',
        type: NodeType.QUESTION,
        q: 'ภาคส่วนคอมพิวเตอร์ \"Computer Input Section\"',
        optionsHeader: true,
        checkboxes: [true, true, false, false, false, false, false, false],
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'ป้อนหรือเรียกข้อมูลจากคอมพิวเตอร์' },
          { checked: true, label: 'ข.', text: 'มุมล่างด้านซ้ายของตู้ LC' }
        ],
        children: [
          {
            id: '202.2.9.1',
            type: NodeType.SUB_QUESTION,
            q: 'ปุ่มกดไฟแสดง \"Code (Readout)\"',
            checkboxes: [true, false, false, false, false, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'แสดง CODE ที่เลือกที่จะป้อนเข้าคอมพิวเตอร์' }
            ],
            children: []
          },
          {
            id: '202.2.9.2',
            type: NodeType.SUB_QUESTION,
            q: 'ปุ่มกดไฟแสดง \"Data Error\"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ในโหมด AIR Ready หรือสูงกว่า ไฟติดสีแดงเมื่อ WCG หรือ LCP ตรวจพบว่า พนักงาน LCP ป้อนค่าไม่ถูกต้อง' },
              { checked: true, label: 'ซ.', text: 'แดง / -' }
            ],
            children: []
          },
          {
            id: '202.2.9.3',
            type: NodeType.SUB_QUESTION,
            q: 'ปุ่มกดไฟแสดง \"Code/Data\"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ในโหมด AIR Ready หรือสูงกว่า มีเพื่อให้พนักงาน LCP ป้อนค่า Code ลงใน WCG หรือป้อนค่า/เรียกค่าข้อมูลออกมาดูตามฟังก์ชัน CODE' },
              { checked: true, label: 'ซ.', text: 'ขาว / ขาว' }
            ],
            children: []
          },
          {
            id: '202.2.9.4',
            type: NodeType.SUB_QUESTION,
            q: 'ปุ่มกดไฟแสดง \"Data\"',
            checkboxes: [true, false, false, false, false, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'แสดงผลข้อมูลที่ป้อนไปยัง WCG หรือเรียกค่าออกมาดูจากหน่วยความจำของคอมพิวเตอร์' }
            ],
            children: []
          },
          {
            id: '202.2.9.5',
            type: NodeType.SUB_QUESTION,
            q: 'ปุ่มกดตัวเลข \"0 ถึง 9\"',
            checkboxes: [true, false, false, false, false, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เป็นปุ่มตัวเลขสำหรับการป้อนค่าต่างๆ (รวมทั้งเครื่องหมาย +, -)' }
            ],
            children: []
          },
          {
            id: '202.2.9.6',
            type: NodeType.SUB_QUESTION,
            q: 'ปุ่มกด \"Enter\"',
            checkboxes: [true, false, false, false, false, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ใช้สำหรับเริ่มต้นการติดต่อกับคอมพิวเตอร์ ส่งค่าที่ป้อนไว้' }
            ],
            children: []
          },
          {
            id: '202.2.9.7',
            type: NodeType.SUB_QUESTION,
            q: 'ปุ่มกด \"Code\"',
            checkboxes: [true, false, false, false, false, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เมื่อกดจะยอมให้มีการป้อนรหัสของ code ที่จะป้อนเข้าให้คอมพิวเตอร์' }
            ],
            children: []
          },
          {
            id: '202.2.9.8',
            type: NodeType.SUB_QUESTION,
            q: 'ปุ่มกด \"Recall\"',
            checkboxes: [true, false, false, false, false, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ใช้สำหรับเรียกข้อมูลการทำงานหรือการซ่อมที่เก็บในหน่วยความจำสัมพันธ์กับ CODE' }
            ],
            children: []
          },
          {
            id: '202.2.9.9',
            type: NodeType.SUB_QUESTION,
            q: 'ปุ่มกด \"Clear\"',
            checkboxes: [true, false, false, false, false, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ใช้สำหรับลบค่าข้อมูลที่แสดงผลเมื่อต้องการเปลี่ยนค่า' }
            ],
            children: []
          }
        ]
      },
      {
        id: '202.2.10',
        type: NodeType.QUESTION,
        q: 'ภาคส่วนควบคุมระบบ \"System Control Section\"',
        optionsHeader: true,
        checkboxes: [true, true, false, false, false, false, false, false],
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'ควบคุมระบบเกี่ยวกับความปลอดภัย' },
          { checked: true, label: 'ข.', text: 'มุมล่างซ้ายของตู้ LCP' }
        ],
        children: [
          {
            id: '202.2.10.1',
            type: NodeType.SUB_QUESTION,
            q: 'หัวคอนเน็คแท่นยิงปลอดภัย \"Mount Safety connector\"',
            checkboxes: [true, false, false, false, false, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เมื่อถอดออกจะห้ามการหันของแท่นปืนและไฟยิง เมื่อใส่จะทำให้การทำงานของปืนเป็นไปอย่างปกติ' }
            ],
            children: []
          },
          {
            id: '202.2.10.2',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกดเลือกขั้นการทํางาน \"STBY MAINT/OPERATE\"',
            checkboxes: [true, false, false, false, false, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ในตำแหน่ง Operate จะพร้อมต่อเป้าหมาย และตำแหน่ง STBY/MAINT สำหรับการควบคุมที่ RCP และเกี่ยวกับโหมดการซ่อม' }
            ],
            children: []
          },
          {
            id: '202.2.10.3',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกดข้ามขั้นตอน \"Battle Shot\"',
            checkboxes: [true, false, false, false, true, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เมื่อกดปุ่มจะส่งสัญญาณไปที่ PSCG และ WCG เพื่อข้ามสัญญาณ Inter Lock ต่างๆ ของระบบ' },
              { checked: true, label: 'จ.', text: 'มีฝาครอบที่สวิตช์' },
              { checked: true, label: 'ซ.', text: 'แดง / -' }
            ],
            children: []
          }
        ]
      },
      {
        id: '202.2.11',
        type: NodeType.QUESTION,
        q: 'ภาคส่วนควบคุมแท่นยิง \"Mount Control Section\"',
        optionsHeader: true,
        checkboxes: [true, true, false, false, false, false, false, false],
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'เพื่อควบคุมปืนที่ LCP' },
          { checked: true, label: 'ข.', text: 'อยู่มุมล่างขวาของตู้ LCP' }
        ],
        children: [
          {
            id: '202.2.11.1',
            type: NodeType.SUB_QUESTION,
            q: 'ตัวแสดงผลมุมหัน \"Train Indicator\"',
            checkboxes: [true, false, false, false, false, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'แสดงมุมหันของแท่นปืนเป็นองศาเทียบทิศหัวเรือ' }
            ],
            children: []
          },
          {
            id: '202.2.11.2',
            type: NodeType.SUB_QUESTION,
            q: 'ตัวแสดงผลมุมกระดก \"Elevation Indicator\"',
            checkboxes: [true, false, false, false, false, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'แสดงมุมกระดกของปืนเป็นองศาเทียบ Deck Plane' }
            ],
            children: []
          },
          {
            id: '202.2.11.3',
            type: NodeType.SUB_QUESTION,
            q: 'ปุ่มไฟแสดงแท่นยิงอยู่ในขั้นการทํางานแบบโลคอล \"Mount Local Control Indicator\"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เมื่อกดจะควบคุมปืนแบบ Local โดยการหมุนหน้าปัดมุมหันและกระดกปืนตามต้องการ' },
              { checked: true, label: 'ซ.', text: 'ขาว / -' }
            ],
            children: []
          },
          {
            id: '202.2.11.4',
            type: NodeType.SUB_QUESTION,
            q: 'ปุ่มไฟแสดงเสียงสัญญาณเตือนระวังแท่นยิง \"Mount Warning Indicator\"',
            checkboxes: [true, false, false, false, false, true, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เมื่อกดจะส่งสัญญาณเสียงไปที่แท่นปืนว่า จะมีการหันและกระดกปืน' },
              { checked: true, label: 'ฉ.', text: 'เพื่อเตือนผู้คนไม่ให้อยู่ใกล้แท่นปืน' },
              { checked: true, label: 'ซ.', text: 'แดง / -' }
            ],
            children: []
          },
          {
            id: '202.2.11.5',
            type: NodeType.SUB_QUESTION,
            q: 'จานบอกมุมหัน/กระดกแท่นยิง \"Train/Elevation Synchro Dials\"',
            checkboxes: [true, false, false, false, false, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'จะทํางานในโหมด Maintenance และกดปุ่ม Mount Control และควบคุมการหัน-กระดกปืนโดยใช้หน้าปัดซินโคร' }
            ],
            children: []
          }
        ]
      },
      {
        id: '202.2.12',
        type: NodeType.QUESTION,
        q: 'ภาคส่วนควบคุมการยิง \"Fire Control Section\"',
        optionsHeader: true,
        checkboxes: [true, true, false, false, false, false, false, false],
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'ควบคุมเงื่อนไขในการยิง' },
          { checked: true, label: 'ข.', text: 'มุมขวาล่างของตู้ LCP' }
        ],
        children: [
          {
            id: '202.2.12.1',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกดเลือกยิงชุด \"Burst 60/Burst 100\"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เป็นปุ่มเลือกว่าจะยิงชุด 100 หรือ 60 นัด ขณะทําการยิง PAC Fire Mode' },
              { checked: true, label: 'ซ.', text: 'ขาว / ขาว' }
            ],
            children: []
          },
          {
            id: '202.2.12.2',
            type: NodeType.SUB_QUESTION,
            q: 'ตัวแสดงผลจํานวนลูกปืนคงเหลือ \"Rounds Remaining\"',
            checkboxes: [true, false, false, false, false, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'แสดงลูกปืนที่เหลืออยู่ในระบบบรรจุ' }
            ],
            children: []
          },
          {
            id: '202.2.12.3',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกดหยุดติดตามเป้า \"Break Engage\"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เมื่อกดปุ่มนี้ไฟจะติดสีเหลืองเมื่อ WCG คอมพิวเตอร์รับทราบว่ามีการขัดจังหวะโปรแกรมการทํางาน' },
              { checked: true, label: 'ซ.', text: 'เหลือง / -' }
            ],
            children: []
          },
          {
            id: '202.2.12.4',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกดการขึ้นนก \"PRE ARM/ARM/SAFE\"',
            checkboxes: [true, false, false, false, true, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'มีหน้าที่ใช้สำหรับ Mode AIR Ready หรือสูงกว่า เป็นการเลือกสถานะของปืนว่า SAFE หรือ ARM ไฟ PRE ARM และ ARM ติดสีแดงแสดงว่าเป็นการต่อวงจรไฟยิง ไฟ SAFE สีเขียวติดแสดงว่าเป็นการไม่ต่อวงจรไฟยิง' },
              { checked: true, label: 'จ.', text: 'เป็นสวิตช์ที่มีฝาครอบ' },
              { checked: true, label: 'ซ.', text: 'แดง / ไม่เขียว / -' }
            ],
            children: []
          },
          {
            id: '202.2.12.5',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกดหยุดยิง \"Hold Fire\"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เมื่อกดและควบคุมที่ LCP ถ้าไฟติดสีเหลืองเป็นการขัดจังหวะวงจรไฟยิง ถ้าดับแสดงว่ามีการต่อวงจรไฟยิง' },
              { checked: true, label: 'ซ.', text: 'เหลือง / -' }
            ],
            children: []
          },
          {
            id: '202.2.12.6',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกดยิง \"Fire\"',
            checkboxes: [true, false, false, false, true, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เมื่ออยู่ในโหมด AAW MANUAL และ PAC MODE จะกดปุ่มยิงก็ต่อเมื่อไฟ RECOMMEND FIRE ติด ปุ่ม FIRE ติดสีแดงเป็นการต่อวงจรไฟยิง ในโหมด AAW Auto แสดงว่าขณะนี้ปืนกำลังทําการยิง' },
              { checked: true, label: 'จ.', text: 'เป็นปุ่มที่มีฝาครอบ' },
              { checked: true, label: 'ซ.', text: 'แดง / -' }
            ],
            children: []
          }
        ]
      }
    ]
  },
  {
    id: '202.3',
    type: NodeType.SECTION,
    q: 'หลักการทํางาน',
    children: [
      {
        id: '202.3.1',
        type: NodeType.QUESTION,
        q: 'ส่วนประกอบต่างๆ ทํางานร่วมกันในระบบอย่างไร',
        answerCheckboxes: [
          { checked: true, text: 'LCP จะยอมให้มีการป้อนข้อมูลเพื่อตีเป้าไปใน WCG คอมพิวเตอร์ ถ้า RCP ไม่สามารถเดินเครื่องได้ LCP สามารถเป็นแผงควบคุมหลักของระบบได้นอกจากนั้น LCP ยังมีหน้าที่เกี่ยวกับการซ่อมบำรุงรักษาอีกด้วย' }
        ],
        children: []
      },
      {
        id: '202.3.2',
        type: NodeType.QUESTION,
        q: 'เมื่อระบบขัดข้องหรือทํางานผิดปกติ มีอะไรเป็นสิ่งบอกเหตุ',
        answerCheckboxes: [
          { checked: true, text: 'มีสิ่งบอกเหตุ ดังนี้' }
        ],
        subList: [
          'ไม่สามารถที่จะเริ่มต้นการทดสอบพิเศษได้',
          'ไม่สามารถป้อนข้อมูลทดสอบและข้อมูลต่อตีเป้าลงในคอมพิวเตอร์ได้',
          'ไม่สามารถเรียกค่าจุดทดสอบและข้อมูลระบบที่เสียออกมาดูได้',
          'ไม่สามารถแสดงผลสถานะและข้อมูลของระบบได้',
          'ไม่สามารถส่งข้อมูลทิศหัวเรือให้คอมพิวเตอร์ได้',
          'ไม่สามารถควบคุม Mode การทํางานต่างๆ ของระบบ CIWS ได้'
        ],
        children: []
      }
    ]
  },
  {
    id: '202.4',
    type: NodeType.SECTION,
    q: 'ค่าทํางานปกติ ค่าสูงสุด ต่ำสุด ของการทํางาน',
    description: '(ไม่ต้องอธิบาย)',
    children: []
  },
  {
    id: '202.5',
    type: NodeType.SECTION,
    q: 'การเชื่อมต่อระบบ',
    children: [
      {
        id: '202.5.1',
        type: NodeType.QUESTION,
        q: 'ถ้าขาดสิ่งดังต่อไปนี้จะมีผลกระทบต่อระบบอย่างไร',
        children: [
          {
            id: '202.5.1.1',
            type: NodeType.SUB_QUESTION,
            q: 'ไม่มีไฟฟ้าเรือจ่ายให้กับระบบ',
            answerCheckboxes: [
              { checked: true, text: 'LCP ไม่สามารถควบคุมได้' }
            ],
            children: []
          },
          {
            id: '202.5.1.2',
            type: NodeType.SUB_QUESTION,
            q: 'การส่งถ่ายข้อมูลภายใน Local Control Panel (LCP) ไม่ได้',
            answerCheckboxes: [
              { checked: true, text: 'LCP ไม่สามารถควบคุมได้' }
            ],
            children: []
          }
        ]
      },
      {
        id: '202.5.2',
        type: NodeType.QUESTION,
        q: 'LCP ทํางานร่วมกับคอมพิวเตอร์ WCG อย่างไร',
        answerCheckboxes: [
          { checked: true, text: 'โดยการรับ/ส่งข้อมูลระหว่างกันเพื่อที่จะควบคุมระบบโดย LCP' }
        ],
        children: []
      }
    ]
  },
  {
    id: '202.6',
    type: NodeType.SECTION,
    q: 'ข้อระมัดระวังอันตราย',
    children: [
      {
        id: '202.6.1',
        type: NodeType.QUESTION,
        q: 'มีข้อระมัดระวังอันตรายอะไรบ้าง ในการปฏิ บัติงาน ดังต่อไปนี้',
        children: [
          {
            id: '202.6.1.1',
            type: NodeType.SUB_QUESTION,
            q: 'การเลือกโหมดการทํางาน AIR READY',
            answerCheckboxes: [
              { checked: true, text: 'เมื่อเลือกโหมดนี้ปืนจะหมุนไปในตําแหน่ง AIR Ready ต้องแน่ใจว่ารอบๆ แท่นปืน ปราศจากผู้คนและต้องกดปุ่มเตือน Mount Warning ก่อนกดปุ่มนี้ ควรกดค้างไว้ประมาณ ๕ วินาที' }
            ],
            children: []
          },
          {
            id: '202.6.1.2',
            type: NodeType.SUB_QUESTION,
            q: 'การเลือกควบคุมการหมุนแท่นยิงแบบ LOCAL',
            answerCheckboxes: [
              { checked: true, text: 'เมื่อเลือกโหมดการทํางานนี้จะทําให้ปืนหันและกระดกไปตามค่าจากหน้าปัด TR และ EL Synchro Dials ก่อนเลือกโหมดนี้ต้องปรับ Synchro Dials ไปที่ตำแหน่งมุมที่ ต้องการและกดสัญญาณเตือนการหมุนของแท่นปืน Mount Warning อย่างน้อย ๕ วินาที' }
            ],
            children: []
          },
          {
            id: '202.6.1.3',
            type: NodeType.SUB_QUESTION,
            q: 'การเลือกขั้นการทํางาน AAW AUTO',
            answerCheckboxes: [
              { checked: true, text: 'ก่อนเลือกโหมดการทํางานนี้ต้องแน่ใจว่าไม่มีอากาศยานหรือเรือฝ่ายเดียวกันอยู่ใน ระยะ ๖ ไมล์ในแบริ่งที่จะทําการต่อตีเป้าเพราะถ้าเลือกโหมดนี้ CIWS จะทํางานตั้งแต่ค้นหา ติดตามและทําลายเป้าภายใต้เงื่อนไข โดยไม่มีสัญญาณเตือน' }
            ],
            children: []
          },
          {
            id: '202.6.1.4',
            type: NodeType.SUB_QUESTION,
            q: 'การเปลี่ยนสวิทช์ PRE ARM/ARM/SAFE ไว้ตําแหน่ง ARM',
            answerCheckboxes: [
              { checked: true, text: 'เมื่อสวิตช์อยู่ในตำแหน่ง ARM จะมีการต่อวงจรไฟยิงต้องไม่เปลี่ยนสวิตช์ให้อยู่ใน ตำแหน่ง ARM นอกเสียจากว่าจะทำการยิงและได้รับอนุญาตจากผู้มีอำนาจหน้าที่' }
            ],
            children: []
          }
        ]
      }
    ]
  }
];
