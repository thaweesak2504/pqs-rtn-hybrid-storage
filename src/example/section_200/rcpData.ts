// rcpData.ts - Extracted and normalized data for 203 Remote Control Panel
// Each node has a unique ID for SQLite compatibility
// Using data from 203_rcp.html

import { UINode, NodeType, DocumentMeta } from './types';

/**
 * Document metadata
 */
export const documentMeta: DocumentMeta = {
  id: '203',
  section_number: '๒๐๓',
  title: 'ระบบควบคุม Remote Control Panel (RCP) System',
  references: [
    'NAVSEA OP4154 CIWS Mk.15 Mods 1-6 (Phalanx) Vol.1 Pt.1,2',
    'NAVSEA OP4154 CIWS Mk.15 Mods 1-6 (Phalanx) Vol.2',
    'SW221-JO-MMO-010 thru 110, CIWS Mk.15 Mods 11-14'
  ]
};

export const rcpQuestions: UINode[] = [
  {
    id: '203.1',
    type: NodeType.SECTION,
    q: 'หน้าที่',
    children: [
      {
        id: '203.1.1',
        type: NodeType.QUESTION,
        q: 'ระบบนี้ทําหน้าที่อะไร',
        answerCheckboxes: [
          { checked: true, text: 'มีหน้าที่ควบคุมและแสดงสถานะของระบบ' }
        ],
        children: []
      }
    ]
  },
  {
    id: '203.2',
    type: NodeType.SECTION,
    q: 'ส่วนประกอบและชิ้นส่วนในส่วนประกอบของระบบ',
    isHeader: true,
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
        id: '203.2.1',
        type: NodeType.QUESTION,
        q: 'สวิตช์ปุ่มกดไฟแสดง "Battle Short"',
        checkboxes: [true, true, false, false, true, false, false, true],
        optionsHeader: true,
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'เมื่อกดปุ่มนี้จะส่งสัญญาณผ่าน LCP ไปยัง PSCG และ WCG เพื่อข้ามสัญญาณ Interlock ต่างๆ และไฟติดสีแดง' },
          { checked: true, label: 'ข.', text: 'อยู่บน RCP' },
          { checked: true, label: 'จ.', text: 'เป็นปุ่มที่มีฝาครอบ' },
          { checked: true, label: 'ซ.', text: 'แดง / แดง' }
        ],
        children: []
      },
      {
        id: '203.2.2',
        type: NodeType.QUESTION,
        q: 'สวิตช์ปุ่มกดไฟแสดง "Normal Sector Null"',
        checkboxes: [true, true, false, false, true, false, false, true],
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'เมื่อกดปุ่มนี้จะทำให้เครื่องควบคุมไม่สนใจข้อมูลที่ตั้งไว้ของ NO ระบบ Engagement Sector และ Search Sector ไฟแสดงสีขาว NORMAL, ไฟแสดงสีเหลือง (Sector Null)' },
          { checked: true, label: 'ข.', text: 'บน RCP Power Panel' },
          { checked: true, label: 'จ.', text: 'เป็นสวิตช์ ๒ ทางมีฝาครอบ' },
          { checked: true, label: 'ซ.', text: 'ขาว / ขาว, เหลือง / เหลือง' }
        ],
        children: []
      },
      // Additional questions would follow the same structure and using data from 203_rcp.html
      {
        id: '203.2.3',
        type: NodeType.QUESTION,
        q: 'สวิตช์กุญแจบิดเลือก การควบคุม "Rcp/Lcp"',
        checkboxes: [true, true, false, true, false, false, false, false],
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'ในตําแหน่ง RCP, RCP สามารถควบคุมการทํางานของระบบได้ถ้าไฟ STANDBY ติดและกุญแจสวิทช์ที่ LCP บิดไปที่ตําแหน่ง STBY/MAINT ในตําแหน่ง LCPจะควบคุมระบบ โดย LCP เท่านั้น (การหยุดการติดตามเป้าหมาย Break Engage สามารถควบคุมได้ทั้ง LCP และ RCP ทุกเวลา)' },
          { checked: true, label: 'ข.', text: 'บนแผงควบคุม RCP' },
          { checked: true, label: 'ง.', text: 'สามารถโอนาการควบคุมระบบจาก LCP ไปให้ RCP ได้' },
        ],
        children: []
      },
      {
        id: '203.2.4',
        type: NodeType.QUESTION,
        q: 'ตัวแสดงผลแบริ่ง "Bearing.....Deg"',
        checkboxes: [true, true, false, false, false, false, false, false],
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'แสดงมุมแบริ่งของเป้าหมายเป็นองศา' },
          { checked: true, label: 'ข.', text: 'บนแพงควบคุม RCP' },
        ],
        children: []
      },
      {
        id: '203.2.5',
        type: NodeType.QUESTION,
        q: 'ปุ่มไฟแสดง "Relative Coord/True Coord"',
        checkboxes: [true, true, false, false, false, false, false, true],
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'แสดงว่าพนักงานเลือกแบริ่งจริงหรือแบริ่งสัมพันธ์' },
          { checked: true, label: 'ข.', text: 'บนแผงควบคุม RCP' },
          { checked: true, label: 'ซ.', text: 'ขาว /ขาว' }
        ],
        children: []
      },
      {
        id: '203.2.6',
        type: NodeType.QUESTION,
        q: 'ปุ่มไฟแสดง "Local/Remote"',
        checkboxes: [true, true, false, false, false, false, false, true],
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'แสดงว่าเลือกการควบคุมแบบ LOCAL หรือ REMOTE' },
          { checked: true, label: 'ข.', text: 'บนแผงควบคุม RCP' },
          { checked: true, label: 'ซ.', text: 'ขาว /ขาว' }
        ],
        children: []
      },
      {
        id: '203.2.7',
        type: NodeType.QUESTION,
        q: 'ภาคส่วนควบคุมขั้นการทํางาน "Mode Control Section"',
        optionsHeader: true,
        checkboxes: [true, true, false, false, false, false, false, false],
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'ควบคุมโหมดในการทํางานต่างๆ ของระบบ CIWS' },
          { checked: true, label: 'ข.', text: 'บนแผงควบคุม RCP' }
        ],
        children: [
          {
            id: '203.2.7.1',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกดไฟแสดง "Standby"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เมื่อกดปุ่มนี้ไฟจะเปลี่ยนจากสีขาวเป็นสีเขียวเมื่อเงื่อนไข Standby พร้อม' },
              { checked: true, label: 'ซ.', text: 'ขาว / เขียว' }
            ],
            children: []
          },
          {
            id: '203.2.7.2',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกดไฟแสดง "Air Ready"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เมื่อกดปุ่มนี้จะทำให้ระบบ CIWS เข้าสู่ Mode Air Ready ไฟจะเปลี่ยนจากสีขาวเป็นสีเขียวเมื่อ WCG คอมพิวเตอร์สั่ง' },
              { checked: true, label: 'ซ.', text: 'ขาว / เขียว' }
            ],
            children: []
          },
          {
            id: '203.2.7.3',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกดไฟแสดง "Aaw Manual"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เมื่อกดปุ่มนี้จะทำให้ระบบ CIWS เข้าสู่ Mode AAW Manual ไฟจะเปลี่ยนจากสีขาวเป็นสีเขียวเมื่อ WCG คอมพิวเตอร์สั่งให้เข้าสู่โหมดนี้' },
              { checked: true, label: 'ซ.', text: 'ขาว / เขียว' }
            ],
            children: []
          },
          {
            id: '203.2.7.4',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกดไฟแสดง "Mount Warning"',
            checkboxes: [true, false, false, false, false, true, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เมื่อกดปุ่มนี้จะมีสัญญาณเสียงเตือนว่าจะเคลื่อนที่แท่นปืน ควรกดประมาณ 5 วินาทีก่อนที่จะกดโหมดหนึ่งโหมดใดที่ทำให้แท่นปืนมีการหมุน' },
              { checked: true, label: 'ฉ.', text: 'เป็นสัญญาณเสียงเตือนให้ไม่มีผู้ใดอยู่ใกล้บริเวณแท่นปืน' },
              { checked: true, label: 'ซ.', text: 'แดง / -' }
            ],
            children: []
          },
          {
            id: '203.2.7.5',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกดไฟแสดง "Auto Desig Enable"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เมื่อกดปุ่มนี้จะทำให้ Mode Remote Design ทำงานโดยอัตโนมัติ ไฟจะเปลี่ยนจากสีขาวเป็นสีเขียวเมื่อ WCG คอมพิวเตอร์สั่งให้เข้าสู่โหมดนี้' },
              { checked: true, label: 'ซ.', text: 'ขาว / เขียว' }
            ],
            children: []
          },
          {
            id: '203.2.7.6',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกดไฟแสดง "Aaw Auto"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เมื่อกดปุ่มนี้จะทำให้ WCG คอมพิวเตอร์สั่งให้ระบบ CIWS เข้าสู่ Mode AAW Auto ไฟจะเปลี่ยนจากสีขาวเป็นสีเขียว' },
              { checked: true, label: 'ซ.', text: 'ขาว / เขียว' }
            ],
            children: []
          },
          {
            id: '203.2.7.7',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกดไฟแสดง "Stow Engage/Stow Retract"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ควบคุมการเคลื่อนตัวเข้าออกของ STOW PIN ในตำแหน่ง STOW Engage ไฟจะติดสีเหลือง ในตำแหน่ง STOW Retract ไฟติดสีเขียว' },
              { checked: true, label: 'ซ.', text: 'เหลือง / เขียว' }
            ],
            children: []
          },
          {
            id: '203.2.7.8',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกดไฟแสดง "Remote Desig"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'จะกดปุ่มนี้ก็ต่อเมื่ออยู่ในโหมด AIR Ready หรือสูงกว่า จะส่งสัญญาณไปให้ WCG โดยไฟติดสีขาว และไฟจะเปลี่ยนเป็นสีเขียวเมื่อ WCG คอมพิวเตอร์เข้าสู่โหมดนี้ จะต่อสัญญาณ Synchro จากตัวชี้เป้าไปยังแท่นปืน ไฟแสดงสีเขียวดับแสดงว่า สายอากาศ Track ได้รับข้อมูลเป้าแล้ว (ไม่มีใช้งาน)' },
              { checked: true, label: 'ซ.', text: 'ขาว / เขียว' }
            ],
            children: []
          },
          {
            id: '203.2.7.9',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกดไฟแสดง "Surface"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เมื่อกดปุ่มนี้จะทำให้ระบบ CIWS เข้าสู่ Mode Surface ไฟจะเปลี่ยนจากสีขาวเป็นสีเขียว' },
              { checked: true, label: 'ซ.', text: 'ขาว / เขียว' }
            ],
            children: []
          },
        ]
      },
      {
        id: '203.2.8',
        type: NodeType.QUESTION,
        q: 'สวิตช์ปุ่มกดไฟแสดง "Sytem Status"',
        optionsHeader: true,
        checkboxes: [true, true, false, false, false, false, false, false],
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'แสดงผลสถานะของข้อมูลที่ทำการติดต่อ' },
          { checked: true, label: 'ข.', text: 'บนแผงควบคุม RCP' }
        ],
        children: [
          {
            id: '203.2.8.1',
            type: NodeType.SUB_QUESTION,
            q: 'ปุ่ไฟแสดง "Designate Alert"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ไฟจะติดแสดงสีเหลืองเมื่อข้อมูลเปลี่ยนจากที่อื่นส่งให้ระบบ CIWS แล้ว (ไม่มีใช้ )' },
              { checked: true, label: 'ซ.', text: 'เหลือง / -' }
            ],
            children: []
          },
          {
            id: '203.2.8.2',
            type: NodeType.SUB_QUESTION,
            q: 'ปุ่มไฟแสดง "Go/No Go"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'แสดงสถานะการทํางานของระบบไฟ GO ติดสีเขียวแสดงว่าการทํางานของ ระบบเป็นไปอย่างถูกต้องไฟ NO GO ติดสีเเดงแสดงว่าการทํางานของระบบไม่ถูกต้อง' },
              { checked: true, label: 'ซ.', text: 'เขียว / แดง' }
            ],
            children: []
          },
          {
            id: '203.2.8.3',
            type: NodeType.SUB_QUESTION,
            q: 'ปุ่มไฟแสดง "Maintenance"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ติดสีแดงเมื่อที่ LCP มีการกดสวิทช์ MAINT อยู่ในโหมดการซ่อมบำรุง' },
              { checked: true, label: 'ซ.', text: 'แดง / -' }
            ],
            children: []
          },
          {
            id: '203.2.8.4',
            type: NodeType.SUB_QUESTION,
            q: 'ปุ่มไฟแสดง "Transmission Error"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'จะกระพริบด้วยความถี่ 2 Hz เมื่อ RCP พบว่ามีการส่งข้อมูลผิดพลาด' },
              { checked: true, label: 'ซ.', text: 'แดง / -' }
            ],
            children: []
          },
          {
            id: '203.2.8.5',
            type: NodeType.SUB_QUESTION,
            q: 'ปุ่มไฟแสดง "Interference"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ไฟติดสีเหลืองเมื่อ WCG พบว่าเรดาห์ถูกรบกวน' },
              { checked: true, label: 'ซ.', text: 'เหลือง / -' }
            ],
            children: []
          },
        ]
      },
      {
        id: '203.2.9',
        type: NodeType.QUESTION,
        q: 'ภาคส่วนสถานะเข้าต่อตี "Engage Status"',
        optionsHeader: true,
        checkboxes: [true, true, false, false, false, false, false, false],
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'แสดงผลสถานะของข้อมูลที่ทำการต่อตี' },
          { checked: true, label: 'ข.', text: 'บนแผงควบคุม RCP' },
        ],
        children: [
          {
            id: '203.2.9.1',
            type: NodeType.SUB_QUESTION,
            q: 'ปุ่มไฟแสดง "Search"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ไฟแสดงสีเขียวติดเมื่อ Radar Search กําลังทํางาน' },
              { checked: true, label: 'ซ.', text: 'เขียว / -' }
            ],
            children: []
          },
          {
            id: '203.2.9.2',
            type: NodeType.SUB_QUESTION,
            q: 'ปุ่มไฟแสดง "Assign"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ไฟแสดงสีเขียวติดเมื่อคอมพิวเตอร์พบว่าข้อมูลเป้าได้เปลี่ยนจากสายอากาศ Search มาเป็นสายอากาศ Track โดยได้จากวงจร Track Processor' },
              { checked: true, label: 'ซ.', text: 'เขียว / -' }
            ],
            children: []
          },
          {
            id: '203.2.9.3',
            type: NodeType.SUB_QUESTION,
            q: 'ปุ่มไฟแสดง "Track"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ไฟแสดงสีเขียวติดเมื่อ WCG คอมพิวเตอร์พบว่าสายอากาศ Track กําลังติดตามเป้า' },
              { checked: true, label: 'ซ.', text: 'เขียว / -' }
            ],
            children: []
          },
          {
            id: '203.2.9.4',
            type: NodeType.SUB_QUESTION,
            q: 'ปุ่มไฟแสดง "Recommend Fire"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ไฟแสดงติดสีเหลืองเมื่อโปรแกรมปฏิบัติการ (Operational Program ) แนะนํา ให้พนักงาน LCP กดปุ่มยิง หรือข้อมูล PAC Fire ถูกค้นพบ (PAC MODE)' },
              { checked: true, label: 'ซ.', text: 'เหลือง / -' }
            ],
            children: []
          },
          {
            id: '203.2.9.5',
            type: NodeType.SUB_QUESTION,
            q: 'ปุ่มไฟแสดง "Gun Firing"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'จะติดสีแดงเมื่อขณะทําการยิง' },
              { checked: true, label: 'ซ.', text: 'แดง / -' }
            ],
            children: []
          },
        ]
      },
      {
        id: '203.2.10',
        type: NodeType.QUESTION,
        q: 'ภาคส่วนควบคุมการยิง "Fire Control Section"',
        optionsHeader: true,
        checkboxes: [true, true, false, false, false, false, false, false],
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'ควบคุมความปลอดภัยขณะทําการยิง ' },
          { checked: true, label: 'ข.', text: 'บนแผงควบคุม RCP' },
        ],
        children: [
          {
            id: '203.2.10.1',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกด "Break Engage"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เมื่อกดปุ่มนี้จะสั่งให้ WCG ขัดจังหวะการทํางานของโปรแกรมซึ่งทําการ ประมวลผลข้อมูลที่ทําการต่อตีเป้าและกลับไปสู่การทํางานของสายอากาศ Search และไฟจะ ติดสีขาวชั่วขณะเมื่อ WCG รับทราบคําสั่งนี้' },
              { checked: true, label: 'ซ.', text: 'ขาว / -' }
            ],
            children: []
          },
          {
            id: '203.2.10.2',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกด "Hold Fire"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เมื่อกดปุ่มนี้ไฟติดสีเหลืองแสดงว่ามีการขัดจังหวะวงจรไฟยิงเมื่อกดให้ดับแสดง ว่าวงจรไฟยิงทํางาน' },
              { checked: true, label: 'ซ.', text: 'เหลือง / -' }
            ],
            children: []
          },
          {
            id: '203.2.10.3',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกด "Pre Arm/Amn/Safe"',
            checkboxes: [true, false, false, false, true, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ใช้สําหรับ Mode Air Ready หรือสูงกว่าเป็นการเลือกสถานะของปืนว่า SAFE หรือ Armed ไฟ ARM/PRE ARM ติดสีแดงแสดงว่าวงจรไฟยิงทํางานไฟ Safe ติดสีเขียว แสดงว่าปืนอยู่ในตําแหน่ง Safe และเป็นการตัดวงจรไฟยิง' },
              { checked: true, label: 'จ.', text: 'ปุ่มที่มีฝาครอบ' },
              { checked: true, label: 'ซ.', text: 'แดง / -, เขียว / -' }
            ],
            children: []
          },
          {
            id: '203.2.10.4',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกด "Fire"',
            checkboxes: [true, false, false, false, true, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เมื่อกดปุ่มนี้ในโหมดการทํางาน AAW MANUAL Mode จะต่อวงจรไฟยิง ถ้าไฟ RECOMMEND FIRE ติด ไฟติดสีแดงเมื่อ LCP รับทราบการต่อวงจรไฟยิงใน AAW AUTO, AAW MANUAL หรือ SURFACE Mode' },
              { checked: true, label: 'จ.', text: 'เป็นสวิทช์แบบ กด - ปล่อย ที่มีฝาครอบ' },
              { checked: true, label: 'ซ.', text: 'แดง / -' }
            ],
            children: []
          },
        ]
      },
      {
        id: '203.2.11',
        type: NodeType.QUESTION,
        q: 'สวิตช์ปุ่มกดไฟแสดง "MWC ON/MWC OFF"',
        optionsHeader: true,
        checkboxes: [true, true, false, true, true, false, false, true],
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'ใช้ในกรณีที่มี CIWS หลายแท่น เพื่อป้องกันการต่อตีเป้าเดียวกัน OFF ไฟติดสี แดง ON ไฟติดสีเขียว' },
          { checked: true, label: 'ข.', text: 'บน RCP Power Panel' },
          { checked: true, label: 'ง.', text: 'AWW MANUAL และ AAW AUTO' },
          { checked: true, label: 'จ.', text: 'เป็นปุ่มที่มีฝาครอบ' },
          { checked: true, label: 'ซ.', text: 'เขียว / แดง' }
        ],
        children: []
      },
      {
        id: '203.2.12',
        type: NodeType.QUESTION,
        q: 'ภาคส่วนควบคุมไฟแสดง "Intensity Control Section"',
        optionsHeader: true,
        checkboxes: [true, true, false, false, false, false, false, false],
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'ควบคุมความเข้มของหลอดไฟและจอ Read Out' },
          { checked: true, label: 'ข.', text: 'บนตู้ RCP' },
        ],
        children: [
          {
            id: '203.2.12.1',
            type: NodeType.SUB_QUESTION,
            q: 'ปุ่มปรับความสว่าง "Lamp"',
            checkboxes: [true, false, false, false, false, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ปรับแต่งความเข้มของหลอดไฟและสวิทช์แสดงผลต่างๆ บน RCP ทั้งหมด' },
            ],
            children: []
          },
          {
            id: '203.2.12.2',
            type: NodeType.SUB_QUESTION,
            q: 'ปุ่มปรับความสว่าง "Readout"',
            checkboxes: [true, false, false, false, false, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ปรับแต่งความเข้มของตัวเลือกทั้งหมดบน RCP' },
            ],
            children: []
          },
        ]
      },
      {
        id: '203.2.13',
        type: NodeType.QUESTION,
        q: 'สวิตช์ปุ่มกด "Lamp Test"',
        optionsHeader: true,
        checkboxes: [true, true, false, false, false, false, false, false],
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'ใช้สำหรับทดสอบหลอดไฟต่าง ๆ ในแบบ "Primary/Alternate"' },
          { checked: true, label: 'ข.', text: 'บนแผงควบคุม RCP Power Panel' },
        ],
        children: [
          {
            id: '203.2.13.1',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ "Primary Color/Off/Alternate Color"',
            checkboxes: [true, false, false, false, false, false, true, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ประยุกต์ไฟเพื่อทดสอบหลอดไฟและตัวเลขแสดงผลทั้งหมดโดยทดสอบ Primary หรือ Alternate Color' },
              { checked: true, label: 'ช.', text: 'เพื่อประยุกต์ไฟเพื่อที่จะทดสอบหลอดไฟในแต่ละตำแหน่ง' },
            ],
            children: []
          },
          {
            id: '203.2.13.2',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ปุ่มกด "RCP"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ใส่คำตอบที่นี่' }, // ยังไม่ได้ใส่ข้อมูล
              { checked: true, label: 'ซ.', text: 'เลือก RCP เพื่อที่จะทําการทดสอบหลอดไฟ' },
            ],
            children: []
          },
        ]
      },
      {
        id: '203.2.14',
        type: NodeType.QUESTION,
        q: 'ภาคส่วนควบคุมการเดินระบบ "Power Control Section"',
        optionsHeader: true,
        checkboxes: [true, true, false, false, false, false, false, false],
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'ประยุกต์และเลิกไฟให้กับ RCP' },
          { checked: true, label: 'ข.', text: 'บน RCP Power Panel' },
        ],
        children: [
          {
            id: '203.2.14.1',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ "Power Off (avail)',
            checkboxes: [true, false, false, false, false, false, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เลิกไฟให้กับ RCP ไฟติดแสดงสีเหลืองติดแสดงว่า Power พร้อมที่จะใช้งาน' },
            ],
            children: []
          },
          {
            id: '203.2.14.2',
            type: NodeType.SUB_QUESTION,
            q: 'สวิตช์ "Power On"',
            checkboxes: [true, false, false, false, false, false, false, true],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'เมื่อกดปุ่มนี้ประยุกต์ไฟให้กับ RCP ไฟติดสีขาวแสดงว่าได้ประยุกต์ไฟให้กับ RCP แล้ว' },
              { checked: true, label: 'ซ.', text: 'ขาว / -' },
            ],
            children: []
          },
          {
            id: '203.2.14.3',
            type: NodeType.SUB_QUESTION,
            q: 'ปุ่มกด "CB1"',
            checkboxes: [true, false, true, false, false, true, false, false],
            answerCheckboxes: [
              { checked: true, label: 'ก.', text: 'ในตําแหน่งกดลงแสดงว่าได้จ่ายไฟ 115V. 60Hz ไปยัง Power Off (avail) Switch และ Power On Switch' },
              { checked: true, label: 'ค.', text: 'มาจากแผงสวิทช์บอร์ดเรือ' },
              { checked: true, label: 'ฉ.', text: 'ป้องกันการ Overload' },
            ],
            children: []
          },
        ]
      },
      {
        id: '203.2.15',
        type: NodeType.QUESTION,
        q: 'มิเตอร์เวลา "Total Time"',
        optionsHeader: true,
        checkboxes: [true, true, false, false, false, false, false, false],
        answerCheckboxes: [
          { checked: true, label: 'ก.', text: 'แสดงเวลาทั้งหมดที่เดินเครื่อง' },
          { checked: true, label: 'ข.', text: 'บน RCP Power Panel' },
        ],
        children: []
      },
    ]
  },
  {
    id: '203.3',
    type: NodeType.SECTION,
    q: 'หลักการทํางาน',
    children: [
      {
        id: '203.3.1',
        type: NodeType.QUESTION,
        q: 'ส่วนประกอบต่างๆ ทํางานร่วมกันในระบบอย่างไร',
        answerCheckboxes: [
          { checked: true, text: 'RCP จะควบคุมและแสดงผลของระบบ CIWS โดยควบคุมจากห้องศูนย์ยุทธการ (CIC)' }
        ],
        children: []
      },
      {
        id: '203.3.2',
        type: NodeType.QUESTION,
        q: 'เมื่อระบบขัดข้องหรือทํางานผิดปกติ มีอะไรเป็นสิ่งบอกเหตุ',
        answerCheckboxes: [
          { checked: true, text: 'ไม่สามารถควบคุมโหมดในการทํางานและการแสดงผล' }
        ],
        children: []
      }
    ]
  },
  {
    id: '203.4',
    type: NodeType.SECTION,
    q: 'ค่าทํางานปกติ ค่าสูงสุด ต่ำสุด ของการทํางาน',
    description: '(ไม่ต้องอธิบาย)',
    children: []
  },
  {
    id: '203.5',
    type: NodeType.SECTION,
    q: 'การเชื่อมต่อระบบ',
    children: [
      {
        id: '203.5.1',
        type: NodeType.QUESTION,
        q: 'ไม่มีไฟฟ้าเรือจ่ายให้กับระบบ',
        answerCheckboxes: [
          { checked: true, text: 'ไม่สามารถเดินระบบ RCP ได้' }
        ],
        children: []
      },
      {
        id: '203.5.2',
        type: NodeType.QUESTION,
        q: 'การส่งถ่ายข้อมูลภายใน Remote Control Panel (RCP) ไม่ได้',
        answerCheckboxes: [
          { checked: true, text: 'ไม่สามารถเดินระบบ RCP ได้' }
        ],
        children: []
      }
    ]
  },
  {
    id: '203.6',
    type: NodeType.SECTION,
    q: 'ข้อระมัดระวังอันตราย',
    children: [
      {
        id: '203.6.1',
        type: NodeType.QUESTION,
        q: 'มีข้อระมัดระวังอันตรายอะไรบ้าง ในการปฏิ บัติงาน ดังต่อไปนี้',
        children: [
          {
            id: '203.6.1.1',
            type: NodeType.SUB_QUESTION,
            q: 'การเลือกโหมดการทํางาน AIR READY',
            answerCheckboxes: [
              { checked: true, text: 'ต้องแน่ใจว่าบริเวณรอบๆ แท่นปืนต้องปราศจากผู้คนก่อนเลือกโหมดนี้ ต้องกด Mount Warning ประมาณ ๕ วินาที' }
            ],
            children: []
          },
          {
            id: '203.6.1.2',
            type: NodeType.SUB_QUESTION,
            q: 'การเลือกขั้นการทํางาน AAW AUTO',
            answerCheckboxes: [
              { checked: true, text: 'เมื่อเลือกโหมดนี้ต้องแน่ใจว่าต้องไม่มีอากาศยานหรือเรือฝ่ายเดียวกันอยู่อย่างน้อย ๖ ไมล์ในมุมที่ทำการต่อตีเป้า เพราะถ้าเลือกโหมดนี้ระบบ CIWS จะทำงานเต็มระบบตั้งแต่ค้นหา ตรวจจับ ติดตามต่อตีเป้า และทำการยิงโดยอัตโนมัติ' }
            ],
            children: []
          },
          {
            id: '203.6.1.3',
            type: NodeType.SUB_QUESTION,
            q: 'การเปลี่ยนสวิทช์ PRE ARM/ARM/SAFE ไว้ตําแหน่ง ARM',
            answerCheckboxes: [
              { checked: true, text: 'เมื่อสวิตช์อยู่ในตำแหน่ง ARM จะมีการต่อวงจรไฟยิง การยิงอาจเกิดขึ้นได้ถ้าเงื่อนไขการยิงอื่นๆ พร้อม ต้องไม่เปลี่ยนสวิตช์ให้อยู่ในตำแหน่ง ARM นอกจากทำการยิง หรือได้รับอนุญาตจากผู้มีอำนาจหน้าที่เท่านั้น' }
            ],
            children: []
          }
        ]
      }
    ]
  }
];