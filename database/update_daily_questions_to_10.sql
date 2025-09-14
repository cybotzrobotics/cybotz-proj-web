-- Update daily ranked questions to use 10 questions instead of 15
-- This will help conserve the question pool

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
  difficulty TEXT,
  category TEXT,
  season TEXT,
  tags JSONB,
  source_page TEXT,
  confidence INTEGER
) AS $$
BEGIN
  -- Check if we have questions for this date
  IF NOT EXISTS (SELECT 1 FROM daily_ranked_questions WHERE date = target_date) THEN
    -- Generate new daily questions by selecting 10 random questions (reduced from 15)
    INSERT INTO daily_ranked_questions (date, question_id, question_position)
    SELECT 
      target_date,
      q.id,
      ROW_NUMBER() OVER (ORDER BY RANDOM())
    FROM quiz_questions q
    WHERE q.id NOT IN (
      -- Exclude questions used in the last 7 days
      SELECT drq.question_id 
      FROM daily_ranked_questions drq 
      WHERE drq.date > target_date - INTERVAL '7 days'
      AND drq.date < target_date
    )
    ORDER BY RANDOM()
    LIMIT 10; -- Changed from 15 to 10 questions per day
  END IF;

  -- Return the questions for the date
  RETURN QUERY
  SELECT 
    drq.question_position,
    q.id,
    COALESCE(q.section, '') as section,
    COALESCE(q.rule_name, '') as rule_name,
    COALESCE(q.question, '') as question,
    COALESCE(q.options, '[]'::jsonb) as options,
    COALESCE(q.correct_answer, 0) as correct_answer,
    COALESCE(q.explanation, '') as explanation,
    COALESCE(q.difficulty, 'medium') as difficulty,
    COALESCE(q.category, '') as category,
    COALESCE(q.season, '2025-2026') as season,
    COALESCE(q.tags, '[]'::jsonb) as tags,
    COALESCE(q.source_page, '') as source_page,
    COALESCE(q.confidence, 80) as confidence
  FROM daily_ranked_questions drq
  JOIN quiz_questions q ON q.id = drq.question_id
  WHERE drq.date = target_date
  ORDER BY drq.question_position;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_daily_ranked_questions TO authenticated, anon, service_role;

-- Verification: Show how many questions will be returned
SELECT 'Updated to 10 questions per day!' as status;