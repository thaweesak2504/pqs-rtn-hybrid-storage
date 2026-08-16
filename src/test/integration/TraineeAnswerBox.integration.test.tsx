import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TraineeAnswerBox from '../../components/editor_v2/TraineeAnswerBox';
import { invoke } from '@tauri-apps/api/tauri';
import { UserAnswer } from '../../components/editor_v2/PqsQuestionSection';
import type { DeleteAnswerResult } from '../../types';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn(),
  convertFileSrc: (path: string) => path,
}));

vi.mock('../../components/editor_v2/TiptapEditor', () => ({
  default: ({
    initialContent,
    onChange,
    placeholder,
  }: {
    initialContent: string;
    onChange: (markdown: string) => void;
    placeholder?: string;
  }) => (
    <div
      role="textbox"
      aria-label={placeholder}
      contentEditable
      suppressContentEditableWarning
      onInput={(event) => onChange(event.currentTarget.textContent || '')}
    >
      {initialContent}
    </div>
  ),
}));

// Mock ConfirmModal to simplify testing the callback triggers
vi.mock('../../components/modals/ConfirmModal', () => ({
  default: ({
    isOpen,
    onConfirm,
    onClose,
    title,
    message,
    confirmText,
  }: {
    isOpen: boolean;
    onConfirm: () => void;
    onClose: () => void;
    title: string;
    message: string;
    confirmText?: string;
  }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="confirm-modal">
        <h3>{title}</h3>
        <p>{message}</p>
        <button onClick={onConfirm}>{confirmText || 'OK'}</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    );
  },
}));

const successfulDeleteResult: DeleteAnswerResult = {
  userId: 'T-001',
  documentId: 'doc-1',
  questionId: 'q-1',
  subQuestionCode: '',
  database: {
    matched: true,
    answerRowsDeleted: 1,
    answerTextWasPresent: true,
    wasAssessed: false,
    referencedAttachmentPathCount: 1,
    invalidAttachmentMetadata: false,
    committed: true,
  },
  progress: {
    attempted: true,
    sectionsUpdated: 1,
    complete: true,
    failure: null,
  },
  attachments: {
    logicalDirectory: 'data/doc-1/trainee-attachments',
    dataDirectoryAvailable: true,
    cleanupAttempted: true,
    directoryFound: true,
    managedFilesFound: 1,
    managedFilesDeleted: 1,
    managedFilesRetained: 0,
    managedFilesMissing: 0,
    cleanupComplete: true,
    failures: [],
  },
};

