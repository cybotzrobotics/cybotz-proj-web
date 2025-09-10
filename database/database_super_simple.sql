-- SIMPLE daily quiz tracking - just username and completion
-- Drop everything and start fresh

DROP TABLE IF EXISTS daily_quiz_completions CASCADE;

-- Simple table: just track who completed today with their score
CREATE TABLE daily_quiz_completions (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  quiz_date DATE NOT NULL DEFAULT CURRENT_DATE,
  score INTEGER NOT NULL,
  completed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(username, quiz_date)
);

-- Simple function: check if username completed today
CREATE OR REPLACE FUNCTION has_completed_daily_quiz(user_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM daily_quiz_completions 
    WHERE username = user_name 
    AND quiz_date = CURRENT_DATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Simple function: record completion
CREATE OR REPLACE FUNCTION record_daily_completion(user_name TEXT, user_score INTEGER)
RETURNS VOID AS $$
BEGIN
  INSERT INTO daily_quiz_completions (username, score)
  VALUES (user_name, user_score)
  ON CONFLICT (username, quiz_date) 
  DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clear all daily completions
CREATE OR REPLACE FUNCTION clear_daily_completions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM daily_quiz_completions WHERE quiz_date = CURRENT_DATE;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE daily_quiz_completions ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read and insert
CREATE POLICY "Allow all access" ON daily_quiz_completions FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON daily_quiz_completions TO authenticated, anon;
GRANT EXECUTE ON FUNCTION has_completed_daily_quiz TO authenticated, anon;
GRANT EXECUTE ON FUNCTION record_daily_completion TO authenticated, anon;
GRANT EXECUTE ON FUNCTION clear_daily_completions TO authenticated, anon;

-- Test
SELECT 'Simple daily quiz system created!' as status;
SELECT COUNT(*) as current_completions FROM daily_quiz_completions;
