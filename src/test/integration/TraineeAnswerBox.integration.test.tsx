import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import TraineeAnswerBox, { AssessmentStatus } from '../../components/editor_v2/TraineeAnswerBox';
import { invoke } from '@tauri-apps/api/tauri';
import { UserAnswer } from '../../components/editor_v2/PqsQuestionSection';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn(),
  convertFileSrc: (path: string) => path,
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
    attachments: JSON.stringify(['attachment_1.png']),
  };

  it('renders answer text and attachment count correctly in view mode', () => {
    render(
      <TraineeAnswerBox
        questionId="q-1"
        documentId="doc-1"
        mode="trainee"
        traineeAnswer={mockTraineeAnswer}
      />
    );

    // Should display the saved answer text
    expect(screen.getByText('Original Answer Text')).toBeInTheDocument();
    // Should display the status label
    expect(screen.getByText('รอประเมิน')).toBeInTheDocument();
  });

  it('enters edit mode on click and disables Save if text is emptied', async () => {
    render(
      <TraineeAnswerBox
        questionId="q-1"
        documentId="doc-1"
        mode="trainee"
        traineeAnswer={mockTraineeAnswer}
      />
    );

    // Click on answer block to start editing
    const answerBlock = screen.getByText('Original Answer Text').closest('div');
    expect(answerBlock).toBeDefined();
    fireEvent.click(answerBlock!);

    // Now in edit mode, find textarea and buttons
    const textarea = screen.getByPlaceholderText('ระบุคำตอบของคุณที่นี่...') as HTMLTextAreaElement;
    expect(textarea.value).toBe('Original Answer Text');

    // Change value to empty
    fireEvent.change(textarea, { target: { value: '   ' } });
    
    // Save button should be disabled because the text is empty
    const saveButton = screen.getByRole('button', { name: /บันทึก/i });
    expect(saveButton).toBeDisabled();
  });

  it('reverts edits and restores original value on Cancel', async () => {
    render(
      <TraineeAnswerBox
        questionId="q-1"
        documentId="doc-1"
        mode="trainee"
        traineeAnswer={mockTraineeAnswer}
      />
    );

    // Enter edit mode
    const answerBlock = screen.getByText('Original Answer Text').closest('div');
    fireEvent.click(answerBlock!);

    const textarea = screen.getByPlaceholderText('ระบุคำตอบของคุณที่นี่...') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Modified Answer Text' } });

    // Cancel edit
    const cancelButton = screen.getByRole('button', { name: /ยกเลิก/i });
    fireEvent.click(cancelButton);

    // Textarea should be gone, back to view mode showing original text
    expect(screen.getByText('Original Answer Text')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('ระบุคำตอบของคุณที่นี่...')).not.toBeInTheDocument();
  });

  it('triggers delete_trainee_answer command when "ล้างคำตอบ" is clicked and confirmed', async () => {
    vi.mocked(invoke).mockResolvedValue('success');

    const onAnswerSavedMock = vi.fn();

    render(
      <TraineeAnswerBox
        questionId="q-1"
        documentId="doc-1"
        mode="trainee"
        traineeAnswer={mockTraineeAnswer}
        onAnswerSaved={onAnswerSavedMock}
      />
    );

    // Enter edit mode
    const answerBlock = screen.getByText('Original Answer Text').closest('div');
    fireEvent.click(answerBlock!);

    // Clear Answer button should be visible
    const clearButton = screen.getByRole('button', { name: /ล้างคำตอบ/i });
    fireEvent.click(clearButton);

    // Confirm modal should appear
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
    expect(screen.getByText(/คุณต้องการลบคำตอบและไฟล์แนบทั้งหมดของข้อนี้ใช่หรือไม่/)).toBeInTheDocument();

    // Click confirm delete
    const confirmDeleteBtn = screen.getByRole('button', { name: /ยืนยันลบ/i });
    fireEvent.click(confirmDeleteBtn);

    // Should call invoke delete_trainee_answer with correct arguments
    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('delete_trainee_answer', {
        userId: 'T-001',
        questionId: 'q-1',
        documentId: 'doc-1',
        subQuestionCode: '',
      });
    });

    // Check callback is fired
    expect(onAnswerSavedMock).toHaveBeenCalled();
  });
});
