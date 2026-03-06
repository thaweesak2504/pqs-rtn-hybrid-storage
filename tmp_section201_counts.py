import os
import sqlite3


def main() -> None:
    db = r'C:\Users\Thaweesak\AppData\Roaming\pqs-rtn-hybrid-storage\content.db'
    conn = sqlite3.connect(db)
    cur = conn.cursor()
    document_id = '22724201001'
    section_number = 201

    print('DB', db)
    section = cur.execute(
        """
        SELECT id, document_id, section_group, section_number, title_th
        FROM Sections
        WHERE document_id = ? AND section_number = ?
        """,
        (document_id, section_number),
    ).fetchone()
    print('SECTION', section)
    if not section:
        conn.close()
        return
    s = section[0]

    queries = {
        'QAK_ROWS': """
            SELECT COUNT(*)
            FROM QuestionAnswerKeys ak
            JOIN Questions q ON q.id = ak.question_id
            WHERE q.section_id = ? AND q.question_type != 'exempted'
        """,
        'QAK_DISTINCT_QUESTIONS': """
            SELECT COUNT(DISTINCT ak.question_id)
            FROM QuestionAnswerKeys ak
            JOIN Questions q ON q.id = ak.question_id
            WHERE q.section_id = ? AND q.question_type != 'exempted'
        """,
        'LEAF_NON_EXEMPTED': """
            SELECT COUNT(*)
            FROM Questions q
            WHERE q.section_id = ?
              AND q.question_type != 'exempted'
              AND q.id NOT IN (
                SELECT DISTINCT parent_id
                FROM Questions
                WHERE parent_id IS NOT NULL AND section_id = ?
              )
        """,
        'REQ_FALLBACK': """
            SELECT COUNT(*)
            FROM Questions q
            WHERE q.section_id = ?
              AND q.question_type != 'exempted'
              AND q.is_group_header = 0
              AND q.metadata IS NOT NULL
              AND q.metadata LIKE '%"requireAnswerKey"%'
              AND q.id NOT IN (SELECT question_id FROM QuestionAnswerKeys)
        """,
    }

    for name, sql in queries.items():
        params = (s, s) if 'LEAF_NON_EXEMPTED' in name else (s,)
        print(name, cur.execute(sql, params).fetchone()[0])

    print('VISIBLE_QUESTION_ROWS')
    visible_questions = cur.execute(
        """
        SELECT id, sequence, question_type, is_group_header, parent_id
        FROM Questions
        WHERE section_id = ? AND question_type != 'exempted'
        ORDER BY COALESCE(parent_id, id), level, sequence
        """,
        (s,),
    ).fetchall()
    print('QUESTION_COUNT', len(visible_questions))
    for row in visible_questions:
        print(row)

    print('DETAIL_ROWS')
    rows = cur.execute(
        """
        SELECT q.sequence, q.id, ak.sub_question_code, COALESCE(ak.answer_key_text, '')
        FROM QuestionAnswerKeys ak
        JOIN Questions q ON q.id = ak.question_id
        WHERE q.section_id = ? AND q.question_type != 'exempted'
        ORDER BY q.sequence, ak.order_index, ak.sub_question_code
        """,
        (s,),
    ).fetchall()
    print('DETAIL_COUNT', len(rows))
    for row in rows:
        print(row[0], row[1], row[2], row[3][:60].replace('\n', ' '))

    conn.close()


if __name__ == '__main__':
    main()
