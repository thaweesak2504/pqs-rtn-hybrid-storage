-- Verify Database Cleanup Script
-- Check for orphaned data after document deletion

-- 1. Check Documents table
SELECT 'Documents' as table_name, COUNT(*) as count FROM Documents;

-- 2. Check Sections (should cascade delete with Documents)
SELECT 'Sections' as table_name, COUNT(*) as count FROM Sections;

-- 3. Check Questions (should cascade delete with Sections)
SELECT 'Questions' as table_name, COUNT(*) as count FROM Questions;

-- 4. Check QuestionChoices (should cascade delete with Questions)
SELECT 'QuestionChoices' as table_name, COUNT(*) as count FROM QuestionChoices;

-- 5. Check QuestionAnswerKeys (should cascade delete with Questions)
SELECT 'QuestionAnswerKeys' as table_name, COUNT(*) as count FROM QuestionAnswerKeys;

-- 6. Check UserAnswers (should cascade delete with Questions)
SELECT 'UserAnswers' as table_name, COUNT(*) as count FROM UserAnswers;

-- 7. Check for orphaned Sections (Sections without Documents)
SELECT 'Orphaned Sections' as issue, COUNT(*) as count 
FROM Sections s 
LEFT JOIN Documents d ON s.document_id = d.id 
WHERE d.id IS NULL;

-- 8. Check for orphaned Questions (Questions without Sections)
SELECT 'Orphaned Questions' as issue, COUNT(*) as count 
FROM Questions q 
LEFT JOIN Sections s ON q.section_id = s.id 
WHERE s.id IS NULL;

-- 9. Check for orphaned QuestionChoices (Choices without Questions)
SELECT 'Orphaned QuestionChoices' as issue, COUNT(*) as count 
FROM QuestionChoices qc 
LEFT JOIN Questions q ON qc.question_id = q.id 
WHERE q.id IS NULL;

-- 10. Check for orphaned QuestionAnswerKeys (AnswerKeys without Questions)
SELECT 'Orphaned QuestionAnswerKeys' as issue, COUNT(*) as count 
FROM QuestionAnswerKeys qak 
LEFT JOIN Questions q ON qak.question_id = q.id 
WHERE q.id IS NULL;

-- 11. Check for orphaned UserAnswers (UserAnswers without Questions)
SELECT 'Orphaned UserAnswers' as issue, COUNT(*) as count 
FROM UserAnswers ua 
LEFT JOIN Questions q ON ua.question_id = q.id 
WHERE q.id IS NULL;

-- 12. Check DocumentReferences (should be independent - OK to have data)
SELECT 'DocumentReferences' as table_name, COUNT(*) as count FROM DocumentReferences;

-- 13. Check SectionReferences (should be independent - OK to have data)
SELECT 'SectionReferences' as table_name, COUNT(*) as count FROM SectionReferences;

-- 14. Check QuestionReferences (should be independent - OK to have data)
SELECT 'QuestionReferences' as table_name, COUNT(*) as count FROM QuestionReferences;

-- 15. Check OccupationBranches (should be independent - OK to have data)
SELECT 'OccupationBranches' as table_name, COUNT(*) as count FROM OccupationBranches;

-- 16. Check OccupationSubBranches (should be independent - OK to have data)
SELECT 'OccupationSubBranches' as table_name, COUNT(*) as count FROM OccupationSubBranches;

-- 17. Check OccupationSubQuestions (should be independent - OK to have data)
SELECT 'OccupationSubQuestions' as table_name, COUNT(*) as count FROM OccupationSubQuestions;

-- Summary: Expected results if database is clean
-- - Documents, Sections, Questions, QuestionChoices, QuestionAnswerKeys, UserAnswers: 0
-- - All "Orphaned" checks: 0
-- - Reference tables and Occupation tables: Can have data (independent)
