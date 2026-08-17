import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  createGeneralIntroductionSections,
  GENERAL_INTRODUCTION_DEFINITIONS,
  SECTION_100_INTRODUCTION_SECTIONS,
  SECTION_200_INTRODUCTION_SECTIONS,
  SECTION_300_INTRODUCTION_SECTIONS,
  type IntroductionSectionContent,
} from '../../content/introductionContent';
import IntroductionView from '../../components/views/IntroductionView';
import Section100View from '../../components/views/Section100View';
import Section200View from '../../components/views/Section200View';
import Section300View from '../../components/views/Section300View';

const appliedTo = 'ผู้ปฏิบัติหน้าที่ทดสอบเนื้อหามาตรฐาน';

const normalizeText = (value: string | null | undefined) => value?.replace(/\s+/g, ' ').trim() ?? '';

const getSectionIds = (container: HTMLElement) => Array.from(
  container.querySelectorAll<HTMLElement>('[data-introduction-section-id]'),
).map((element) => element.dataset.introductionSectionId);

const getAllContent = (sections: readonly IntroductionSectionContent[]) => sections.flatMap((section) => [
  section.title,
  section.content,
  ...(section.subItems?.flatMap((item) => [
    item.content,
    ...(item.nestedItems?.flatMap((nested) => [nested.title, nested.content ?? '']) ?? []),
  ]) ?? []),
]).filter(Boolean);

interface IntroductionViewCase {
  readonly name: string;
  readonly sections: readonly IntroductionSectionContent[];
  readonly renderView: (isPreviewMode: boolean) => ReactElement;
}

const viewCases: readonly IntroductionViewCase[] = [
  {
    name: 'General Introduction',
    sections: createGeneralIntroductionSections(appliedTo),
    renderView: (isPreviewMode) => (
      <IntroductionView
        documentId="22730203001"
        appliedTo={appliedTo}
        isPreviewMode={isPreviewMode}
        viewMode={isPreviewMode ? 'print' : 'edit'}
      />
    ),
  },
  {
    name: 'Section 100 Introduction',
    sections: SECTION_100_INTRODUCTION_SECTIONS,
    renderView: (isPreviewMode) => <Section100View isPreviewMode={isPreviewMode} />,
  },
  {
    name: 'Section 200 Introduction',
    sections: SECTION_200_INTRODUCTION_SECTIONS,
    renderView: (isPreviewMode) => <Section200View isPreviewMode={isPreviewMode} />,
  },
  {
    name: 'Section 300 Introduction',
    sections: SECTION_300_INTRODUCTION_SECTIONS,
    renderView: (isPreviewMode) => <Section300View isPreviewMode={isPreviewMode} />,
  },
];

