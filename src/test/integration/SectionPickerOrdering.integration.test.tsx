import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionPickerEditor } from '../../components/editor_v2/questionFormCard/QuestionMetadataEditor';

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }));
vi.mock('@tauri-apps/api/tauri', () => ({ invoke: invokeMock }));
vi.mock('../../utils/logger', () => ({ logger: { error: vi.fn() } }));

const child201 = { id: 'R201', parent_id: 'PARENT', sequence: 1, content: 'System 201', score: 5, ref_section_id: 12, ref_section_number: 201 };
const child202 = { id: 'R202', parent_id: 'PARENT', sequence: 1, content: 'System 202', score: 10, ref_section_id: 123, ref_section_number: 202 };

function setup(children = [child202]) {
  const setChildren = vi.fn();
  render(<SectionPickerEditor
    is300 isSection200Selector formScoreType="normal" isEdit
    existingId="PARENT" sectionId={900} documentId="DOC" currentSectionNumber={304}
    sectionRefChildren={children} setSectionRefChildren={setChildren}
    setFormScoreType={vi.fn()} setFormScoreDisplayText={vi.fn()}
    backRefSectionIds={new Set<number>()}
    availableSections={[{ id: 12, section_number: 201, title_th: 'System 201' }, { id: 123, section_number: 202, title_th: 'System 202' }]}
  />);
  return setChildren;
}

describe('Section picker authoritative ordering', () => {
  beforeEach(() => { invokeMock.mockReset(); });

  it('reloads the entire persisted order after adding one reference', async () => {
    const authoritative = [child201, { ...child202, sequence: 2 }];
    invokeMock.mockImplementation(async (command: string) => {
      if (command === 'add_section_ref_child') return child201;
      if (command === 'get_section_ref_children') return authoritative;
      throw new Error(`Unexpected command: ${command}`);
    });
    const setChildren = setup();
    fireEvent.click(screen.getByRole('checkbox', { name: /201\s*System 201/ }));
    await waitFor(() => expect(setChildren).toHaveBeenCalledWith(authoritative));
    expect(invokeMock.mock.calls.map(call => call[0])).toEqual(['add_section_ref_child', 'get_section_ref_children']);
    expect(invokeMock).toHaveBeenLastCalledWith('get_section_ref_children', { parentId: 'PARENT' });
  });

  it('reloads resequenced survivors after removing a reference', async () => {
    invokeMock.mockImplementation(async (command: string) => {
      if (command === 'remove_section_ref_child') return null;
      if (command === 'get_section_ref_children') return [child202];
      throw new Error(`Unexpected command: ${command}`);
    });
    const setChildren = setup([child201, { ...child202, sequence: 2 }]);
    fireEvent.click(screen.getByRole('checkbox', { name: /201\s*System 201/ }));
    await waitFor(() => expect(setChildren).toHaveBeenCalledWith([child202]));
    expect(invokeMock).toHaveBeenCalledWith('remove_section_ref_child', { questionId: 'R201' });
    expect(invokeMock.mock.calls.map(call => call[0])).toEqual(['remove_section_ref_child', 'get_section_ref_children']);
  });

  it('uses the full ordered batch result for Select All', async () => {
    const authoritative = [child201, { ...child202, sequence: 2 }];
    invokeMock.mockResolvedValue(authoritative);
    const setChildren = setup([]);
    fireEvent.click(screen.getByRole('button', { name: 'เลือกทั้งหมด' }));
    await waitFor(() => expect(setChildren).toHaveBeenCalledWith(authoritative));
    expect(invokeMock.mock.calls.map(call => call[0])).toEqual(['batch_add_section_ref_children']);
  });

  it('keeps the current list when a mutation is rejected', async () => {
    invokeMock.mockRejectedValue(new Error('Ordering transaction rolled back'));
    const setChildren = setup();
    fireEvent.click(screen.getByRole('checkbox', { name: /201\s*System 201/ }));
    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(1));
    expect(setChildren).not.toHaveBeenCalled();
    expect(screen.getByRole('checkbox', { name: /202\s*System 202/ })).toBeChecked();
  });
});
