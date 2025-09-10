-- Simplified daily quiz tracking system
-- Just tracks if user completed quiz today (no automatic cleanup)

-- Update the daily quiz completions table structure (if needed)
ALTER TABLE daily_quiz_completions 
ALTER COLUMN time_taken DROP NOT NULL;

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS can_take_daily_quiz(UUID, DATE);
DROP FUNCTION IF EXISTS can_take_daily_quiz(UUID);
DROP FUNCTION IF EXISTS record_daily_quiz_completion(UUID, TEXT, INTEGER, INTEGER, DATE);
DROP FUNCTION IF EXISTS record_daily_quiz_completion(UUID, TEXT, INTEGER, INTEGER);

-- Simplified function to check if user can take today's quiz
CREATE OR REPLACE FUNCTION can_take_daily_quiz(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Return TRUE if user hasn't taken quiz today, FALSE if they have
  RETURN NOT EXISTS (
    SELECT 1 FROM daily_quiz_completions 
    WHERE user_id = user_uuid 
    AND quiz_date = CURRENT_DATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Simplified function to record daily quiz completion
CREATE OR REPLACE FUNCTION record_daily_quiz_completion(
  user_uuid UUID, 
  user_name TEXT, 
  user_score INTEGER DEFAULT NULL,
  user_time INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Insert the completion record (ignore if already exists)
  INSERT INTO daily_quiz_completions (user_id, username, quiz_date, score, time_taken)
  VALUES (user_uuid, user_name, CURRENT_DATE, user_score, user_time)
  ON CONFLICT (user_id, quiz_date) 
  DO NOTHING; -- Just ignore if already exists, don't update
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to manually clear all daily completions (for your Raspberry Pi script)
CREATE OR REPLACE FUNCTION clear_all_daily_completions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete ALL completions
  DELETE FROM daily_quiz_completions;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION can_take_daily_quiz TO authenticated, anon;
GRANT EXECUTE ON FUNCTION record_daily_quiz_completion TO authenticated, anon;
GRANT EXECUTE ON FUNCTION clear_all_daily_completions TO authenticated, anon;

-- Test the simplified system
SELECT 'Simplified daily quiz tracking system updated!' as status;
SELECT COUNT(*) as current_completions FROM daily_quiz_completions;
