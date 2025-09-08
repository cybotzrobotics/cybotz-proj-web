-- Create functions in public schema explicitly
-- Run this if schema is the issue

DROP FUNCTION IF EXISTS public.get_daily_ranked_questions;
DROP FUNCTION IF EXISTS public.get_practice_questions;

-- Create in public schema explicitly
CREATE OR REPLACE FUNCTION public.get_daily_ranked_questions(target_date DATE DEFAULT CURRENT_DATE)
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
  -- Check if we have questions for this date
  IF NOT EXISTS (SELECT 1 FROM public.daily_ranked_questions WHERE date = target_date) THEN
    -- Generate new daily questions by selecting 15 random questions
    INSERT INTO public.daily_ranked_questions (date, question_id, question_position)
    SELECT 
      target_date,
      q.id,
      ROW_NUMBER() OVER (ORDER BY RANDOM())
    FROM public.quiz_questions q
    WHERE q.id NOT IN (
      -- Exclude questions used in the last 7 days
      SELECT drq.question_id 
      FROM public.daily_ranked_questions drq 
      WHERE drq.date > target_date - INTERVAL '7 days'
      AND drq.date < target_date
    )
    ORDER BY RANDOM()
    LIMIT 15;
  END IF;

  -- Return the questions for the date
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
  FROM public.daily_ranked_questions drq
  JOIN public.quiz_questions q ON drq.question_id = q.id
  WHERE drq.date = target_date
  ORDER BY drq.question_position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_practice_questions(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
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
  -- Check if daily ranked questions exist for the target date
  IF NOT EXISTS (SELECT 1 FROM public.daily_ranked_questions WHERE date = target_date) THEN
    -- If no daily ranked questions exist yet, return all questions for practice
    RETURN QUERY
    SELECT 
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
    FROM public.quiz_questions q
    ORDER BY q.id;
  ELSE
    -- Return questions NOT in today's ranked set
    RETURN QUERY
    SELECT 
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
    FROM public.quiz_questions q
    WHERE q.id NOT IN (
      SELECT drq.question_id 
      FROM public.daily_ranked_questions drq 
      WHERE drq.date = target_date
    )
    ORDER BY q.id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_daily_ranked_questions TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_ranked_questions TO anon;
GRANT EXECUTE ON FUNCTION public.get_practice_questions TO authenticated; 
GRANT EXECUTE ON FUNCTION public.get_practice_questions TO anon;
