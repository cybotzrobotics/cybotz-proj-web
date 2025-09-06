-- Simple fix: Add date tracking to existing quiz_attempts table
-- This ensures the daily restriction works immediately

-- Add date_attempted column if it doesn't exist
ALTER TABLE quiz_attempts 
ADD COLUMN IF NOT EXISTS date_attempted DATE DEFAULT CURRENT_DATE;

-- Add accuracy column if it doesn't exist  
ALTER TABLE quiz_attempts
ADD COLUMN IF NOT EXISTS accuracy DECIMAL(5,2);

-- Update existing records to have today's date (for testing)
UPDATE quiz_attempts 
SET date_attempted = CURRENT_DATE 
WHERE date_attempted IS NULL;

-- Create index for faster date queries
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_date_user ON quiz_attempts(user_id, date_attempted);

-- Create a view for daily quiz tracking
CREATE OR REPLACE VIEW daily_quiz_status AS
SELECT 
  user_id,
  date_attempted,
  COUNT(*) as attempts_today,
  MAX(score) as best_score_today,
  MAX(accuracy) as best_accuracy_today,
  MIN(time_taken) as best_time_today,
  MAX(created_at) as last_attempt_today
FROM quiz_attempts 
WHERE date_attempted >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY user_id, date_attempted;

-- Function to check if user can take quiz today
CREATE OR REPLACE FUNCTION can_take_daily_quiz(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM quiz_attempts 
    WHERE user_id = user_uuid 
    AND date_attempted = CURRENT_DATE
  );
END;
$$ LANGUAGE plpgsql;
