import { UINode, NodeType } from '../section_200/types';

export const ciwsBasicData: UINode[] = [
  {
    id: "104.1",
    type: NodeType.QUESTION,
    q: "ตำแหน่ง AIR READY เทียบกับตำแหน่งเก็บแท่นยิง (คู่มือติดตั้งระบบของหน่วย)",
    answerCheckboxes: [
      {
        checked: true,
        text: "ขึ้นอยู่กับตำแหน่งที่ติดตั้งของแต่ละหน่วย"
      }
    ],
    children: []
  },
  {
    id: "104.2",
    type: NodeType.QUESTION,
    q: "อธิบายอุปกรณ์เครื่องช่วยที่มีความจำเป็นต่อระบบ CIWS ดังต่อไปนี้ (คู่มือติดตั้งระบบของหน่วย)",
    children: [
      {
        id: "104.2.1",
        type: NodeType.SUB_QUESTION,
        q: "ไฟฟ้ากำลังที่ใช้จากเรือ",
        answerCheckboxes: [
          {
            checked: true,
            text: "ขึ้นอยู่กับตำแหน่งที่ติดตั้งของแต่ละหน่วย"
          }
        ],
        children: []
      },
      {
        id: "104.2.2",
        type: NodeType.SUB_QUESTION,
        q: "เข็มทิศเรือ (CQO)",
        answerCheckboxes: [
          {
            checked: true,
            text: "ขึ้นอยู่กับตำแหน่งที่ติดตั้งของแต่ละหน่วย"
          }
        ],
        children: []
      },
      {
        id: "104.2.3",
        type: NodeType.SUB_QUESTION,
        q: "ระบบน้ำทะเล/น้ำชิล ที่ใช้ในการระบายความร้อนระบบ",
        answerCheckboxes: [
          {
            checked: true,
            text: "ขึ้นอยู่กับตำแหน่งที่ติดตั้งของแต่ละหน่วย"
          }
        ],
        children: []
      }
    ]
  },
  {
    id: "104.3",
    type: NodeType.QUESTION,
    q: "คำอธิบายทิศทางการหมุน และอัตราเร็วในการยิงของปืน 20 mm. (ก., ค.)",
    answerCheckboxes: [
      {
        checked: true,
        text: "ทิศทางทวนเข็มนาฬิกา (มองจากด้านท้ายปืน) อัตราเร็วในการยิง ๓,๐๐๐ นัดต่อนาที (อ้างอิง ๑,๓)"
      }
    ],
    children: []
  },
  {
    id: "104.4",
    type: NodeType.QUESTION,
    q: "ความสามารถในการบรรจุ จำนวนลูกปืนทั้งหมดในถังบรรจุและสายลำเลียง (ก., ค.)",
    answerCheckboxes: [
      {
        checked: true,
        text: "Block 0 - ๙๘๐ นัด (อ้างอิง ๑); Block 1 - ๑,๕๕๐ นัด (อ้างอิง ๓)"
      }
    ],
    children: []
  },
  {
    id: "104.5",
    type: NodeType.QUESTION,
    q: "อธิบายวัสดุที่ใช้ทําชิ้นส่วนประกอบต่างๆ ของลูกปืน ประกอบด้วย Penetrator, Pusher, Sabot และ Windscreen (ก., ค.)",
    answerCheckboxes: [
      {
        checked: true,
        text: "วัสดุที่ใช้ ดังต่อไปนี้",
        subList: [
          "๒๐ มม. Powder Casing",
          "Penetrator ทำจาก Depleted Uranium",
          "Pusher ทำจากอลูมิเนียมและโพลีคาร์บอเนต",
          "Sabot ทำจากไนลอน",
          "Windscreen ทำจากพลาสติก (อ้างอิง ๑,๓)"
        ]
      }
    ],
    children: []
  },
  {
    id: "104.6",
    type: NodeType.QUESTION,
    q: "อธิบายจุดประสงค์ของการทดสอบการทํางานเบื้องต้น (PSOTS) ดังต่อไปนี้ (ข., ค.)",
    children: [
      {
        id: "104.6.1",
        type: NodeType.SUB_QUESTION,
        q: "PSOT 11",
        answerCheckboxes: [
          {
            checked: true,
            text: "ตรวจสอบการควบคุมปืนที่ตู้ Local Control Panel (LCP)"
          }
        ],
        children: []
      },
      {
        id: "104.6.2",
        type: NodeType.SUB_QUESTION,
        q: "PSOT 12",
        answerCheckboxes: [
          {
            checked: true,
            text: "ตรวจสอบการควบคุมปืนที่ตู้ Remote Control Panel (RCP)"
          }
        ],
        children: []
      },
      {
        id: "104.6.3",
        type: NodeType.SUB_QUESTION,
        q: "PSOT 13",
        answerCheckboxes: [
          {
            checked: true,
            text: "ตรวจสอบการทำงานของวงจรตัดไฟยิง"
          }
        ],
        children: []
      },
      {
        id: "104.6.4",
        type: NodeType.SUB_QUESTION,
        q: "PSOT 14",
        answerCheckboxes: [
          {
            checked: true,
            text: "ตรวจสอบชุดขับกำลังด้วยระบบไฮโดรลิกและระบบย่อยของการควบคุมปืน"
          }
        ],
        children: []
      }
    ]
  },
  {
    id: "104.7",
    type: NodeType.QUESTION,
    q: "จุดประสงค์ของการห้ามแพร่คลื่นเข้าตัวเรือ คืออะไร (ก., ค.)",
    answerCheckboxes: [
      {
        checked: true,
        text: "ป้องกันการแพร่คลื่นเรดาร์เข้าสู่โครงสร้างตัวเรือ ซึ่งอาจมีผลต่อระบบที่ติดตั้งอยู่"
      }
    ],
    children: []
  },
  {
    id: "104.8",
    type: NodeType.QUESTION,
    q: "ข้อจํากัดในการแพร่เคลื่อนที่เป็นอันตรายต่อบุคคลในขณะอยู่ในโหมด Search/track (ข., ค.)",
    answerCheckboxes: [
      {
        checked: true,
        text: "ขณะสายอากาศทำงานในโหมด Search ผลจะอยู่ภายในระยะ ๖ ฟุตรอบสายอากาศและมุมจากแนวนอนถึง ±๕ องศา (สำหรับ Block 1: Horizontal 1 ถึง ๗๒ องศา) ขณะสายอากาศในโหมด Track มุมจะอยู่ที่ ±๒.๖ องศาจากเส้นเล็งกลางของสายอากาศ เวลาเป็นอันตรายจะแปรผันตามระยะจากสายอากาศดังนี้ (อ้างอิง ๒,๓)",
        table: {
          headers: ["ระยะจากสายอากาศ (ฟุต)", "เวลาที่ไม่เป็นอันตราย (นาที)"],
          rows: [
            ["20", "1.3"],
            ["40", "2"],
            ["60", "3.1"],
            ["80", "5"],
            ["> 90", "ไม่เป็นอันตราย"]
          ]
        }
      }
    ],
    children: []
  },
  {
    id: "104.9",
    type: NodeType.QUESTION,
    q: "เวลาสูงสุดในการเดินระบบไฮโดรลิกในระหว่างมีการบรรจุลูกปืนคือเท่าใด (ข., ค.)",
    answerCheckboxes: [
      {
        checked: true,
        text: "ห้ามเดินระบบไฮโดรลิกติดต่อกันนานเกิน ๗ นาที (อ้างอิง ๒,๓)"
      }
    ],
    children: []
  },
  {
    id: "104.10",
    type: NodeType.QUESTION,
    q: "วัตถุประสงค์ของบัตรจ่ายงาน MRC-D1 คืออะไร (ข., ค.)",
    answerCheckboxes: [
      {
        checked: true,
        text: "ทดสอบระบบย่อยหลักของระบบ CIWS ทั้งหมดประจำวัน (อ้างอิง ๒,๓)"
      }
    ],
    children: []
  },
  {
    id: "104.11",
    type: NodeType.QUESTION,
    q: "ผลจากการระเบิดของนิวเคลียร์ดังต่อไปนี้มีผลกระทบต่อระบบอย่างไร (ง., จ.)",
    children: [
      {
        id: "104.11.1",
        type: NodeType.SUB_QUESTION,
        q: "Electro Magnetic Pulse (EMP)",
        answerCheckboxes: [
          {
            checked: true,
            text: "จะทำความเสียหายอย่างรุนแรงต่อวงจรภายในระบบ CIWS"
          }
        ],
        children: []
      },
      {
        id: "104.11.2",
        type: NodeType.SUB_QUESTION,
        q: "Transient Radiation Effects Electronics (TREE)",
        answerCheckboxes: [
          {
            checked: true,
            text: "จะมีผลกระทบต่ออุปกรณ์อิเล็กทรอนิกส์ โดยทำความเสียหายต่อวงจรดิจิทัลต่างๆ เช่น ทรานซิสเตอร์ หน่วยความจำของคอมพิวเตอร์ และอุปกรณ์เชื่อมต่อภายนอก"
          }
        ],
        children: []
      }
    ]
  }
];
