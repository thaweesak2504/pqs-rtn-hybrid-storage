import re
path = r"D:\pqs-rtn-hybrid-storage\example\section_200\201_radar_weapon.html"
pattern = re.compile(r'(ทํา|ทำ|ตํา|ตำ|ลํา|ลำ|คํา|คำ)')
with open(path, 'r', encoding='utf-8') as f:
    for i,line in enumerate(f,1):
        for m in pattern.finditer(line):
            s = m.group(0)
            codes = ' '.join(f'{ord(c):04X}' for c in s)
            print(f'Line {i}: {s} -> {codes} | Context: {line.strip()}')
