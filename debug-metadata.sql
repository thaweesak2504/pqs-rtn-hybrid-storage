-- Debug: Check metadata structure for activeSubQuestions
SELECT 
    q.id,
    q.sequence,
    s.section_group,
    q.metadata
FROM Questions q
JOIN Sections s ON s.id = q.section_id
WHERE q.metadata IS NOT NULL 
  AND q.metadata LIKE '%activeSubQuestions%'
LIMIT 5;
