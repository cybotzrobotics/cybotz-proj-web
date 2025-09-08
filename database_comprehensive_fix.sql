-- Comprehensive function fix - handles all potential type mismatches
-- Run this if the previous test shows type issues

-- Drop existing functions completely
DROP FUNCTION IF EXISTS get_daily_ranked_questions CASCADE;
DROP FUNCTION IF EXISTS get_practice_questions CASCADE;

-- Create functions that match actual database schema
-- This version handles potential type casting issues

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
  tags TEXT,
  source_page TEXT
) AS $$
BEGIN
  -- Check if we have questions for this date
  IF NOT EXISTS (SELECT 1 FROM daily_ranked_questions WHERE date = target_date) THEN
    -- Generate new daily questions by selecting 15 random questions
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
    LIMIT 15;
  END IF;

  -- Return the questions for the date with type casting
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
    COALESCE(q.difficulty::text, 'medium') as difficulty,
    COALESCE(q.category, '') as category,
    COALESCE(q.season, '') as season,
    COALESCE(array_to_string(q.tags, ','), '') as tags,
    COALESCE(q.source_page, '') as source_page
  FROM daily_ranked_questions drq
  JOIN quiz_questions q ON drq.question_id = q.id
  WHERE drq.date = target_date
  ORDER BY drq.question_position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_practice_questions(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
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
  tags TEXT,
  source_page TEXT
) AS $$
BEGIN
  -- Check if daily ranked questions exist for the target date
  IF NOT EXISTS (SELECT 1 FROM daily_ranked_questions WHERE date = target_date) THEN
    -- If no daily ranked questions exist yet, return all questions for practice
    RETURN QUERY
    SELECT 
      q.id,
      COALESCE(q.section, '') as section,
      COALESCE(q.rule_name, '') as rule_name,
      COALESCE(q.question, '') as question,
      COALESCE(q.options, '[]'::jsonb) as options,
      COALESCE(q.correct_answer, 0) as correct_answer,
      COALESCE(q.explanation, '') as explanation,
      COALESCE(q.difficulty::text, 'medium') as difficulty,
      COALESCE(q.category, '') as category,
      COALESCE(q.season, '') as season,
      COALESCE(array_to_string(q.tags, ','), '') as tags,
      COALESCE(q.source_page, '') as source_page
    FROM quiz_questions q
    ORDER BY q.id;
  ELSE
    -- Return questions NOT in today's ranked set
    RETURN QUERY
    SELECT 
      q.id,
      COALESCE(q.section, '') as section,
      COALESCE(q.rule_name, '') as rule_name,
      COALESCE(q.question, '') as question,
      COALESCE(q.options, '[]'::jsonb) as options,
      COALESCE(q.correct_answer, 0) as correct_answer,
      COALESCE(q.explanation, '') as explanation,
      COALESCE(q.difficulty::text, 'medium') as difficulty,
      COALESCE(q.category, '') as category,
      COALESCE(q.season, '') as season,
      COALESCE(array_to_string(q.tags, ','), '') as tags,
      COALESCE(q.source_page, '') as source_page
    FROM quiz_questions q
    WHERE q.id NOT IN (
      SELECT drq.question_id 
      FROM daily_ranked_questions drq 
      WHERE drq.date = target_date
    )
    ORDER BY q.id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant all necessary permissions
GRANT EXECUTE ON FUNCTION get_daily_ranked_questions TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_practice_questions TO authenticated, anon, service_role;

-- Test the functions immediately
SELECT 'Testing functions...' as status;
SELECT COUNT(*) as daily_questions FROM get_daily_ranked_questions();
SELECT COUNT(*) as practice_questions FROM get_practice_questions();
