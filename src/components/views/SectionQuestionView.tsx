import React, { useState, useEffect, useMemo } from 'react';
import { BookOpen } from 'lucide-react';
import { invoke } from '@tauri-apps/api/tauri';
import { QuestionDetail } from '../../types/content';
import QuestionRenderer from '../questions/QuestionRenderer';
import ReferenceManager from '../sections/ReferenceManager';

interface SectionQuestionViewProps {
  isPreviewMode?: boolean;
  docId: string;
  sectionId: number;
  sectionNumber: number; // e.g. 200, 300
  title: string;
  subTitle?: string;
  headerColorClass?: string; // e.g. "from-orange-600 to-orange-700"
}

const SectionQuestionView: React.FC<SectionQuestionViewProps> = ({
  isPreviewMode = false,
  docId,
  sectionId,
  sectionNumber,
  title,
  subTitle,
  headerColorClass = "from-blue-600 to-blue-700"
}) => {
  const [questions, setQuestions] = useState<QuestionDetail[]>([]);
  const [loading, setLoading] = useState(true);

  const toThaiNumber = (num: number) => {
    const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
    return num.toString().split('').map(d => thaiDigits[parseInt(d)] || d).join('');
  };

  useEffect(() => {
    fetchQuestions();
  }, [docId, sectionNumber, sectionId]);

  const fetchQuestions = async () => {
    if (!docId) return;

    try {
      setLoading(true);
      const data = await invoke<QuestionDetail[]>('get_document_questions_with_details', { docId });

      // Filter for specific section
      // Match by Section ID (Database Row ID) OR by Sequence (Legacy)
      const filteredQuestions = data.filter(q =>
        (q.section_id === sectionId) || (q.section_id === 0 && q.sequence >= sectionNumber && q.sequence < sectionNumber + 100)
      );
      setQuestions(filteredQuestions);
    } catch (error) {
      console.error(`Failed to fetch questions for section ${sectionNumber}:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    console.log(`Answer changed for ${questionId}: ${value}`);
    // TODO: Implement save logic
  };

  // Build Hierarchy Tree
  const questionTree = useMemo(() => {
    const tree: QuestionDetail[] = [];
    const map = new Map<string, QuestionDetail>();

    // 1. Initialize map
    questions.forEach(q => {
      map.set(q.id, { ...q, children: [] });
    });

    // 2. Build tree
    questions.forEach(q => {
      const node = map.get(q.id)!;
      if (q.parent_id && map.has(q.parent_id)) {
        map.get(q.parent_id)!.children!.push(node);
      } else {
        tree.push(node);
      }
    });

    // 3. Sort by sequence
    const sortNodes = (nodes: QuestionDetail[]) => {
      nodes.sort((a, b) => a.sequence - b.sequence);
      nodes.forEach(n => {
        if (n.children && n.children.length > 0) {
          sortNodes(n.children);
        }
      });
    };
    sortNodes(tree);

    return tree;
  }, [questions]);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading Section {sectionNumber}...</div>;
  }

  // Preview Mode
  if (isPreviewMode) {
    return (
      <div className="flex justify-center bg-github-bg-primary p-8 min-w-fit transition-colors duration-300">
        <div className="bg-white dark:bg-github-bg-secondary dark:text-github-text-primary shadow-lg dark:shadow-2xl dark:border dark:border-github-border-primary text-github-text-primary box-border mx-auto w-[210mm] min-h-[297mm] p-[2.5cm_2.0cm_2.0cm_3.0cm] font-['TH_Sarabun_New',sans-serif] leading-[1.8] text-base transition-colors duration-300">
          <div className="mb-4">
            <h1 className='font-bold text-lg'>
              {toThaiNumber(sectionNumber)} {title}
            </h1>
          </div>

          <div className="mb-4">
            <ReferenceManager sectionId={sectionId} readOnly={true} />
          </div>

          <div className="space-y-4">
            {questionTree.map((question) => (
              <QuestionRenderer
                key={question.id}
                question={question}
                level={0}
                readOnly={true}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Edit Mode
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header Card */}
      <div className={`bg-gradient-to-r ${headerColorClass} rounded-lg shadow-lg p-6 text-white`}>
        <div className="flex items-center space-x-3">
          <BookOpen className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">{toThaiNumber(sectionNumber)} {title}</h1>
            {subTitle && <p className="opacity-90 text-sm mt-1">{subTitle}</p>}
          </div>
        </div>
      </div>

      {/* Reference Manager - Now immediately after Header */}
      <div className="bg-white dark:bg-github-bg-secondary p-4 rounded-lg shadow-sm border border-github-border-primary">
        <ReferenceManager sectionId={sectionId} readOnly={false} />
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {questionTree.length === 0 ? (
          <div className="text-center p-8 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">ยังไม่มีข้อมูลคำถามในส่วนนี้</p>
          </div>
        ) : (
          questionTree.map((question) => (
            <div
              key={question.id}
              className="bg-white dark:bg-github-bg-secondary p-6 rounded-lg shadow-sm border border-github-border-primary"
            >
              <QuestionRenderer
                question={question}
                level={0}
                onAnswerChange={handleAnswerChange}
                readOnly={false}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SectionQuestionView;
