-- Create daily ranked questions table
CREATE TABLE daily_ranked_questions (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  question_id INTEGER REFERENCES quiz_questions(id),
  position INTEGER NOT NULL, -- 1-15 for the daily set
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(date, position),
  UNIQUE(date, question_id)
);

-- Create index for faster queries
CREATE INDEX idx_daily_ranked_date ON daily_ranked_questions(date);

-- Create practice quiz attempts table (separate from ranked)
CREATE TABLE practice_quiz_attempts (
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
ALTER TABLE quiz_attempts RENAME TO ranked_quiz_attempts;

-- Add accuracy and better time tracking to ranked attempts
ALTER TABLE ranked_quiz_attempts 
ADD COLUMN IF NOT EXISTS accuracy DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS date_attempted DATE DEFAULT CURRENT_DATE;

-- Create index for ranked attempts by date
CREATE INDEX idx_ranked_attempts_date ON ranked_quiz_attempts(date_attempted);

-- Function to select daily ranked questions
CREATE OR REPLACE FUNCTION get_daily_ranked_questions(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  position INTEGER,
  id INTEGER,
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
    INSERT INTO daily_ranked_questions (date, question_id, position)
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
    drq.position,
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
  ORDER BY drq.position;
END;
$$ LANGUAGE plpgsql;

-- Function to get practice questions (all questions NOT in today's ranked set)
CREATE OR REPLACE FUNCTION get_practice_questions(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  id INTEGER,
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
END;
$$ LANGUAGE plpgsql;

-- Update the individual_leaderboard view to use ranked attempts and include accuracy + time
DROP VIEW IF EXISTS individual_leaderboard;

CREATE VIEW individual_leaderboard AS
SELECT 
  up.username,
  up.team_number,
  up.team_name,
  MAX(rqa.score) as best_score,
  MAX(rqa.accuracy) as best_accuracy,
  MIN(CASE WHEN rqa.score = MAX(rqa.score) THEN rqa.time_taken END) as best_time,
  COUNT(rqa.id) as attempts,
  MAX(rqa.created_at) as last_attempt,
  RANK() OVER (
    ORDER BY 
      MAX(rqa.score) DESC, 
      MAX(rqa.accuracy) DESC,
      MIN(CASE WHEN rqa.score = MAX(rqa.score) THEN rqa.time_taken END) ASC
  ) as rank
FROM user_profiles up
LEFT JOIN ranked_quiz_attempts rqa ON up.user_id = rqa.user_id
WHERE rqa.date_attempted >= CURRENT_DATE - INTERVAL '30 days' -- Only last 30 days
GROUP BY up.user_id, up.username, up.team_number, up.team_name
ORDER BY rank;

-- Enable RLS on new tables
ALTER TABLE daily_ranked_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_quiz_attempts ENABLE ROW LEVEL SECURITY;

-- RLS policies for daily_ranked_questions (read-only for all authenticated users)
CREATE POLICY "Users can view daily ranked questions" ON daily_ranked_questions
  FOR SELECT TO authenticated USING (true);

-- RLS policies for practice_quiz_attempts
CREATE POLICY "Users can insert their own practice attempts" ON practice_quiz_attempts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own practice attempts" ON practice_quiz_attempts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
