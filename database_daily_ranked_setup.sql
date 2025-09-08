-- Create daily ranked questions table
CREATE TABLE IF NOT EXISTS daily_ranked_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  question_id UUID REFERENCES quiz_questions(id),
  question_position INTEGER NOT NULL, -- 1-15 for the daily set
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(date, question_position),
  UNIQUE(date, question_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_daily_ranked_date ON daily_ranked_questions(date);

-- Create practice quiz attempts table (separate from ranked)
CREATE TABLE IF NOT EXISTS practice_quiz_attempts (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  season TEXT NOT NULL,
  questions_answered JSONB NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  time_taken INTEGER, -- in seconds
  accuracy DECIMAL(5,2), -- percentage
  created_at TIMESTAMP DEFAULT NOW()
);

-- Update the existing quiz_attempts table to be specifically for ranked attempts
-- Only rename if the old table exists and the new one doesn't
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'quiz_attempts')
     AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ranked_quiz_attempts') THEN
    ALTER TABLE quiz_attempts RENAME TO ranked_quiz_attempts;
  END IF;
END $$;

-- Add accuracy and better time tracking to ranked attempts
ALTER TABLE ranked_quiz_attempts 
ADD COLUMN IF NOT EXISTS accuracy DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS date_attempted DATE DEFAULT CURRENT_DATE;

-- Create index for ranked attempts by date
CREATE INDEX IF NOT EXISTS idx_ranked_attempts_date ON ranked_quiz_attempts(date_attempted);

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
  FROM daily_ranked_questions drq
  JOIN quiz_questions q ON drq.question_id = q.id
  WHERE drq.date = target_date
  ORDER BY drq.question_position;
END;
$$ LANGUAGE plpgsql;

-- Function to get practice questions (all questions NOT in today's ranked set)
CREATE OR REPLACE FUNCTION get_practice_questions(target_date DATE DEFAULT CURRENT_DATE)
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
  IF NOT EXISTS (SELECT 1 FROM daily_ranked_questions WHERE date = target_date) THEN
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
    FROM quiz_questions q
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
    FROM quiz_questions q
    WHERE q.id NOT IN (
      SELECT drq.question_id 
      FROM daily_ranked_questions drq 
      WHERE drq.date = target_date
    )
    ORDER BY q.id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Update the individual_leaderboard view to use ranked attempts and include accuracy + time
DROP VIEW IF EXISTS individual_leaderboard;

CREATE VIEW individual_leaderboard AS
WITH best_attempts AS (
  SELECT 
    up.user_id,
    up.username,
    up.team_number,
    up.team_name,
    MAX(rqa.score) as best_score,
    MAX(rqa.accuracy) as best_accuracy,
    COUNT(rqa.id) as attempts,
    MAX(rqa.created_at) as last_attempt,
    MIN(CASE WHEN rqa.score = (SELECT MAX(rqa2.score) FROM ranked_quiz_attempts rqa2 WHERE rqa2.user_id = up.user_id AND rqa2.date_attempted >= CURRENT_DATE - INTERVAL '30 days') 
        THEN rqa.time_taken END) as best_time
  FROM user_profiles up
  LEFT JOIN ranked_quiz_attempts rqa ON up.user_id = rqa.user_id
  WHERE rqa.date_attempted >= CURRENT_DATE - INTERVAL '30 days' OR rqa.id IS NULL -- Only last 30 days
  GROUP BY up.user_id, up.username, up.team_number, up.team_name
)
SELECT 
  username,
  team_number,
  team_name,
  best_score,
  best_accuracy,
  best_time,
  attempts,
  last_attempt,
  RANK() OVER (
    ORDER BY 
      best_score DESC, 
      best_accuracy DESC,
      best_time ASC
  ) as rank
FROM best_attempts
ORDER BY rank;

-- Enable RLS on new tables
ALTER TABLE daily_ranked_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_quiz_attempts ENABLE ROW LEVEL SECURITY;

-- RLS policies for daily_ranked_questions (read-only for all authenticated users)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'daily_ranked_questions' 
    AND policyname = 'Users can view daily ranked questions'
  ) THEN
    CREATE POLICY "Users can view daily ranked questions" ON daily_ranked_questions
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- RLS policies for practice_quiz_attempts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'practice_quiz_attempts' 
    AND policyname = 'Users can insert their own practice attempts'
  ) THEN
    CREATE POLICY "Users can insert their own practice attempts" ON practice_quiz_attempts
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'practice_quiz_attempts' 
    AND policyname = 'Users can view their own practice attempts'
  ) THEN
    CREATE POLICY "Users can view their own practice attempts" ON practice_quiz_attempts
      FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;
