import {
  createGeneralIntroductionSections,
  SECTION_100_INTRODUCTION_SECTIONS,
  SECTION_200_INTRODUCTION_SECTIONS,
  SECTION_300_INTRODUCTION_SECTIONS,
  type IntroductionSectionContent,
} from './introductionContent';

export type IntroductionContentPageId = 'general' | 'section-100' | 'section-200' | 'section-300';

export type IntroductionContentValidationCode =
  | 'empty-collection'
  | 'duplicate-id'
  | 'required-text';

export interface IntroductionContentValidationIssue {
  readonly pageId: IntroductionContentPageId;
  readonly path: string;
  readonly code: IntroductionContentValidationCode;
}

export interface IntroductionContentPage {
  readonly id: IntroductionContentPageId;
  readonly sections: readonly IntroductionSectionContent[];
}

const STRUCTURE_VALIDATION_APPLIED_TO = 'ข้อมูลการประยุกต์ใช้สำหรับตรวจโครงสร้าง';

export const CANONICAL_INTRODUCTION_CONTENT_PAGES: readonly IntroductionContentPage[] = [
  {
    id: 'general',
    sections: createGeneralIntroductionSections(STRUCTURE_VALIDATION_APPLIED_TO),
  },
  {
    id: 'section-100',
    sections: SECTION_100_INTRODUCTION_SECTIONS,
  },
  {
    id: 'section-200',
    sections: SECTION_200_INTRODUCTION_SECTIONS,
  },
  {
    id: 'section-300',
    sections: SECTION_300_INTRODUCTION_SECTIONS,
  },
];

const addRequiredTextIssue = (
  issues: IntroductionContentValidationIssue[],
  pageId: IntroductionContentPageId,
  path: string,
  value: string | undefined,
) => {
  if (!value?.trim()) {
    issues.push({ pageId, path, code: 'required-text' });
  }
};

const addDuplicateIdIssue = (
  issues: IntroductionContentValidationIssue[],
  pageId: IntroductionContentPageId,
  path: string,
  id: string,
  seenIds: Set<string>,
) => {
  const normalizedId = id.trim();
  if (!normalizedId) {
    return;
  }
  if (seenIds.has(normalizedId)) {
    issues.push({ pageId, path, code: 'duplicate-id' });
    return;
  }
  seenIds.add(normalizedId);
};

export const validateIntroductionContentPage = (
  page: IntroductionContentPage,
): readonly IntroductionContentValidationIssue[] => {
  const issues: IntroductionContentValidationIssue[] = [];
  if (page.sections.length === 0) {
    issues.push({ pageId: page.id, path: 'sections', code: 'empty-collection' });
    return issues;
  }

  const sectionIds = new Set<string>();
  page.sections.forEach((section, sectionIndex) => {
    const sectionPath = `sections[${sectionIndex}]`;
    addRequiredTextIssue(issues, page.id, `${sectionPath}.id`, section.id);
    addDuplicateIdIssue(issues, page.id, `${sectionPath}.id`, section.id, sectionIds);
    addRequiredTextIssue(issues, page.id, `${sectionPath}.title`, section.title);
    addRequiredTextIssue(issues, page.id, `${sectionPath}.content`, section.content);

    const subItemIds = new Set<string>();
    section.subItems?.forEach((subItem, subItemIndex) => {
      const subItemPath = `${sectionPath}.subItems[${subItemIndex}]`;
      addRequiredTextIssue(issues, page.id, `${subItemPath}.id`, subItem.id);
      addDuplicateIdIssue(issues, page.id, `${subItemPath}.id`, subItem.id, subItemIds);
      addRequiredTextIssue(issues, page.id, `${subItemPath}.content`, subItem.content);

      const nestedItemIds = new Set<string>();
      subItem.nestedItems?.forEach((nestedItem, nestedItemIndex) => {
        const nestedItemPath = `${subItemPath}.nestedItems[${nestedItemIndex}]`;
        addRequiredTextIssue(issues, page.id, `${nestedItemPath}.id`, nestedItem.id);
        addDuplicateIdIssue(
          issues,
          page.id,
          `${nestedItemPath}.id`,
          nestedItem.id,
          nestedItemIds,
        );
        addRequiredTextIssue(issues, page.id, `${nestedItemPath}.title`, nestedItem.title);
        if (nestedItem.content !== undefined) {
          addRequiredTextIssue(issues, page.id, `${nestedItemPath}.content`, nestedItem.content);
        }
      });
    });
  });

  return issues;
};

export const validateCanonicalIntroductionContent = (
): readonly IntroductionContentValidationIssue[] => CANONICAL_INTRODUCTION_CONTENT_PAGES.flatMap(
  (page) => validateIntroductionContentPage(page),
);
