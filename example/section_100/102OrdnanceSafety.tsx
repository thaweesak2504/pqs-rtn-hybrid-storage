import React, { useState } from 'react';

const OrdnanceSafety102: React.FC = () => {
  const [showAnswers, setShowAnswers] = useState(false);

  const toggleAllAnswers = () => {
    setShowAnswers(!showAnswers);
  };

  const toThaiNumber = (num: number) => {
    const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
    return num.toString().split('').map(d => thaiDigits[parseInt(d)] || d).join('');
  };

  const thaiAlpha = ['ก', 'ข', 'ค', 'ง', 'จ', 'ฉ', 'ช', 'ซ', 'ฌ', 'ญ', 'ฎ', 'ฏ', 'ฐ', 'ฑ', 'ฒ', 'ณ', 'ด', 'ต', 'ถ', 'ท', 'ธ', 'น', 'บ', 'ป', 'ผ', 'ฝ', 'พ', 'ฟ', 'ภ', 'ม', 'ย', 'ร', 'ล', 'ว', 'ศ', 'ษ', 'ส', 'ห', 'ฬ', 'อ', 'ฮ'];

  const references = [
    "OPNAVINST 3120.32, Standard Organization and Regulations of the U.S. Navy",
    "NAVSEA OP4154 Close In Weapon system Mk.15 Mode 1-6 (Phalanx) Vol.2",
    "SW300-BC-SAF-010, Safety Manual for Clearing of Live Ammunition from Guns",
    "NAVEDTRA 10054, Basic Military Requirements",
    "NAVSEA OP4, Ammunition Afloat",
    "SW221-JO-MMO-010 thru 110, Close In Weapon System Mk.15 Mods 11-14",
    "NAVSEA SE 000-00-EIM-100, Electronics Installation and Maintenance Book General"
  ];

  interface SubQuestion {
    q: string;
    a: string;
  }

  interface Question {
    q: string;
    a?: string;
    subList?: string[];
    subQuestions?: SubQuestion[];
  }

  const questions: Question[] = [
    {
      q: "อธิบายความสำคัญจากอันตรายของการแพร่คลื่นแม่เหล็กไฟฟ้าที่มีต่อระบบอาวุธ (HERO) และการควบคุมการแพร่คลื่น (EMCON) ที่เกี่ยวข้องกับระบบอาวุธและความปลอดภัยของบุคคล (ก., ช.)",
      a: "ข้อจำกัดของการส่งคลื่นแม่เหล็กไฟฟ้าที่จะป้องกันการจุดระเบิดของกระสุนปืนขนาด ๒๐ มม. โดยกฎเกณฑ์ทั่วไป ผลกระทบจะเกิดขึ้นเมื่อขนาดของวัตถุทางกายภาพเท่ากับหนึ่งส่วนสิบของความยาวคลื่นแม่เหล็กไฟฟ้า (wavelength) ที่แพร่กระจายออกไป ความสูงของมนุษย์จะกำหนดว่าที่ความยาวคลื่นใดคลื่นแม่เหล็กไฟฟ้ามีผลเป็นอันตรายมากที่สุดต่อคนนั้น พลังงานแม่เหล็กไฟฟ้าจะถูกดูดซับ (absorbed) โดยร่างกายก่อให้เกิดความร้อนขึ้น หากกระบวนการในร่างกายไม่สามารถระบายความร้อนได้เร็วพอ จะทำให้อุณหภูมิร่างกายสูงขึ้น ซึ่งเป็นอันตราย หากอุณหภูมิสูงมากอาจทำให้เสียชีวิตได้ การระบายความร้อนของร่างกายขึ้นอยู่กับปัจจัยหลายประการ ได้แก่ อัตราการไหลเวียนของอากาศ ความชื้น อุณหภูมิของอากาศ อัตราการเปลี่ยนแปลงอุณหภูมิภายในร่างกาย ชุดที่สวมใส่ ความหนาแน่นของสนามแม่เหล็กไฟฟ้าที่แพร่กระจาย จำนวนพลังงาน และระยะเวลาที่ร่างกายได้รับ (อ้างอิง ๗)"
    },
    {
      q: "ข้อจำกัดชิ้นส่วนของลูกปืนขณะทำการยิงที่จะเป็นอันตรายต่อบุคคล (ข., ฉ.)",
      subQuestions: [
        {
          q: "การกระเด็นของชิ้นส่วน Sabot",
          a: "ส่วน Sabot จะกระเด็น ๑๖ องศา รอบๆ กระบอกปืนระยะ ๑๐๐ หลา (อ้างอิง ๒,๖)"
        },
        {
          q: "การกระเด็นของชิ้นส่วน Pusher",
          a: "ส่วน Pusher จะกระเด็น ๔ องศา รอบๆ กระบอกปืนระยะ ๓๐๐ หลา (อ้างอิง ๒,๖)"
        }
      ]
    },
    {
      q: "บุคคลใดในขณะยิงปืนจําเป็นต้องสวมเครื่องป้องกันหู (ข., ฉ.)",
      a: "บุคคลใดๆ ที่อยู่บนชั้นดาดฟ้าภายในระยะ ๘๐ ฟุตจากแท่นปืน จำเป็นต้องสวมเครื่องป้องกันหูเพื่อป้องกันอันตรายจากเสียงขณะยิงปืน"
    },
    {
      q: "ความหมายของคํา \"สภาวะปืนร้อน/เย็น (HOT/COLD GUN) \" (ค.)",
      a: "ภาวะปืนร้อน (Hot Gun) หมายถึงการยิงลูกปืน CIWS ๓๐๐ นัดหรือมากกว่า ภายในเวลา ๕ นาที ภาวะปืนเย็น (Cold Gun) หมายถึงการยิงลูกปืนน้อยกว่า ๓๐๐ นัดภายใน ๕ วินาที (อ้างอิง ๓)"
    },
    {
      q: "ขั้นตอนในการปฏิบัติเมื่อปืนมีการขัดข้อง (Jam/Stoppage) (ค.)",
      a: "มีขั้นตอนในการปฏิบัติ ดังนี้",
      subList: [
        "ต้องไม่มีผู้ใดอยู่ภายในบริเวณแท่นปืน",
        "ปืนต้องอยู่ในภาวะห้ามยิง หลังจากนั้นตรวจสอบมุมหันและยกปืนให้อยู่ในสถานะ Air Ready โดยป้อนข้อมูลที่คีย์บอร์ด LCP โค้ด ๒ และ ๓ (จำกัดมุมไม่เกิน ± ๑๐ องศา)",
        "ตรวจสอบปืนอยู่ในตำแหน่ง Safe และไฟปุ่ม Holdfire ติด",
        "นำระบบ CIWS อยู่ในโหมด Battery Off",
        "ที่ LCP ให้กุญแจสวิตช์ควบคุมระบบ (System Control Key Switch) บิดไว้ตำแหน่ง Stby/Maint",
        "ที่ LCP - System Control ถอด Mount Safety Connector",
        "ติดแผ่นป้ายห้ามเดินเครื่อง (Do Not Operate)",
        "ให้ก๊าซพิษ (Toxic Gases) พัดผ่านไปประมาณ ๑๐–๑๕ นาที ก่อนที่จะดำเนินการใดๆ ที่แท่นปืน",
        "บิดกุญแจควบคุมไฟยิงไว้ที่ Open",
        "ที่แท่นปืนบิดสวิตช์ความปลอดภัยไว้ตำแหน่ง Safe",
        "ถ้าปืนอยู่ในภาวะ Hot Gun ให้ทิ้งไว้ประมาณ ๓๐ นาที ก่อนที่จะสัมผัสกระบอกปืน (Barrels)",
        "ประกาศให้ทราบถึงอันตรายการแพร่คลื่นแม่เหล็กไฟฟ้าที่มีผลต่อระบบอาวุธ (HERO)",
        "ในการแก้ไขการติดขัดขณะยิงปืนให้ปฏิบัติตาม (อ้างอิง ๓)"
      ]
    },
    {
      q: "ย่านความถี่วิทยุที่มีผลกระทบต่อการเกิดจุดชนวนระเบิดกระสุนลูกปืน 20 mm. Mk.149 (ข., ฉ.)",
      a: "ในกรณีปราศจาก Chutes (Elements) ย่านที่มีผลต่อลูกปืน Mk 149 คือเรดาร์ย่าน I Band และ G Band ในกรณีที่อยู่ใน Ammo Links ย่านที่มีผลกระทบต่อลูกปืน Mk 149 คือเรดาร์ย่าน I Band เท่านั้น (อ้างอิง ๒,๖)"
    },
    {
      q: "ขั้นตอนที่จะต้องมีการตรวจสอบการแพร่คลื่นขณะมีการ ขนย้ายลูกปืน 20 mm. Mk.149 ในกรณีที่อาจจะมีลูกกระสุน หละหลวม (ข., ฉ.)",
      a: "ความถี่ของเครื่องส่งย่าน HF (2-3 MHz) และความถี่เรดาร์ย่าน B Band (200-450 MHz) ต้องงดแพร่คลื่นขณะที่มีการขนย้าย ความถี่ดังกล่าวจะมีผลต่อลูกกระสุนปืนที่หลวมนำไปสู่การจุดชนวนระเบิดได้ (อ้างอิง ๒,๖)"
    },
    {
      q: "ขั้นตอนในการปฏิบัติเมื่อมีบาดแผลอันเกิดจากขณะขนย้าย และ บรรจุ-ถอน ลูกปืน 20 mm. Mk.149 (ข., ฉ.)",
      a: "บาดแผลที่เกิดจากการปฏิบัติงาน ควรพบนายแพทย์ทันที (อ้างอิง ๒,๖)"
    },
    {
      q: "การป้องกันอันตรายของผู้ปฏิบัติงานที่เกิดจาก การสัมผัสกับลูกปืน 20 mm. Mk.149 (ข., ฉ.)",
      a: "เศษชิ้นส่วนหัวกระสุนส่วน Penetrator ที่มีสารยูเรเนียม และเศษชิ้นส่วนของเป้าที่ถูกทำลาย ควรสวมถุงมือชนิดหนาเมื่อมีการกำจัดเศษชิ้นส่วนดังกล่าว (อ้างอิง ๒,๖)"
    },
    {
      q: "มาตรฐานของการทําความสะอาดและการจัดเก็บอุปกรณ์ภายในห้องเก็บลูกปืนเป็นอย่างไร (ง., จ.)",
      a: "คลังกระสุน (Magazine) และพื้นที่เก็บอมัภัณฑ์หรือวัตถุระเบิดควรเก็บรักษาให้สะอาดอยู่เสมอ วัตถุที่สามารถติดไฟได้ (combustible) เช่น กระดาษ ผ้าเช็ดน้ำมัน ผ้าทำความสะอาด สารละลายต่างๆ และของเหลวระเหย (volatile liquids) จะต้องไม่อยู่ในห้องหรืออยู่ใกล้ห้องดังกล่าว ยกเว้นในกรณีที่มีความจำเป็นต้องใช้เป็นกรณีพิเศษ ควรระมัดระวังไม่ให้มีเศษโลหะ ทราย กรวด หรือวัตถุมีลักษณะคมบนพื้นห้องหรือพื้นที่ที่มีการขนย้ายวัตถุระเบิด พื้นที่ส่วนใหญ่ต้องมีการเช็ดล้างให้สะอาดเสมอ อุปกรณ์ทุกชั้นที่ทำการยึดตรึงอมัภัณฑ์ต้องปราศจากน้ำมัน จารบี และสี (free of oil, grease and paint) (อ้างอิง ๒,๕)"
    },
    {
      q: "อธิบายอันตรายอันอาจเกิดจากการทําให้เกิดเพลิง ไหม้, เกิดประกายไฟ และความร้อน ภายในห้องเก็บลูกปืน (Magazine) (ข., ฉ.)",
      a: "บริเวณห้องเก็บเครื่องกระสุนปืนจะต้องไม่มีประกายไฟ ความร้อน หรือแหล่งกำเนิดประกายไฟใดๆ ควรมีบัญชีเก็บอุปกรณ์ดังต่อไปนี้: ไม้ขีดไฟ เครื่องทำความร้อน/เตาไฟ อุปกรณ์เชื่อม หัวแร้ง อุปกรณ์ตัด และหลอดไฟพวง ซึ่งจะต้องเก็บไว้ในที่เก็บที่เหมาะสม (อ้างอิง ๕)"
    }
  ];

  return (
    <div className="flex justify-center bg-gray-100 p-8 min-w-fit">
      <div className="bg-white shadow-lg text-black box-border mx-auto w-[49.6rem] min-h-[70.15rem] p-[4.725rem_2.36rem_4.725rem_5.9rem] font-['TH_Sarabun_New',sans-serif] leading-[1.8] text-base">
        <div className="mb-4">
          <div className="flex mb-4">
            <div className="font-bold text-lg min-w-[7ch]">๑๐๒</div>
            <div className="flex-1">
              <h1 className="font-bold text-lg mb-2">ข้อระมัดระวังอันตรายด้านการสรรพาวุธ Ordnance Safety Fundamentals</h1>

              <div className="flex justify-between items-center mb-2">
                <div>เอกสารอ้างอิง :</div>
                <button
                  onClick={toggleAllAnswers}
                  className="px-3 py-1 border border-gray-400 bg-gray-200 hover:bg-gray-300 rounded text-sm transition-colors whitespace-nowrap ml-4"
                >
                  {showAnswers ? 'ซ่อนคำตอบ' : 'แสดงคำตอบ'}
                </button>
              </div>

              <ol className="list-none space-y-1">
                {references.map((ref, index) => (
                  <li key={index} className="flex gap-2">
                    <span>{thaiAlpha[index]}.</span>
                    <span>{ref}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        <ol className="list-none space-y-1">
          {questions.map((item, index) => {
            const questionNumber = `๑๐๒.${toThaiNumber(index + 1)}`;
            return (
              <li key={index} className="flex flex-col">
                <div className="flex items-baseline">
                  <span className="min-w-[8ch]">{questionNumber}</span>
                  <span>{item.q}</span>
                </div>

                {showAnswers && (
                  <div className="mt-2 ml-[8ch]">
                    {item.a && (
                      <div className="p-3 border border-gray-300 rounded bg-gray-50 mb-2">
                        <div className={item.subList ? "mb-2" : ""}>
                          <span>{questionNumber} : </span>
                          {item.a}
                        </div>
                        {item.subList && (
                          <ol className="list-none space-y-1 ml-4">
                            {item.subList.map((subItem, subIndex) => (
                              <li key={subIndex} className="flex gap-2">
                                <span>{thaiAlpha[subIndex]}.</span>
                                <span>{subItem}</span>
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>
                    )}

                    {item.subQuestions && (
                      <ol className="list-none space-y-2">
                        {item.subQuestions.map((subQ, subIndex) => (
                          <li key={subIndex}>
                            <div className="flex items-baseline mb-1">
                              <span className="min-w-[3ch]">{thaiAlpha[subIndex]}.</span>
                              <span>{subQ.q}</span>
                            </div>
                            <div className="p-3 border border-gray-300 rounded bg-gray-50">
                              <span>{questionNumber} {thaiAlpha[subIndex]}. : </span>
                              {subQ.a}
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
};

export default OrdnanceSafety102;
