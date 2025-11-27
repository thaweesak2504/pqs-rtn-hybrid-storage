import React from 'react';

const Introduction200: React.FC = () => {
  const sections = [
    {
      title: "โครงสร้างพื้นฐาน",
      content: `ในหัวข้อนี้จะแบ่งอุปกรณ์ออกเป็นส่วนย่อยๆ และอธิบายหน้าที่
      เพื่อเป็นการเรียนรู้และเข้าใจการทำงานของระบบ เนื้อหาข้อระบบจะกล่าวถึงความต้องการ ในการปฏิบัติหน้าที่
      โดยเลือกเฉพาะอุปกรณ์ที่ตรงกับการปฏิบัติหน้าที่ในแต่ละตำแหน่ง
      ระบบที่ไม่มีความซับซ้อนจะอธิบายเพียงเล็กน้อย โดยจะเน้นระบบที่มีความสำคัญ หรือมีความซับซ้อนมากกว่า`
    },
    {
      title: "ส่วนประกอบและชิ้นส่วนในส่วนประกอบ",
      content: `เป็นระบบที่แยกออกจากกัน เพื่อที่จะแบ่งการเรียนรู้ออกเป็น ๒ ระดับ
      คือแบ่งออกเป็นส่วนประกอบและชิ้นส่วนในส่วนประกอบ
      จะไม่มีรายการชิ้นส่วนทั้งหมดดังเช่นมีในหนังสือคู่มือทางเทคนิค
      จะมีเฉพาะรายการที่จำเป็นต้องรู้และเข้าใจในการปฏิบัติหน้าที่ โดยปกติแต่ละระบบจะมีรูปภาพแสดงให้เห็น
      ซึงจะแยกแสดงเป็นภาพส่วนประกอบและภาพชิ้นส่วนในส่วนประกอบ เช่น เครื่องกำเนิดไฟฟ้าและสวิตช์เกียร์
      จะมีรายการชิ้นส่วนอยู่ในส่วนประกอบของระบบไฟฟ้าเรือ และรายละเอียดอื่นๆ ของแต่ละระบบ
      ในส่วนหัวข้อถัดไปจะเป็นการเรียนรู้ลึกลงไปในรายละเอียด`
    },
    {
      title: "รูปแบบ",
      content: `แต่ละระบบจะมีรูปแบบการจัดระบบ ดังนี้`,
      subItems: [
        "มีรายชื่อเอกสารอ้างอิงเพื่อใช้ในการเรียนรู้ และมีคำถามให้ผู้รับการทดสอบอธิบายหน้าที่ของแต่ละระบบ",
        "มีการสอบถามโดยทั่วไป ถึงความสัมพันธ์ของส่วนประกอบ และชิ้นส่วนในส่วนประกอบของระบบว่าคืออะไร อยู่ที่ไหนฯ",
        "มีการกล่าวถึงการทำงานของส่วนประกอบ และชิ้นส่วนในส่วนประกอบว่าทำหน้าที่อย่างไร",
        "มีรายละเอียดของค่าการทำงานที่สามารถนำมาตรวจสอบได้ในทันทีทันใด",
        "มีการศึกษาเรียนรู้ถึงความสัมพันธ์ระหว่างระบบ ที่กำลังศึกษากับระบบอื่น หรือพื้นที่ใกล้เคียง",
        "มีการอธิบายถึงอุปกรณ์ที่ให้ความปลอดภัยแก่ระบบ และมีข้อระมัดระวังอันตรายสำหรับบุคคลและอุปกรณ์"
      ]
    },
    {
      title: "วิธีปฏิบัติ",
      content: `ผู้รับการทดสอบจะต้องผ่านการทดสอบตามรายการในหัวข้อการปฏิบัติหน้าที่ (หัวข้อ
      ๓๐๐) สำหรับการปฏิบัติหน้าที่ในแต่ละตำแหน่ง
      เมื่อผู้รับการทดสอบเข้าใจในระบบใดระบบหนึ่งหรือมากกว่าอย่างดีแล้ว ให้ติดต่อกับผู้ทดสอบ
      เพื่อที่ผู้ทดสอบจะสัมภาษณ์ในแต่ละระบบ
      ถ้าผู้ทดสอบมีความพอใจว่าผู้รับการทดสอบมีความรู้เกี่ยวกับระบบเพียงพอ ผู้ทดสอบจะลงนามรับรอง
      ผู้รับการทดสอบที่พร้อมจะทำการทดสอบ จะต้องทดสอบปากเปล่า และสอบข้อเขียน
      เพื่อที่จะแสดงว่าเป็นผู้ที่มีความรู้ ความเข้าใจในระบบที่เกี่ยวกับการปฏิบัติหน้าที่`
    }
  ];

  const toThaiNumber = (num: number) => {
    const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
    return num.toString().split('').map(d => thaiDigits[parseInt(d)] || d).join('');
  };

  const toThaiAlphabet = (index: number) => {
    const thaiAlphabets = [
      'ก', 'ข', 'ค', 'ง', 'จ', 'ฉ', 'ช', 'ซ', 'ฌ', 'ญ',
      'ฎ', 'ฏ', 'ฐ', 'ฑ', 'ฒ', 'ณ', 'ด', 'ต', 'ถ', 'ท',
      'ธ', 'น', 'บ', 'ป', 'ผ', 'ฝ', 'พ', 'ฟ', 'ภ', 'ม',
      'ย', 'ร', 'ล', 'ว', 'ศ', 'ษ', 'ส', 'ห', 'ฬ', 'อ', 'ฮ',
    ];
    return thaiAlphabets[index] || '';
  };

  return (
    <div className="flex justify-center bg-gray-100 p-8 min-w-fit">
      <div
        // className="bg-white shadow-lg text-black box-border mx-auto w-[210mm] min-h-[297mm] p-[2cm_1cm_2cm_2.5cm] font-['TH_Sarabun_New',sans-serif] leading-[1.8]">
        className="bg-white shadow-lg text-black box-border mx-auto w-[49.6rem] min-h-[70.15rem] p-[4.725rem_2.36rem_4.725rem_5.9rem] font-['TH_Sarabun_New',sans-serif] leading-[1.8] text-base">
        <div className="mb-8">
          <h1 className='font-bold text-center text-lg'>
            แนะระบบ (หัวข้อ ๒๐๐)
          </h1>
        </div>

        <ol className="list-none space-y-4">
          {sections.map((section, index) => (
            <li key={index} className="flex items-baseline" style={{ gap: '2ch' }}>
              <span className="font-bold min-w-fit">{toThaiNumber(index + 1)}.</span>
              <div className="flex-1">
                <span className="font-bold">{section.title}</span>
                <div
                  className="text-justify indent-8 font-normal mt-1 whitespace-pre-line">
                  {section.content.replace(/\s+/g, ' ').trim()}
                </div>

                {/* Nested List for Section 3 (index 2) */}
                {section.subItems && (
                  <ol className="list-none mt-2 space-y-1 ml-8">
                    {section.subItems.map((item, subIndex) => (
                      <li key={subIndex} className="flex items-baseline" style={{ gap: '1ch' }}>
                        <span className="min-w-fit">{toThaiAlphabet(subIndex)}.</span>
                        <div className="flex-1 text-justify">
                          {item}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};

export default Introduction200;
