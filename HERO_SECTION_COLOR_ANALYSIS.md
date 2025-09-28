# 🎨 HeroSection Color Impact Analysis

## 📊 สรุปผลกระทบในหน้า HeroSection

### ✅ **สีที่ได้รับผลกระทบ (จะเปลี่ยน):**

| **Element** | **Current CSS** | **สีที่ใช้** | **ผลกระทบ** |
|-------------|-----------------|--------------|-------------|
| **Title หลัก** | `text-github-text-primary` | `#f0f6fc` → `#e6edf3` | ลดความสว่าง 10% |
| **Subtitle** | `text-github-text-secondary` | `#7d8590` → `#b1bac4` | เพิ่มความสว่าง 10% |
| **Objective Card Titles** | `text-github-text-primary` | `#f0f6fc` → `#e6edf3` | ลดความสว่าง 10% |
| **Objective Card Subtitles** | `text-github-text-secondary` | `#7d8590` → `#b1bac4` | เพิ่มความสว่าง 10% |
| **Card Borders** | `border-github-border-primary` | `#30363d` | ไม่เปลี่ยน (ไม่ใช่ text color) |
| **Card Backgrounds** | `bg-github-bg-tertiary` | `#0d1117` | ไม่เปลี่ยน (ไม่ใช่ text color) |

### ❌ **สีที่ไม่ได้รับผลกระทบ (ไม่เปลี่ยน):**

| **Element** | **CSS Class** | **สีที่ใช้** | **เหตุผล** |
|-------------|---------------|--------------|------------|
| **Award Icons** | `text-github-accent-primary` | `#58a6ff` | Accent color (ไม่ใช่ text hierarchy) |
| **Mail Icon** | `text-github-accent-info` | `#3b82f6` | Accent color |
| **ShieldCheck Icon** | `text-github-accent-success` | `#22c55e` | Accent color |
| **Users Icon** | `text-github-accent-purple` | `#a855f7` | Accent color |
| **GitMerge Icon** | `text-github-accent-orange` | `#f97316` | Accent color |
| **Card Backgrounds** | `bg-white dark:bg-github-bg-tertiary` | `#ffffff` / `#0d1117` | Background color |
| **Button Colors** | Button component | ตาม Button variant | Component styling |
| **Border Colors** | `border-github-border-primary` | `#30363d` | Border color |

## 🎯 **รายละเอียดการเปลี่ยนแปลง:**

### **1. Title Components (2 จุด):**
```tsx
// Main Title
<Title
  title="มาตรฐานกำลังพล กองทัพเรือ"        // text-github-text-primary
  subtitle="Personnel Qualification Standard"  // text-github-text-secondary
  description="เครื่องมือช่วยให้เป็นหนึ่ง..."    // text-github-text-secondary
/>

// Objectives Title
<Title
  title="วัตถุประสงค์ : Objective"           // text-github-text-primary
/>
```

### **2. Objective Cards (3 การ์ด):**
```tsx
// Card Titles (3 จุด)
<h3 className="text-github-text-primary">
  การปฏิบัติหน้าที่ในตำแหน่ง
  การดำรงสภาพของยุทโธปกรณ์
  การปฏิบัติร่วมเป็นกลุ่มหรือทีม
</h3>

// Card Subtitles (3 จุด)
<p className="text-github-text-secondary">
  Specific watch station
  Maintain specific equipment
  Perform as a team member within unit
</p>
```

### **3. Capability Cards (4 การ์ด):**
```tsx
// Card Titles และ Content ผ่าน Card Component
<Card
  title="การเตรียมความพร้อม"      // text-github-text-primary
  subtitle="Combat Readiness"     // text-github-text-secondary
>
  ระบบประเมินความพร้อมรบ...       // text-github-text-secondary
</Card>
```

## 📈 **ผลกระทบเชิงบวก:**

### **️ การมองเห็น:**
- **Title หลัก** จะไม่สว่างมากเกินไป → อ่านสบายขึ้น
- **Subtitle** จะสว่างขึ้น → ชัดเจนขึ้น
- **Objective Cards** จะมีลำดับชั้นที่ชัดเจนขึ้น

### **🎨 การออกแบบ:**
- **ความสมดุล** ระหว่าง Title และ Subtitle ดีขึ้น
- **ลำดับชั้น** ของข้อมูลชัดเจนขึ้น
- **ความสอดคล้อง** กับส่วนอื่นๆ ของแอป

## ⚠️ **สิ่งที่ไม่เปลี่ยน:**

### **🎨 Accent Colors:**
- **Icons** ยังคงสีเดิม (สีฟ้า, เขียว, ม่วง, ส้ม)
- **Button** ยังคงสีเดิมตาม variant
- **Borders** ยังคงสีเดิม

### ** Backgrounds:**
- **Card backgrounds** ยังคงสีเดิม
- **Page background** ยังคงสีเดิม
- **Container backgrounds** ยังคงสีเดิม

## 🎯 **สรุป:**

### **✅ ได้รับผลกระทบ (6 จุด):**
1. Main Title
2. Main Subtitle  
3. Main Description
4. Objectives Title
5. Objective Card Titles (3 จุด)
6. Objective Card Subtitles (3 จุด)

### **❌ ไม่ได้รับผลกระทบ:**
- Icons (Accent colors)
- Backgrounds
- Borders
- Button colors
- Card component styling

**ผลรวม: หน้า HeroSection จะดูสมดุลและสบายตามากขึ้น โดยที่ accent colors และ backgrounds ยังคงเหมือนเดิม!** 🚀
