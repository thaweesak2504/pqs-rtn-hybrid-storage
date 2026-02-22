# 300Template Development Plan

## Overview

This document outlines the development plan for the `300Template` (Watch Station / Practical Skills) based on the successful patterns established in `200Template`. The 300 series focuses on practical testing, evaluator sign-offs, and pass/fail criteria rather than theoretical Q&A with answer keys.

## Core Characteristics of 300Section

1. **No Reference Documents**: Practical tests do not require listing reference documents directly in the question UI.
2. **No Answer Keys**: Practical tests are judged by an evaluator (Pass/Fail) based on observation, so there are no textual answer keys.
3. **Pass/Fail System**: While there might be scores, the core testing result for each item is Pass/Fail.
4. **Signatures (Deferred to Print Mode)**: The signature fields are primarily for the physical/printed form. The digital UX/UI will handle this differently.
5. **Theme**: Purple theme (aligning with 300 Introduction).
6. **Inherited 200Template Features**:
   - Default Questions generation.
   - Mandatory sub-question branch selection (for 3xx.2 to 3xx.5) similar to 2xx.2/2xx.4.
   - Occupation branch codes will start with '3' instead of '2'.

---

## Phases of Development

### 🎯 Phase 1: Section Header (Title) & Theme [TODO]

- **Theme**: Apply Purple/Violet color scheme across the 300Template components.
- **Header Title**: Enforce a fixed, non-editable prefix for the title: `"การปฏิบัติหน้าที่ในตําแหน่ง "` followed by the position name input by the user.

### 🎯 Phase 2: Create Default Questions [TODO]

Implement the generation of the following fixed default questions (Read-only structure):

#### 3xx.1

- **Question**: "คุณสมบัติก่อนการทดสอบ"
- **Description**: "เพื่อให้การทดสอบตาม มาตรฐานการทดสอบกำลังพลเกิดประโยชน์สูงสุด และสำเร็จตามวัตถุประสงค์ ผู้เข้ารับการทดสอบ ต้องมีคุณสมบัติ ดังต่อไปนี้"
  - **3xx.1.1**: "ผ่านการอบรม"
  - **3xx.1.2**: "ผ่านมาตรฐานการทดสอบกําลังพล"
  - **3xx.1.3**: "ผ่านการปฏิบัติหน้าที่"
  - **3xx.1.4**: "ผ่านการทดสอบความรู้พื้นฐาน"
  - **3xx.1.5**: "ผ่านการทดสอบระบบ"

#### 3xx.2 to 3xx.5 (Sub-question branches like 2xx.2)

(These use the same occupation branches as 200Template, but with '3' prefix)

- **3xx.2**: "การทดสอบปฏิบัติงานปกติ"
- **3xx.3**: "การทดสอบการปฏิบัติงานกรณีพิเศษ"
- **3xx.4**: "การทดสอบการปฏิบัติงานกรณีเหตุขัดข้อง"
- **3xx.5**: "การทดสอบการปฏิบัติงานกรณีเหตุฉุกเฉิน"

#### 3xx.6 and 3xx.7

- **3xx.6**: "การทดสอบการปฏิบัติงานประจําตําแหน่ง"
- **3xx.7**: "สอบความรู้"
  - **3xx.7.1**: "สอบข้อเขียน"
  - **3xx.7.2**: "สอบปากเปล่า"

### 🎯 Phase 3: Sub-question branch logic & Evaluator UI [PENDING]

- Implement the branch selection UI for 3xx.2, 3xx.3, 3xx.4, and 3xx.5.
- Ensure that the generated DB codes for these branches start with '3'.
- Design and implement the digital UI for evaluator grading (Pass/Fail) if applicable in the digital view.
- Ensure Answer Key fields are completely hidden/removed for 300Template.
- Ensure Reference sections are completely hidden/removed for 300Template.

### 🎯 Phase 4: Preview Print Mode (Deferred) [PENDING]

- Implement `PqsSectionPreview300.tsx`.
- Design the A4 layout.
- Include signature blocks and evaluator sign-off formatting specifically for the printed document.