describe('TraineeAnswerBox Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(invoke).mockReset();
  });

  const mockTraineeAnswer: UserAnswer = {
    user_id: 'T-001',
    question_id: 'q-1',
    document_id: 'doc-1',
    sub_question_code: '',
    answer_text: 'Original Answer Text',
    status: 'pending',
    feedback: null,
    assessed_at: null,
    assessed_by: null,
    updated_at: '2026-08-11 06:24:00',
    attachments: JSON.stringify(['attachment_1.png']),
  };

  it('renders answer text and attachment count correctly in view mode', () => {
    render(
      <TraineeAnswerBox
        questionId="q-1"
        documentId="doc-1"
        mode="trainee"
        label="ก"
        traineeAnswer={mockTraineeAnswer}
      />
    );

    // Should display the saved answer text
    const answerText = screen.getByText('Original Answer Text');
    expect(answerText).toBeInTheDocument();
    expect(answerText.closest('.answer-key-markdown')).toHaveClass('mt-2', 'w-full');
    // Should display the status label
    expect(screen.getByText('รอประเมิน')).toBeInTheDocument();
    expect(screen.getByLabelText(/^อัปเดตล่าสุด/)).toHaveClass('text-[10px]', 'font-bold', 'text-slate-500', 'dark:text-slate-300');
    expect(screen.getByLabelText(/^อัปเดตล่าสุด/)).not.toHaveAttribute('title');
    expect(screen.getByRole('button', { name: 'แก้ไขคำตอบ ข้อ q-1 คำถามย่อย ก' }).parentElement).toHaveClass('ml-auto');
  });

  it('renders one clear empty-answer state with one answer command', () => {
    const emptyAnswer: UserAnswer = {
      ...mockTraineeAnswer,
      answer_text: null,
      attachments: null,
    };

    render(
      <TraineeAnswerBox
        questionId="q-1"
        documentId="doc-1"
        questionPrefix="201.2.2"
        mode="trainee"
        label="ก"
        traineeAnswer={emptyAnswer}
      />
    );

    expect(screen.getAllByText('ยังไม่มีคำตอบ')).toHaveLength(1);
    expect(screen.queryByText('[คลิกเพื่อระบุคำตอบ...]')).not.toBeInTheDocument();
    expect(screen.queryByText('ยังไม่ได้ส่งคำตอบ')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'ตอบคำถาม ข้อ 201.2.2 คำถามย่อย ก' })).toHaveLength(1);
  });

  it('enters edit mode from the explicit command and disables Save if text is emptied', async () => {
    render(
      <TraineeAnswerBox
        questionId="q-1"
        documentId="doc-1"
        mode="trainee"
        traineeAnswer={mockTraineeAnswer}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'แก้ไขคำตอบ ข้อ q-1' }));

    // Tiptap exposes its ProseMirror surface as a contenteditable textbox.
    const editor = screen.getByRole('textbox', { name: 'ระบุคำตอบของคุณที่นี่...' });
    expect(editor).toHaveTextContent('Original Answer Text');

    // Change value to empty
    editor.textContent = '';
    fireEvent.input(editor);
    
    // Save button should be disabled because the text is empty
    const saveButton = screen.getByRole('button', { name: /บันทึก/i });
    expect(saveButton).toBeDisabled();
  });

  it('keeps answer content and status non-interactive while exposing one edit command', () => {
    const needsImprovementAnswer: UserAnswer = {
      ...mockTraineeAnswer,
      status: 'needs_improvement',
      feedback: 'ตอบแยกข้อให้ชัดเจน',
    };

    render(
      <TraineeAnswerBox
        questionId="q-1"
        documentId="doc-1"
        questionPrefix="201.3.1"
        mode="trainee"
        traineeAnswer={needsImprovementAnswer}
      />
    );

    const answerText = screen.getByText('Original Answer Text');
    fireEvent.click(answerText);

    expect(screen.queryByRole('textbox', { name: 'ระบุคำตอบของคุณที่นี่...' })).not.toBeInTheDocument();
    expect(screen.getAllByText('รอการแก้ไข')).toHaveLength(1);
    expect(screen.queryByText('ปรับปรุง')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'แก้ไขคำตอบ ข้อ 201.3.1' })).toHaveLength(1);
    expect(answerText.closest('.rounded-md')).not.toHaveClass('cursor-pointer', 'hover:shadow-md');
  });

  it('provides an explicit answer command and restores focus after clean cancel', async () => {
    render(
      <TraineeAnswerBox
        questionId="q-1"
        documentId="doc-1"
        questionPrefix="101.1"
        mode="trainee"
        traineeAnswer={mockTraineeAnswer}
      />
    );

    const editAnswerButton = screen.getByRole('button', { name: 'แก้ไขคำตอบ ข้อ 101.1' });
    fireEvent.click(editAnswerButton);
    fireEvent.click(screen.getByRole('button', { name: 'ยกเลิก' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'แก้ไขคำตอบ ข้อ 101.1' })).toHaveFocus();
    });
  });

  it('restores focus to the answer command after a successful save', async () => {
    vi.mocked(invoke).mockResolvedValue('success');

    render(
      <TraineeAnswerBox
        questionId="q-1"
        documentId="doc-1"
        questionPrefix="101.1"
        mode="trainee"
        traineeAnswer={mockTraineeAnswer}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'แก้ไขคำตอบ ข้อ 101.1' }));
    fireEvent.click(screen.getByRole('button', { name: 'บันทึก' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'แก้ไขคำตอบ ข้อ 101.1' })).toHaveFocus();
    });
  });

  it('asks before discarding a dirty edit, then restores the original value', async () => {
    render(
      <TraineeAnswerBox
        questionId="q-1"
        documentId="doc-1"
        mode="trainee"
        traineeAnswer={mockTraineeAnswer}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'แก้ไขคำตอบ ข้อ q-1' }));

    const editor = screen.getByRole('textbox', { name: 'ระบุคำตอบของคุณที่นี่...' });
    editor.textContent = 'Modified Answer Text';
    fireEvent.input(editor);
    expect(editor).toHaveTextContent('Modified Answer Text');

    // Cancel requests confirmation because the draft differs from the saved answer.
    const cancelButton = screen.getByRole('button', { name: /ยกเลิก/i });
    fireEvent.click(cancelButton);

    expect(screen.getByText('ละทิ้งการแก้ไขคำตอบ?')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'ระบุคำตอบของคุณที่นี่...' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'ละทิ้งการแก้ไข' }));

    // Editor should be gone, back to view mode showing original text
    await waitFor(() => {
      expect(screen.getByText('Original Answer Text')).toBeInTheDocument();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'แก้ไขคำตอบ ข้อ q-1' })).toHaveFocus();
    });
  });

  it('explains and reports an authoritative Section 100 answer deletion, then restores focus', async () => {
    vi.mocked(invoke).mockResolvedValue({
      ...successfulDeleteResult,
      database: { ...successfulDeleteResult.database, wasAssessed: true },
    });
    const onAnswerSavedMock = vi.fn();
    const assessedAnswer: UserAnswer = {
      ...mockTraineeAnswer,
      status: 'needs_improvement',
      feedback: 'โปรดแก้ไขคำตอบ',
    };

    render(
      <TraineeAnswerBox
        questionId="q-1"
        documentId="doc-1"
        questionPrefix="101.1"
        mode="trainee"
        traineeAnswer={assessedAnswer}
        onAnswerSaved={onAnswerSavedMock}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'แก้ไขคำตอบ ข้อ 101.1' }));
    const clearButton = screen.getByRole('button', { name: 'ล้างคำตอบข้อ 101.1' });
    fireEvent.click(clearButton);

    const confirmation = screen.getByRole('dialog', { name: 'ลบคำตอบข้อ 101.1?' });
    expect(confirmation).toHaveTextContent('มีข้อความคำตอบ');
    expect(confirmation).toHaveTextContent('1 ไฟล์');
    expect(confirmation).toHaveTextContent('ปรับปรุง');
    expect(confirmation).toHaveTextContent('คำนวณ Progress ราย Section ของรอบจำลองใหม่');
    expect(screen.getByRole('button', { name: 'กลับไปแก้ไข' })).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(clearButton).toHaveFocus());

    fireEvent.click(clearButton);
    fireEvent.click(screen.getByRole('button', { name: 'ลบคำตอบข้อนี้' }));

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('delete_trainee_answer', {
        userId: 'T-001',
        questionId: 'q-1',
        documentId: 'doc-1',
        subQuestionCode: '',
      });
    });

    const resultDialog = await screen.findByRole('dialog', { name: 'ลบคำตอบเรียบร้อย' });
    expect(resultDialog).toHaveTextContent('คำตอบที่ลบ1');
    expect(resultDialog).toHaveTextContent('ผลประเมินที่ลบ1');
    expect(resultDialog).toHaveTextContent('Section Progress ที่คำนวณใหม่1');
    expect(resultDialog).toHaveTextContent('ไฟล์ที่ลบ1');
    expect(onAnswerSavedMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'ปิดผลการลบ' })).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: 'ปิดผลการลบ' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'ตอบคำถาม ข้อ 101.1' })).toHaveFocus();
    });
  });

  it('deletes an attachment-only Section 300 prerequisite with evidence-specific commands', async () => {
    const prerequisiteDeleteResult: DeleteAnswerResult = {
      ...successfulDeleteResult,
      questionId: 'q-301-prerequisite',
      database: {
        ...successfulDeleteResult.database,
        answerTextWasPresent: false,
        referencedAttachmentPathCount: 1,
        wasAssessed: true,
      },
    };
    vi.mocked(invoke).mockImplementation((command) => {
      if (command === 'delete_trainee_answer') return Promise.resolve(prerequisiteDeleteResult);
      return Promise.resolve(null);
    });
    const prerequisiteAnswer: UserAnswer = {
      ...mockTraineeAnswer,
      question_id: 'q-301-prerequisite',
      answer_text: null,
      status: 'needs_improvement',
      feedback: 'กรุณาแนบเอกสารที่ชัดเจนกว่าเดิม',
      attachments: JSON.stringify(['data/doc-1/trainee-attachments/301.1.1_certificate.png']),
    };

    render(
      <TraineeAnswerBox
        questionId="q-301-prerequisite"
        documentId="doc-1"
        questionPrefix="301.1.1"
        mode="trainee"
        traineeAnswer={prerequisiteAnswer}
        isPrerequisiteDoc
      />
    );

    expect(screen.getByText('เอกสารหลักฐาน:')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /คำตอบ/ })).not.toBeInTheDocument();
    const editEvidenceButton = screen.getByRole('button', { name: 'แก้ไขเอกสารหลักฐาน ข้อ 301.1.1' });
    fireEvent.click(editEvidenceButton);

    const uploadEvidenceButton = screen.getByRole('button', { name: /แนบไฟล์/ });
    await waitFor(() => {
      expect(uploadEvidenceButton).toHaveFocus();
    });
    expect(uploadEvidenceButton).toHaveClass('focus:ring-1');

    const clearEvidenceButton = screen.getByRole('button', { name: 'ล้างเอกสารหลักฐานข้อ 301.1.1' });
    fireEvent.click(clearEvidenceButton);

    const confirmation = screen.getByRole('dialog', { name: 'ลบเอกสารหลักฐานข้อ 301.1.1?' });
    expect(confirmation).toHaveTextContent('1 ไฟล์');
    expect(confirmation).toHaveTextContent('ปรับปรุง');
    expect(confirmation).not.toHaveTextContent('ไม่มีข้อความคำตอบ');
    fireEvent.click(screen.getByRole('button', { name: 'ลบเอกสารหลักฐานข้อนี้' }));

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('delete_trainee_answer', {
        userId: 'T-001',
        questionId: 'q-301-prerequisite',
        documentId: 'doc-1',
        subQuestionCode: '',
      });
    });
    expect(await screen.findByRole('dialog', { name: 'ลบเอกสารหลักฐานเรียบร้อย' })).toHaveTextContent('ชุดหลักฐานที่ลบ1');

    fireEvent.click(screen.getByRole('button', { name: 'ปิดผลการลบ' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'แนบเอกสารหลักฐาน ข้อ 301.1.1' })).toHaveFocus();
    });
  });

  it('prevents deleting a saved answer while its current edit draft is dirty', () => {
    render(
      <TraineeAnswerBox
        questionId="q-1"
        documentId="doc-1"
        questionPrefix="101.1"
        mode="trainee"
        traineeAnswer={mockTraineeAnswer}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'แก้ไขคำตอบ ข้อ 101.1' }));
    const editor = screen.getByRole('textbox', { name: 'ระบุคำตอบของคุณที่นี่...' });
    editor.textContent = 'Unsaved replacement';
    fireEvent.input(editor);

    const clearButton = screen.getByRole('button', { name: 'ล้างคำตอบข้อ 101.1' });
    expect(clearButton).toBeDisabled();
    expect(clearButton).toHaveAccessibleDescription('กรุณาบันทึกหรือยกเลิกการแก้ไขก่อนล้างคำตอบ');
    fireEvent.click(clearButton);
    expect(screen.queryByRole('dialog', { name: /ลบคำตอบข้อ/ })).not.toBeInTheDocument();
    expect(invoke).not.toHaveBeenCalledWith('delete_trainee_answer', expect.anything());
  });

  it('keeps a failed deletion in the modal and allows a successful retry', async () => {
    let deleteAttempts = 0;
    vi.mocked(invoke).mockImplementation((command) => {
      if (command !== 'delete_trainee_answer') return Promise.resolve(null);
      deleteAttempts += 1;
      return deleteAttempts === 1
        ? Promise.reject(new Error('database is busy'))
        : Promise.resolve(successfulDeleteResult);
    });

    render(
      <TraineeAnswerBox
        questionId="q-1"
        documentId="doc-1"
        questionPrefix="101.1"
        mode="trainee"
        traineeAnswer={mockTraineeAnswer}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'แก้ไขคำตอบ ข้อ 101.1' }));
    fireEvent.click(screen.getByRole('button', { name: 'ล้างคำตอบข้อ 101.1' }));
    fireEvent.click(screen.getByRole('button', { name: 'ลบคำตอบข้อนี้' }));

    const retryButton = await screen.findByRole('button', { name: 'ลองลบอีกครั้ง' });
    expect(screen.getByRole('alert')).toHaveTextContent('database is busy');
    expect(screen.getByRole('button', { name: 'คัดลอกรายละเอียด' })).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(await screen.findByRole('dialog', { name: 'ลบคำตอบเรียบร้อย' })).toBeInTheDocument();
    expect(deleteAttempts).toBe(2);
  });

  it('shows committed deletion counts and a diagnostic action when cleanup is partial', async () => {
    vi.mocked(invoke).mockResolvedValue({
      ...successfulDeleteResult,
      progress: {
        attempted: true,
        sectionsUpdated: 0,
        complete: false,
        failure: 'progress refresh failed',
      },
    });

    render(
      <TraineeAnswerBox
        questionId="q-1"
        documentId="doc-1"
        questionPrefix="101.1"
        mode="trainee"
        traineeAnswer={mockTraineeAnswer}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'แก้ไขคำตอบ ข้อ 101.1' }));
    fireEvent.click(screen.getByRole('button', { name: 'ล้างคำตอบข้อ 101.1' }));
    fireEvent.click(screen.getByRole('button', { name: 'ลบคำตอบข้อนี้' }));

    const resultDialog = await screen.findByRole('dialog', { name: 'ลบคำตอบแล้ว แต่มีรายการต้องตรวจสอบ' });
    expect(resultDialog).toHaveTextContent('ลบคำตอบแล้ว แต่การคำนวณ Progress ใหม่ไม่สมบูรณ์');
    expect(resultDialog).toHaveTextContent('progress refresh failed');
    expect(screen.getByRole('button', { name: 'คัดลอกรายละเอียด' })).toBeInTheDocument();
  });

  it('deletes only the selected Section 200 sub-question identity', async () => {
    const subQuestionDeleteResult: DeleteAnswerResult = {
      ...successfulDeleteResult,
      subQuestionCode: 'sq-a',
    };
    vi.mocked(invoke).mockResolvedValue(subQuestionDeleteResult);
    const answerA = { ...mockTraineeAnswer, sub_question_code: 'sq-a', answer_text: 'คำตอบ ก' };
    const answerB = { ...mockTraineeAnswer, sub_question_code: 'sq-b', answer_text: 'คำตอบ ข' };

    render(
      <>
        <TraineeAnswerBox
          questionId="q-1"
          documentId="doc-1"
          subQuestionCode="sq-a"
          questionPrefix="201.2.1"
          label="ก"
          mode="trainee"
          traineeAnswer={answerA}
        />
        <TraineeAnswerBox
          questionId="q-1"
          documentId="doc-1"
          subQuestionCode="sq-b"
          questionPrefix="201.2.1"
          label="ข"
          mode="trainee"
          traineeAnswer={answerB}
        />
      </>
    );

    fireEvent.click(screen.getByRole('button', { name: 'แก้ไขคำตอบ ข้อ 201.2.1 คำถามย่อย ก' }));
    fireEvent.click(screen.getByRole('button', { name: 'ล้างคำตอบข้อ 201.2.1 คำถามย่อย ก' }));
    expect(screen.getByRole('dialog', { name: 'ลบคำตอบข้อ 201.2.1 คำถามย่อย ก?' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'ลบคำตอบข้อนี้' }));

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('delete_trainee_answer', {
        userId: 'T-001',
        questionId: 'q-1',
        documentId: 'doc-1',
        subQuestionCode: 'sq-a',
      });
    });
    expect(screen.getByText('คำตอบ ข')).toBeInTheDocument();
  });

  it('moves focus into a manually opened Qualifier panel and restores it on close', async () => {
    render(
      <TraineeAnswerBox
        questionId="q-1"
        documentId="doc-1"
        questionPrefix="101.1"
        mode="qualifier"
        traineeAnswer={mockTraineeAnswer}
      />
    );

    expect(screen.queryByRole('region', { name: 'การประเมิน ข้อ 101.1' })).not.toBeInTheDocument();
    const initialOpenAssessmentButton = screen.getByRole('button', { name: 'เปิดการประเมิน' });
    expect(initialOpenAssessmentButton.parentElement).toHaveClass('ml-auto');
    fireEvent.click(initialOpenAssessmentButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'ผ่าน' })).toHaveFocus();
    });
    const closeAssessmentButton = screen.getByRole('button', { name: 'ปิดการประเมิน' });
    expect(closeAssessmentButton).toHaveClass('border', 'focus:ring-1', '!border-slate-500');
    expect(screen.getByRole('group', { name: 'คำสั่งการประเมิน' })).toHaveClass('flex-wrap', 'justify-end');
    expect(screen.getByRole('group', { name: 'คำสั่งการประเมิน' }).parentElement).toHaveClass('flex-wrap');
    fireEvent.click(closeAssessmentButton);
    const openAssessmentButton = screen.getByRole('button', { name: 'เปิดการประเมิน' });
    expect(openAssessmentButton).toHaveFocus();
    expect(openAssessmentButton).toHaveClass('!text-[10px]', '!font-bold');

    fireEvent.click(openAssessmentButton);
    await waitFor(() => {
      const passButton = screen.getByRole('button', { name: 'ผ่าน' });
      expect(passButton).toHaveFocus();
      expect(passButton).toHaveClass('!bg-white', '!text-emerald-700', '!text-xs', 'focus:ring-1');
      expect(screen.getByRole('button', { name: 'ปรับปรุง' })).toHaveClass('!bg-white', '!text-rose-700', 'focus:ring-1');
    });
  });

  it('starts collapsed again when returning to Qualifier mode', async () => {
    const { rerender } = render(
      <TraineeAnswerBox
        questionId="q-1"
        documentId="doc-1"
        questionPrefix="101.1"
        mode="qualifier"
        traineeAnswer={mockTraineeAnswer}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'เปิดการประเมิน' }));
    expect(screen.getByRole('region', { name: 'การประเมิน ข้อ 101.1' })).toBeInTheDocument();

    rerender(
      <TraineeAnswerBox
        questionId="q-1"
        documentId="doc-1"
        questionPrefix="101.1"
        mode="trainee"
        traineeAnswer={mockTraineeAnswer}
      />
    );
    rerender(
      <TraineeAnswerBox
        questionId="q-1"
        documentId="doc-1"
        questionPrefix="101.1"
        mode="qualifier"
        traineeAnswer={mockTraineeAnswer}
      />
    );

    await waitFor(() => {
      expect(screen.queryByRole('region', { name: 'การประเมิน ข้อ 101.1' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'เปิดการประเมิน' })).toBeInTheDocument();
    });
  });

  it('closes an inline Qualifier panel with Escape and restores its opener', async () => {
    render(
      <TraineeAnswerBox
        questionId="q-1"
        documentId="doc-1"
        questionPrefix="101.1"
        mode="qualifier"
        traineeAnswer={mockTraineeAnswer}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'เปิดการประเมิน' }));
    const passButton = screen.getByRole('button', { name: 'ผ่าน' });
    passButton.focus();
    fireEvent.keyDown(passButton, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('region', { name: 'การประเมิน ข้อ 101.1' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'เปิดการประเมิน' })).toHaveFocus();
    });

  });

  it('discards an unsaved improvement selection when closing the Qualifier panel', async () => {
    render(
      <TraineeAnswerBox
        questionId="q-1"
        documentId="doc-1"
        questionPrefix="101.1"
        mode="qualifier"
        traineeAnswer={mockTraineeAnswer}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'เปิดการประเมิน' }));
    fireEvent.click(screen.getByRole('button', { name: 'ปรับปรุง' }));
    const feedbackInput = screen.getByRole('textbox', { name: 'ข้อเสนอแนะสำหรับการปรับปรุง' });
    fireEvent.change(feedbackInput, { target: { value: 'คำแนะนำที่ยังไม่ได้บันทึก' } });
    fireEvent.keyDown(feedbackInput, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('region', { name: 'การประเมิน ข้อ 101.1' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'เปิดการประเมิน' })).toHaveFocus();
    });

    fireEvent.click(screen.getByRole('button', { name: 'เปิดการประเมิน' }));
    expect(screen.queryByRole('textbox', { name: 'ข้อเสนอแนะสำหรับการปรับปรุง' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ปรับปรุง' })).toHaveAttribute('data-state', 'available');
  });

  it('keeps feedback validation reachable and linked to the Qualifier textarea', () => {
    render(
      <TraineeAnswerBox
        questionId="q-1"
        documentId="doc-1"
        questionPrefix="101.1"
        mode="qualifier"
        traineeAnswer={mockTraineeAnswer}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'เปิดการประเมิน' }));
    fireEvent.click(screen.getByRole('button', { name: 'ปรับปรุง' }));
    const feedbackInput = screen.getByRole('textbox', { name: 'ข้อเสนอแนะสำหรับการปรับปรุง' });
    expect(feedbackInput).toHaveFocus();

    const saveFeedbackButton = screen.getByRole('button', { name: 'บันทึกคำแนะนำ' });
    expect(saveFeedbackButton).not.toBeDisabled();
    expect(saveFeedbackButton).toHaveAttribute('aria-disabled', 'true');
    expect(saveFeedbackButton).toHaveAttribute('aria-describedby', feedbackInput.getAttribute('aria-describedby'));

    fireEvent.click(saveFeedbackButton);
    expect(screen.getByRole('alert')).toHaveTextContent('กรุณาระบุข้อเสนอแนะสำหรับการปรับปรุงก่อนบันทึก');
    expect(feedbackInput).toHaveAttribute('aria-invalid', 'true');
    expect(feedbackInput).toHaveFocus();
    expect(invoke).not.toHaveBeenCalledWith('save_qualifier_assessment', expect.anything());
  });

  it('restores focus to the Qualifier command after saving a passed assessment', async () => {
    vi.mocked(invoke).mockResolvedValue('success');

    render(
      <TraineeAnswerBox
        questionId="q-1"
        documentId="doc-1"
        questionPrefix="101.1"
        mode="qualifier"
        traineeAnswer={mockTraineeAnswer}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'เปิดการประเมิน' }));
    fireEvent.click(screen.getByRole('button', { name: 'ผ่าน' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'แก้ไขการประเมิน' })).toHaveFocus();
      expect(screen.getByRole('status')).toHaveTextContent('บันทึกการประเมินสถานะ ผ่าน เรียบร้อยแล้ว');
    });
    fireEvent.click(screen.getByRole('button', { name: 'แก้ไขการประเมิน' }));
    await waitFor(() => {
      const undoPassButton = screen.getByRole('button', { name: 'ยกเลิกผ่าน' });
      expect(undoPassButton).toHaveFocus();
      expect(undoPassButton).toHaveClass('!bg-amber-50', '!text-amber-700', 'focus:ring-1');
      expect(screen.queryByRole('button', { name: 'ปรับปรุง' })).not.toBeInTheDocument();
    });
    expect(invoke).toHaveBeenCalledWith('save_qualifier_assessment', expect.objectContaining({
      args: expect.objectContaining({ status: 'passed' }),
    }));
  });

  it('restores focus to Edit Feedback after saving needs-improvement feedback', async () => {
    vi.mocked(invoke).mockResolvedValue('success');

    render(
      <TraineeAnswerBox
        questionId="q-1"
        documentId="doc-1"
        questionPrefix="101.1"
        mode="qualifier"
        traineeAnswer={mockTraineeAnswer}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'เปิดการประเมิน' }));
    fireEvent.click(screen.getByRole('button', { name: 'ปรับปรุง' }));
    fireEvent.change(screen.getByPlaceholderText('พิมพ์คำแนะนำที่นี่เพื่อให้ Trainee นำไปแก้ไข...'), {
      target: { value: 'โปรดเพิ่มรายละเอียด' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'บันทึกคำแนะนำ' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'แก้ไขคำแนะนำ' })).toHaveFocus();
    });
  });

  it('confirms before reverting a saved improvement assessment to pending', async () => {
    vi.mocked(invoke).mockResolvedValue('success');
    const onAssessmentSaved = vi.fn();
    const needsImprovementAnswer: UserAnswer = {
      ...mockTraineeAnswer,
      status: 'needs_improvement',
      feedback: 'โปรดเพิ่มรายละเอียด',
      assessed_at: '2026-08-11 08:00:00',
      assessed_by: 'Q-001',
    };

    const { rerender } = render(
      <TraineeAnswerBox
        questionId="q-1"
        documentId="doc-1"
        questionPrefix="101.1"
        mode="qualifier"
        traineeAnswer={needsImprovementAnswer}
        onAssessmentSaved={onAssessmentSaved}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: 'แก้ไขคำแนะนำ' }));
    fireEvent.click(screen.getByRole('button', { name: 'ยกเลิกการปรับปรุง' }));

    const dialog = screen.getByRole('dialog', { name: 'ยกเลิกการปรับปรุง?' });
    expect(dialog).toHaveTextContent('คำแนะนำสำหรับการปรับปรุงจะถูกล้าง');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'กลับไปประเมินต่อ' })).toHaveFocus();
    });

    fireEvent.click(screen.getByRole('button', { name: 'ยืนยันยกเลิกการปรับปรุง' }));

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('save_qualifier_assessment', {
        args: expect.objectContaining({
          status: 'pending',
          feedback: null,
          question_id: 'q-1',
          document_id: 'doc-1',
          sub_question_code: '',
        }),
      });
      expect(onAssessmentSaved).toHaveBeenCalled();
      expect(screen.queryByText('คำแนะนำ:')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'เปิดการประเมิน' })).toHaveFocus();
    });

    rerender(
      <TraineeAnswerBox
        questionId="q-1"
        documentId="doc-1"
        questionPrefix="101.1"
        mode="qualifier"
        traineeAnswer={{ ...needsImprovementAnswer, status: 'pending', feedback: null }}
        onAssessmentSaved={onAssessmentSaved}
      />
    );

    expect(screen.queryByRole('region', { name: 'การประเมิน ข้อ 101.1' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'เปิดการประเมิน' })).toHaveFocus();
  });

  it('exposes busy state only on the Qualifier action being saved', async () => {
    let resolveAssessment: (value: unknown) => void = () => undefined;
    vi.mocked(invoke).mockImplementation(() => new Promise((resolve) => {
      resolveAssessment = resolve;
    }));

    render(
      <TraineeAnswerBox
        questionId="q-1"
        documentId="doc-1"
        questionPrefix="101.1"
        mode="qualifier"
        traineeAnswer={mockTraineeAnswer}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'เปิดการประเมิน' }));
    fireEvent.click(screen.getByRole('button', { name: 'ผ่าน' }));
    const busyButton = await screen.findByRole('button', { name: 'กำลังบันทึก...' });
    expect(busyButton).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'ปรับปรุง' })).not.toHaveAttribute('aria-busy');

    resolveAssessment('success');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'แก้ไขการประเมิน' })).toHaveFocus();
    });
  });
});
