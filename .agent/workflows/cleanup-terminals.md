---
description: ล้าง Terminal Background ทั้งหมด (Cleanup background processes)
---

 workflow นี้จะรวบรวมและปิดหน่วยความจำที่ค้างอยู่จาก Terminal (conhost.exe และ powershell.exe) ที่ทำงานอยู่ในเบื้องหลัง

// turbo
1. รันสคริปต์ Cleanup
```powershell
powershell -ExecutionPolicy Bypass -File d:\pqs-rtn-hybrid-storage\scripts\cleanup.ps1
```

2. ตรวจสอบหลังจากล้างเสร็จ
```powershell
Get-Process conhost -ErrorAction SilentlyContinue
```
