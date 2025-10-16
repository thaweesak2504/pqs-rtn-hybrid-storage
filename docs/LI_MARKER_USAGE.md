คู่มือการใช้งาน: li-marker-gap utilities

เอกสารฉบับสั้นสำหรับใช้อ้างอิงเมื่อคุณต้องการสร้างรายการแบบมี marker ที่ปรับแต่งได้ (เลขไทย/อักษรไทย, prefix, ช่องห่างระหว่าง marker กับข้อความ ฯลฯ)

ไฟล์ที่เกี่ยวข้อง
- example/section_100/101_precautions.html — ตัวอย่างการใช้งานและตัวอย่าง utilities
- IMPROVED_COLOR_SCHEME.css (แนะนำย้าย utilities ในอนาคตไปไว้ที่นี่ เพื่อ reuse)

แนวคิดหลัก
- เราปิด native marker ของเบราว์เซอร์ แล้วสร้าง marker ใหม่ด้วย `::before` บน `li` เพื่อให้สามารถปรับช่องว่าง (gap), prefix, น้ำหนัก และรูปแบบ (ตัวเลขไทย/อักษรไทย) ได้อย่างยืดหยุ่น
- ใช้ CSS variables (เช่น `--marker-gap` และ `--marker-prefix`) เพื่อการปรับแต่งที่ง่าย
- สนับสนุนการตั้งค่า `start="..."` ของ `<ol>` โดยสคริปต์เล็ก ๆ ที่ตั้ง `counter-reset: li <start-1>` (จำเป็นเมื่อต้องใช้ counter + ::before)
- สนับสนุน `data-prefix` attribute บน `ol` หรือ `li` เพื่อกำหนด prefix แบบไดนามิกจาก HTML

Class / Utilities (สรุป)
- `.li-marker-gap` — เปิดใช้งาน custom markers (จำเป็น)
- `gap-sm` / `gap-md` / `gap-lg` / `gap-xl` — ปรับช่องว่าง (ค่าเป็น `--marker-gap`)
- `alpha` — ใช้ตัวอักษรไทย (`ก ข ค`) แทนตัวเลข
- `no-dot` — ไม่ใส่วงเล็บ/จุดหลัง marker (แสดงเฉพาะตัวเลข)
- `prefix-101` — ตัวอย่าง prefix สำเร็จรูป (ตั้ง `--marker-prefix` เป็น `๑๐๑.`)
- `marker-small` / `marker-muted` / `marker-bold` — ปรับขนาด/สี/น้ำหนักของ marker

ตัวอย่าง CSS (ย่อ):

```css
ol.li-marker-gap {
  list-style: none !important;
  counter-reset: li;
  --marker-gap: 0.5em;
  --marker-prefix: "";
  --marker-weight: 400;
}
ol.li-marker-gap.gap-sm { --marker-gap: 0.3em; }
ol.li-marker-gap.gap-md { --marker-gap: 0.8em; }
ol.li-marker-gap.gap-lg { --marker-gap: 1.5em; }
ol.li-marker-gap.gap-xl { --marker-gap: 2.4em; }
ol.li-marker-gap > li { counter-increment: li; }
ol.li-marker-gap > li::before {
  content: var(--marker-prefix, "") attr(data-prefix) counter(li, thai) " ";
  margin-right: var(--marker-gap);
  font-weight: var(--marker-weight);
}
```

การใช้ `data-prefix`
- ใส่ที่ `ol` เพื่อให้ prefix ใช้กับทุก `li` ใน list เช่น:
  `<ol class="li-marker-gap" data-prefix="๑๐๑.">` จะทำให้แต่ละข้อขึ้น `๑๐๑.๑, ๑๐๑.๒, ...`
- ใส่ที่ `li` เพื่อ override แบบรายข้อ เช่น: `<li data-prefix="(a) ">`
- ใน CSS เราใช้ `attr(data-prefix)` เพื่ออ่านค่า attribute ของ `li` ที่อยู่ตรง ๆ

การรองรับ `start=".."`
- เมื่อใช้ `::before` กับ counter คุณต้องให้ counter เริ่มจากค่า `start - 1` ดังนั้นให้เรียกใช้สคริปต์เล็ก ๆ ที่ตั้ง `ol.style.counterReset = 'li ' + (start-1)` สำหรับ `ol.li-marker-gap[start]` (ตัวอย่างมีใน `101_precautions.html`)

ตัวอย่าง HTML สั้น ๆ

```html
<!-- prefix บน ol -->
<ol class="thai-numerals li-marker-gap gap-md" lang="th" start="1" data-prefix="๑๐๑.">
  <li>หัวข้อหนึ่ง</li>
  <li>หัวข้อสอง</li>
</ol>

<!-- prefix แยกรายข้อ -->
<ol class="thai-numerals li-marker-gap" lang="th" start="1">
  <li data-prefix="(a) ">หัวข้อ a</li>
  <li>หัวข้อ ปกติ</li>
</ol>

<!-- ใช้อักษรไทย -->
<ol class="thai-alphabetic li-marker-gap alpha no-dot" lang="th">
  <li>ข้อก</li>
  <li>ข้อข</li>
</ol>
```

ข้อสังเกต / tips
- การแสดงผลอาจแตกต่างเล็กน้อยข้ามเบราว์เซอร์ โดยเฉพาะการจัดการ `::marker` และ `::before` — ทดสอบบน Chrome/Edge/Firefox
- ถ้าต้องการซัพพอร์ตรูปแบบอื่น ๆ (เช่น Arabic numerals) สามารถเพิ่ม branch ใน CSS หรือใช้ `data-type` attribute
- แนะนำย้าย CSS utilities ไปไว้ในไฟล์รวม (เช่น `IMPROVED_COLOR_SCHEME.css`) เมื่อคุณพร้อมจะ reuse ข้ามหลายไฟล์

ถ้าต้องการ ผมจะ:
- ย้าย CSS utilities ไป `IMPROVED_COLOR_SCHEME.css` และ replace ในตัวอย่างทุกไฟล์
- หรือ commit + push `docs/LI_MARKER_USAGE.md` ให้พร้อมใน repo (ตอนนี้ผมจะสร้างไฟล์ใน docs/ และ commit ให้คุณหากต้องการ)

---

ไฟล์นี้จบแล้ว — ถ้าต้องการให้ผม commit/ push ไฟล์ `docs/LI_MARKER_USAGE.md` ให้ทีเดียว บอกได้เลยครับ.