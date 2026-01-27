import { UINode, NodeType, DocumentMeta } from '../section_200/types';

export const documentMeta: DocumentMeta = {
  id: '103',
  section_number: '๑๐๓',
  title: 'คําย่อของระบบอาวุธป้องกันตนเองระยะประชิด Phalanx Mk.15',
  references: [
    "NAVSEA OP4154 Close In Weapon system Mk.15 Mode 1-6 (Phalanx) Vol.1 Pt.1",
    "NAVSEA OP4154 Close In Weapon system Mk.15 Mode 1-6 (Phalanx) Vol.2",
    "Teletype Corporation How to Operate Manual 367",
    "SW221-JO-MMO-010 thru 110, Close In Weapon System Mk.15 Mods 11-14",
    "NAVSEA O P4234, Peculiar Support Equipment for CIWS Mk.15 (Phalanx), Vol.4"
  ]
};

const rawAbbreviations = [
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

export const abbreviationData: UINode[] = [
  {
    id: '103.1',
    type: NodeType.QUESTION,
    q: 'คําย่อต่อไปนี้ มีคําเต็มว่าอะไร',
    childLayout: 'grid',
    children: rawAbbreviations.map((item, index) => ({
      id: `103.1.${index + 1}`,
      type: NodeType.SUB_QUESTION,
      q: item.q,
      answerCheckboxes: [{ checked: true, text: item.a }],
      children: []
    }))
  }
];
