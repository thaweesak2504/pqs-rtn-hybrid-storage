import { describe, expect, it } from 'vitest';
import type { IntroductionSectionContent } from '../../content/introductionContent';
import {
  validateCanonicalIntroductionContent,
  validateIntroductionContentPage,
} from '../../content/introductionContentValidation';

const createSection = (
  overrides: Partial<IntroductionSectionContent> = {},
): IntroductionSectionContent => ({
  id: 'section-id',
  title: 'หัวข้อ',
  content: 'เนื้อหา',
  authority: 'system',
  ...overrides,
});

describe('Introduction content structural validation', () => {
  it('accepts all canonical General/100/200/300 content', () => {
    expect(validateCanonicalIntroductionContent()).toEqual([]);
  });

  it('reports an empty page and required section text with exact source paths', () => {
    expect(validateIntroductionContentPage({ id: 'section-100', sections: [] })).toEqual([
      { pageId: 'section-100', path: 'sections', code: 'empty-collection' },
    ]);

    expect(validateIntroductionContentPage({
      id: 'section-100',
      sections: [createSection({ id: ' ', title: '', content: '\t' })],
    })).toEqual([
      { pageId: 'section-100', path: 'sections[0].id', code: 'required-text' },
      { pageId: 'section-100', path: 'sections[0].title', code: 'required-text' },
      { pageId: 'section-100', path: 'sections[0].content', code: 'required-text' },
    ]);
  });

  it('reports duplicate sibling IDs at section, sub-item, and nested-item levels', () => {
    const sections: readonly IntroductionSectionContent[] = [
      createSection({
        subItems: [
          {
            id: 'sub-item',
            content: 'รายการย่อยหนึ่ง',
            nestedItems: [
              { id: 'nested-item', title: 'หัวข้อซ้อนหนึ่ง' },
              { id: 'nested-item', title: 'หัวข้อซ้อนสอง' },
            ],
          },
          { id: 'sub-item', content: 'รายการย่อยสอง' },
        ],
      }),
      createSection({ title: 'หัวข้อซ้ำ' }),
    ];

    expect(validateIntroductionContentPage({ id: 'section-300', sections })).toEqual([
      {
        pageId: 'section-300',
        path: 'sections[0].subItems[0].nestedItems[1].id',
        code: 'duplicate-id',
      },
      {
        pageId: 'section-300',
        path: 'sections[0].subItems[1].id',
        code: 'duplicate-id',
      },
      { pageId: 'section-300', path: 'sections[1].id', code: 'duplicate-id' },
    ]);
  });

  it('reports blank required nested text without requiring optional detail text', () => {
    const sections = [createSection({
      subItems: [{
        id: 'sub-item',
        content: ' ',
        nestedItems: [
          { id: 'heading-only', title: 'หัวข้อที่ไม่ต้องมีรายละเอียด' },
          { id: 'blank-title', title: '', content: ' ' },
        ],
      }],
    })];

    expect(validateIntroductionContentPage({ id: 'section-300', sections })).toEqual([
      {
        pageId: 'section-300',
        path: 'sections[0].subItems[0].content',
        code: 'required-text',
      },
      {
        pageId: 'section-300',
        path: 'sections[0].subItems[0].nestedItems[1].title',
        code: 'required-text',
      },
      {
        pageId: 'section-300',
        path: 'sections[0].subItems[0].nestedItems[1].content',
        code: 'required-text',
      },
    ]);
  });
});
