tokens = ['ทํา','ทำ','ตํา','ตำ','ลํา','ลำ','คํา','คำ','ขวง','คัน','เข้่า','เข้า','ใต้ว','ใต้','Timming','Timing']
path = r"D:\pqs-rtn-hybrid-storage\example\section_200\201_radar_weapon.html"
from collections import Counter
cnt = Counter()
with open(path,'r',encoding='utf-8') as f:
    text = f.read()
    for t in tokens:
        cnt[t] = text.count(t)
for t in tokens:
    print(f"{t}: {cnt[t]}")
