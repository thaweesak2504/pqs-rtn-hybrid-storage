import React, { useState } from 'react';

const Abbreviation103: React.FC = () => {
  const [showAnswers, setShowAnswers] = useState(false);

  const toggleAllAnswers = () => {
    setShowAnswers(!showAnswers);
  };

  const thaiAlpha = ['ก', 'ข', 'ค', 'ง', 'จ', 'ฉ', 'ช', 'ซ', 'ฌ', 'ญ', 'ฎ', 'ฏ', 'ฐ', 'ฑ', 'ฒ', 'ณ', 'ด', 'ต', 'ถ', 'ท', 'ธ', 'น', 'บ', 'ป', 'ผ', 'ฝ', 'พ', 'ฟ', 'ภ', 'ม', 'ย', 'ร', 'ล', 'ว', 'ศ', 'ษ', 'ส', 'ห', 'ฬ', 'อ', 'ฮ'];

  const references = [
    "NAVSEA OP4154 Close In Weapon system Mk.15 Mode 1-6 (Phalanx) Vol.1 Pt.1",
    "NAVSEA OP4154 Close In Weapon system Mk.15 Mode 1-6 (Phalanx) Vol.2",
    "Teletype Corporation How to Operate Manual 367",
    "SW221-JO-MMO-010 thru 110, Close In Weapon System Mk.15 Mods 11-14",
    "NAVSEA O P4234, Peculiar Support Equipment for CIWS Mk.15 (Phalanx), Vol.4"
  ];

  const abbreviations = [
    { q: "AAW (ข., ง.)", a: "Anti Air Warfare" },
    { q: "AIM CALIB (ข., ง.)", a: "Aim Calibrate" },
    { q: "AUTO (ข., ง.)", a: "Automatic" },
    { q: "AVAIL (ข., ง.)", a: "Available" },
    { q: "BOT (ข., ง.)", a: "Beginning Of Tape" },
    { q: "CAC (ข., ง.)", a: "Continuous Aim Correction" },
    { q: "CB (ข., ง.)", a: "Circuit Breaker" },
    { q: "CIC (ก., ง.)", a: "Combat Information Center" },
    { q: "COORD (ข., ง.)", a: "Coordinate" },
    { q: "CPS (ค., ง.)", a: "Characters Per Second" },
    { q: "CQO (ข., ง.)", a: "Own Ship's Heading" },
    { q: "DEG (ข., ง.)", a: "Degrees" },
    { q: "DESIG (ข., ง.)", a: "Designation" },
    { q: "DU (ข., ง.)", a: "Depleted Uranium" },
    { q: "ECG (ก., ง.)", a: "Environmental Control Group" },
    { q: "ELX (ก., ง.)", a: "Electronics" },
    { q: "EM (ข., ง.)", a: "Electromechanical" },
    { q: "ENVIR (ข., ง.)", a: "Environmental" },
    { q: "FT (ข., ง.)", a: "Feet" },
    { q: "HPRF (ง.)", a: "High Pulse Repetition Frequency" },
    { q: "Hz (ข., ง.)", a: "Hertz" },
    { q: "HF (ข., ง.)", a: "High Frequency" },
    { q: "IND (ข., ง.)", a: "Induction" },
    { q: "INTRPT (ข., ง)", a: "Interrupt" },
    { q: "INTFC (ข., ง.)", a: "Interface" },
    { q: "LPRF (ง.)", a: "Low Pulse Repetition Frequency" },
    { q: "MHz (ข., ง.)", a: "Mega Hertz" },
    { q: "MTR (ข., ง.)", a: "Meter" },
    { q: "MWC (ข., ง.)", a: "Microwave" },
    { q: "OLI (ข., ง.)", a: "Optical Lasing Intensity" },
    { q: "OPR test (ข., ง.)", a: "Operator Test" },
    { q: "PAC (ข., ง.)", a: "Power Amplification Circuit" },
    { q: "PASS (ง., จ.)", a: "Pass" },
    { q: "POT (ข., ง.)", a: "Potentiometer" },
    { q: "PSCG (ก., ง.)", a: "Power Supply Control Group" },
    { q: "PSE (ข., ง.)", a: "Power Supply Equipment" },
    { q: "PSOT (ข., ง.)", a: "Power Supply Overload Test" },
    { q: "RADHAZ (ข., ง.)", a: "Radioactive Hazard" },
    { q: "RF (ข., ง.)", a: "Radio Frequency" },
    { q: "STBY MAINT (ข., ง.)", a: "Standby Maintenance" },
    { q: "SW (ข., ง.)", a: "Switch" }
  ];

  return (
    <div className="flex justify-center bg-gray-100 p-8 min-w-fit">
      <div className="bg-white shadow-lg text-black box-border mx-auto w-[49.6rem] min-h-[70.15rem] p-[4.725rem_2.36rem_4.725rem_5.9rem] font-['TH_Sarabun_New',sans-serif] leading-[1.8] text-base">
        <div className="mb-4">
          <div className="flex mb-4">
            <div className="font-bold text-lg min-w-[7ch]">๑๐๓.</div>
            <div className="flex-1">
              <h1 className="font-bold text-lg mb-2">คําย่อของระบบอาวุธป้องกันตนเองระยะประชิด Phalanx Mk.15</h1>

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
          <li className="flex flex-col">
            <div className="flex items-baseline">
              <span className="min-w-[8ch]">๑๐๓.๑</span>
              <span>คําย่อต่อไปนี้ มีคําเต็มว่าอะไร</span>
            </div>

            <div className="mt-4 ml-[8ch]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                {abbreviations.map((item, index) => (
                  <div key={index} className="flex flex-col">
                    <div className="flex items-baseline">
                      <span className="min-w-[3ch]">{thaiAlpha[index]}.</span>
                      <span>{item.q}</span>
                    </div>
                    {showAnswers && (
                      <div className="mt-1 ml-[3ch] p-2 border border-gray-300 rounded bg-gray-50">
                        <span>๑๐๓.๑ {thaiAlpha[index]}. : </span>
                        {item.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </li>
        </ol>
      </div>
    </div>
  );
};

export default Abbreviation103;
