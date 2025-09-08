-- Just the functions - quick fix
-- Run this first if you want to test the ranked quiz immediately

-- Function to select daily ranked questions
CREATE OR REPLACE FUNCTION get_daily_ranked_questions(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  question_position INTEGER,
  id UUID,
  section TEXT,
  rule_name TEXT,
  question TEXT,
  options JSONB,
  correct_answer INTEGER,
  explanation TEXT,
  difficulty INTEGER,
  category TEXT,
  season TEXT,
  tags JSONB,
  source_page TEXT
) AS $$
BEGIN
  -- For now, just return first 15 questions from quiz_questions if no daily table exists
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'daily_ranked_questions') THEN
    RETURN QUERY
    SELECT 
      ROW_NUMBER() OVER (ORDER BY q.id)::INTEGER as question_position,
      q.id,
      q.section,
      q.rule_name,
      q.question,
      q.options,
      q.correct_answer,
      q.explanation,
      q.difficulty,
      q.category,
      q.season,
      q.tags,
      q.source_page
    FROM quiz_questions q
    ORDER BY q.id
    LIMIT 15;
    RETURN;
  END IF;

  -- Original logic if daily_ranked_questions table exists
  IF NOT EXISTS (SELECT 1 FROM daily_ranked_questions WHERE date = target_date) THEN
    INSERT INTO daily_ranked_questions (date, question_id, question_position)
    SELECT 
      target_date,
      q.id,
      ROW_NUMBER() OVER (ORDER BY RANDOM())
    FROM quiz_questions q
    WHERE q.id NOT IN (
      SELECT drq.question_id 
      FROM daily_ranked_questions drq 
      WHERE drq.date > target_date - INTERVAL '7 days'
      AND drq.date < target_date
    )
    ORDER BY RANDOM()
    LIMIT 15;
  END IF;

  RETURN QUERY
  SELECT 
    drq.question_position,
    q.id,
    q.section,
    q.rule_name,
    q.question,
    q.options,
    q.correct_answer,
    q.explanation,
    q.difficulty,
    q.category,
    q.season,
    q.tags,
    q.source_page
  FROM daily_ranked_questions drq
  JOIN quiz_questions q ON drq.question_id = q.id
  WHERE drq.date = target_date
  ORDER BY drq.question_position;
END;
$$ LANGUAGE plpgsql;
