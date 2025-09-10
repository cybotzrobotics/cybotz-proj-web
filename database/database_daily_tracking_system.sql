-- Create daily quiz tracking system
-- This will track who has taken the daily quiz each day

-- Create daily quiz completions table
CREATE TABLE IF NOT EXISTS daily_quiz_completions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  quiz_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_at TIMESTAMP DEFAULT NOW(),
  score INTEGER,
  time_taken INTEGER, -- in seconds
  UNIQUE(user_id, quiz_date) -- One completion per user per day
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_daily_completions_user_date ON daily_quiz_completions(user_id, quiz_date);
CREATE INDEX IF NOT EXISTS idx_daily_completions_date ON daily_quiz_completions(quiz_date);

-- Function to check if user can take today's quiz
CREATE OR REPLACE FUNCTION can_take_daily_quiz(user_uuid UUID, check_date DATE DEFAULT CURRENT_DATE)
RETURNS BOOLEAN AS $$
BEGIN
  -- Return TRUE if user hasn't taken quiz today, FALSE if they have
  RETURN NOT EXISTS (
    SELECT 1 FROM daily_quiz_completions 
    WHERE user_id = user_uuid 
    AND quiz_date = check_date
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record daily quiz completion
CREATE OR REPLACE FUNCTION record_daily_quiz_completion(
  user_uuid UUID, 
  user_name TEXT, 
  user_score INTEGER, 
  user_time INTEGER,
  completion_date DATE DEFAULT CURRENT_DATE
)
RETURNS VOID AS $$
BEGIN
  -- Insert or update the completion record
  INSERT INTO daily_quiz_completions (user_id, username, quiz_date, score, time_taken)
  VALUES (user_uuid, user_name, completion_date, user_score, user_time)
  ON CONFLICT (user_id, quiz_date) 
  DO UPDATE SET 
    score = EXCLUDED.score,
    time_taken = EXCLUDED.time_taken,
    completed_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old daily completions (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_daily_completions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete completions older than 7 days
  DELETE FROM daily_quiz_completions 
  WHERE quiz_date < CURRENT_DATE - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE daily_quiz_completions ENABLE ROW LEVEL SECURITY;

-- RLS policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'daily_quiz_completions' 
    AND policyname = 'Users can view their own completions'
  ) THEN
    CREATE POLICY "Users can view their own completions" ON daily_quiz_completions
      FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'daily_quiz_completions' 
    AND policyname = 'Users can insert their own completions'
  ) THEN
    CREATE POLICY "Users can insert their own completions" ON daily_quiz_completions
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Grant permissions for functions
GRANT EXECUTE ON FUNCTION can_take_daily_quiz TO authenticated, anon;
GRANT EXECUTE ON FUNCTION record_daily_quiz_completion TO authenticated, anon;
GRANT EXECUTE ON FUNCTION cleanup_old_daily_completions TO authenticated, anon;

-- Test the system
SELECT 'Daily quiz tracking system created successfully!' as status;

-- Show current completions (should be empty initially)
SELECT COUNT(*) as current_completions FROM daily_quiz_completions;