describe('Introduction standard-content definitions', () => {
  it('keeps the confirmed General Introduction order and content authority', () => {
    expect(GENERAL_INTRODUCTION_DEFINITIONS.map((section) => section.title)).toEqual([
      'มาตรฐานกำลังพล',
      'การประยุกต์ใช้',
      'การปรับปรุงแก้ไข',
      'ผู้ทดสอบ',
      'เนื้อเรื่อง',
      'เอกสารอ้างอิง',
      'ผู้รับการทดสอบ',
    ]);
    expect(GENERAL_INTRODUCTION_DEFINITIONS.map((section) => section.authority)).toEqual([
      'system',
      'document',
      'system',
      'system',
      'system',
      'system',
      'system',
    ]);
    expect(createGeneralIntroductionSections(appliedTo)[1]?.content).toBe(
      `มาตรฐานกำลังพล เล่มนี้ ใช้กับ ${appliedTo}`,
    );
  });

  it('keeps the Section 100/200/300 top-level order and all standard authority locked', () => {
    expect(SECTION_100_INTRODUCTION_SECTIONS.map((section) => section.title)).toEqual([
      'คำนำ',
      'ความปลอดภัย',
      'วิธีปฏิบัติ',
    ]);
    expect(SECTION_200_INTRODUCTION_SECTIONS.map((section) => section.title)).toEqual([
      'โครงสร้างพื้นฐาน',
      'ส่วนประกอบและชิ้นส่วนในส่วนประกอบ',
      'รูปแบบ',
      'วิธีปฏิบัติ',
    ]);
    expect(SECTION_300_INTRODUCTION_SECTIONS.map((section) => section.title)).toEqual([
      'กล่าวนำ',
      'รูปแบบ',
      'ขั้นตอนการทำงาน',
      'วิธีปฏิบัติ',
    ]);

    const standardSections = [
      ...SECTION_100_INTRODUCTION_SECTIONS,
      ...SECTION_200_INTRODUCTION_SECTIONS,
      ...SECTION_300_INTRODUCTION_SECTIONS,
    ];
    expect(standardSections.every((section) => section.authority === 'system')).toBe(true);
    expect(standardSections.every((section) => section.content.trim().length > 0)).toBe(true);
  });

  it('preserves the Section 200 and 300 nested content structure', () => {
    expect(SECTION_200_INTRODUCTION_SECTIONS[2]?.subItems).toHaveLength(6);

    const section300Format = SECTION_300_INTRODUCTION_SECTIONS[1];
    expect(section300Format?.subItems).toHaveLength(4);
    expect(section300Format?.subItems?.[1]?.nestedItems?.map((item) => item.title)).toEqual([
      'คุณสมบัติก่อนการทดสอบ',
      'ความรู้พื้นฐาน',
      'ระบบ',
    ]);
    expect(section300Format?.subItems?.[2]?.nestedItems?.map((item) => item.title)).toEqual([
      'การทดสอบการปฏิบัติงาน',
      'การทดสอบการปฏิบัติในโอกาสพิเศษ',
      'กรณีเหตุขัดข้อง',
      'กรณีเหตุฉุกเฉิน',
      'การทดสอบการปฏิบัติประจำตำแหน่ง',
    ]);
  });
});

describe.each(viewCases)('$name rendering', ({ sections, renderView }) => {
  it.each([
    ['normal', false],
    ['print', true],
  ] as const)('renders the canonical order and complete content in %s view', (_mode, isPreviewMode) => {
    const { container } = render(renderView(isPreviewMode));

    expect(getSectionIds(container)).toEqual(sections.map((section) => section.id));
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect(Array.from(container.querySelectorAll('h2')).map((heading) => heading.textContent)).toEqual(
      sections.map((section) => section.title),
    );

    const sectionElements = Array.from(
      container.querySelectorAll<HTMLElement>('[data-introduction-section-id]'),
    );
    expect(sectionElements.every((element) => element.tagName === 'LI')).toBe(true);
    if (!isPreviewMode) {
      expect(sectionElements.every((element) => !element.className.includes('hover:'))).toBe(true);
    }

    const renderedText = normalizeText(container.textContent);
    for (const content of getAllContent(sections)) {
      expect(renderedText).toContain(normalizeText(content));
    }
  });
});

describe('Section 300 nested heading semantics', () => {
  it.each([
    ['normal', false],
    ['print', true],
  ] as const)('uses level-three headings for named nested items in %s view', (_mode, isPreviewMode) => {
    const { container } = render(<Section300View isPreviewMode={isPreviewMode} />);

    expect(Array.from(container.querySelectorAll('h3')).map((heading) => heading.textContent)).toEqual([
      'คุณสมบัติก่อนการทดสอบ',
      'ความรู้พื้นฐาน',
      'ระบบ',
      'การทดสอบการปฏิบัติงาน',
      'การทดสอบการปฏิบัติในโอกาสพิเศษ',
      'กรณีเหตุขัดข้อง',
      'กรณีเหตุฉุกเฉิน',
      'การทดสอบการปฏิบัติประจำตำแหน่ง',
    ]);
  });
});
