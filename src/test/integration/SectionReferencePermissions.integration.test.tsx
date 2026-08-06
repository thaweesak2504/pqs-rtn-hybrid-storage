import { invoke } from '@tauri-apps/api/tauri'
import { render, screen } from '@testing-library/react'
import type { ComponentType, ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../components/editor_v2/PqsEditorLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('../../components/editor_v2/PqsHeader', () => ({
  default: () => null,
}))

vi.mock('../../components/editor_v2/PqsQuestionSection', () => ({
  default: () => null,
}))

vi.mock('../../components/editor_v2/PqsReferenceSection', () => ({
  default: ({ readOnly }: { readOnly?: boolean }) => (
    <div
      data-testid="reference-section"
      data-read-only={String(readOnly)}
    />
  ),
}))

vi.mock('../../components/editor_v2/PqsSectionPreview100', () => ({
  default: () => null,
}))

vi.mock('../../components/editor_v2/PqsSectionPreview200', () => ({
  default: () => null,
}))

vi.mock('../../components/editor_v2/ScoreProgressBanner', () => ({
  default: () => null,
}))

vi.mock('../../components/modals/ConfirmModal', () => ({
  default: () => null,
}))

import Pqs200SectionEditor from '../../components/editor_v2/Pqs200SectionEditor'
import PqsSectionEditor from '../../components/editor_v2/PqsSectionEditor'

type ViewMode = 'edit' | 'qualifier' | 'trainee' | 'visitor' | 'print'

interface EditorProps {
  docId: string
  sectionNumber: number
  title: string
  viewMode?: ViewMode
}

interface EditorFixture {
  label: string
  Editor: ComponentType<EditorProps>
  sectionNumber: number
}

const editors: EditorFixture[] = [
  {
    label: 'Section 100 editor',
    Editor: PqsSectionEditor,
    sectionNumber: 102,
  },
  {
    label: 'Section 200 editor',
    Editor: Pqs200SectionEditor,
    sectionNumber: 201,
  },
]

describe.each(editors)('$label reference permissions', ({ Editor, sectionNumber }) => {
  beforeEach(() => {
    vi.mocked(invoke).mockReset()
    vi.mocked(invoke).mockImplementation(async (command: string) => {
      if (command === 'get_sections_by_document') {
        return [{
          id: sectionNumber,
          section_number: sectionNumber,
          title_th: `Section ${sectionNumber}`,
          menu_label: `${sectionNumber} Test`,
        }]
      }

      if (command === 'get_section_references') {
        return []
      }

      return null
    })
  })

  it.each([
    ['edit', false],
    ['trainee', true],
    ['qualifier', true],
    ['visitor', true],
  ] as const)('uses %s mode with readOnly=%s', async (viewMode, expectedReadOnly) => {
    render(
      <Editor
        docId="DOC-REFERENCE-MODES"
        sectionNumber={sectionNumber}
        title={`Section ${sectionNumber}`}
        viewMode={viewMode}
      />,
    )

    expect(await screen.findByTestId('reference-section'))
      .toHaveAttribute('data-read-only', String(expectedReadOnly))
  })
})
