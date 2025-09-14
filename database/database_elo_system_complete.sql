-- Fix ELO System: Create missing ranked_quiz_attempts table and implement ELO system
-- This script creates the missing table and implements the complete ELO rating system

-- 1. Create the missing ranked_quiz_attempts table
CREATE TABLE IF NOT EXISTS ranked_quiz_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  time_taken INTEGER, -- in seconds
  date_attempted DATE DEFAULT CURRENT_DATE,
  season TEXT DEFAULT '2025-2026',
  questions_answered JSONB, -- Store question IDs and whether they were correct
  elo_before INTEGER,
  elo_after INTEGER,
  elo_change INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for ranked_quiz_attempts
ALTER TABLE ranked_quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ranked_quiz_attempts
CREATE POLICY "Users can view all quiz attempts" ON ranked_quiz_attempts FOR SELECT USING (true);
CREATE POLICY "Users can insert own quiz attempts" ON ranked_quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own quiz attempts" ON ranked_quiz_attempts FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ranked_quiz_attempts_user_id ON ranked_quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_ranked_quiz_attempts_date ON ranked_quiz_attempts(date_attempted);
CREATE INDEX IF NOT EXISTS idx_ranked_quiz_attempts_score ON ranked_quiz_attempts(score DESC);

-- 2. Add ELO rating to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS elo_rating INTEGER DEFAULT 1000,
ADD COLUMN IF NOT EXISTS peak_elo INTEGER DEFAULT 1000;

-- 3. Update existing users to have starting ELO of 1000
UPDATE user_profiles 
SET elo_rating = 1000, peak_elo = 1000 
WHERE elo_rating IS NULL;

-- 4. Create function to calculate ELO change based on question difficulty
CREATE OR REPLACE FUNCTION calculate_elo_change(
  current_elo INTEGER,
  is_correct BOOLEAN,
  difficulty TEXT,
  k_factor INTEGER DEFAULT 32
) RETURNS INTEGER AS $$
DECLARE
  difficulty_multiplier DECIMAL;
  base_change INTEGER;
  final_change INTEGER;
BEGIN
  -- Set difficulty multipliers (harder questions = more ELO gain/less loss)
  CASE difficulty
    WHEN 'easy' THEN difficulty_multiplier := 0.8;
    WHEN 'medium' THEN difficulty_multiplier := 1.0;
    WHEN 'hard' THEN difficulty_multiplier := 1.3;
    ELSE difficulty_multiplier := 1.0;
  END CASE;
  
  -- Base ELO change calculation (similar to chess ELO)
  -- For correct answers: gain points
  -- For incorrect answers: lose points
  IF is_correct THEN
    -- Gain calculation: more gain for harder questions
    base_change := ROUND(k_factor * difficulty_multiplier * 0.5);
  ELSE
    -- Loss calculation: less loss for harder questions, more loss for easier questions
    base_change := -ROUND(k_factor * (2.0 - difficulty_multiplier) * 0.3);
  END IF;
  
  -- Apply diminishing returns for very high ELO (like in chess)
  IF current_elo > 1800 THEN
    final_change := ROUND(base_change * 0.7);
  ELSIF current_elo > 1500 THEN
    final_change := ROUND(base_change * 0.85);
  ELSE
    final_change := base_change;
  END IF;
  
  -- Ensure minimum change (prevent zero changes)
  IF final_change = 0 AND is_correct THEN
    final_change := 1;
  ELSIF final_change = 0 AND NOT is_correct THEN
    final_change := -1;
  END IF;
  
  RETURN final_change;
END;
$$ LANGUAGE plpgsql;

-- 5. Create function to update user ELO after quiz completion
CREATE OR REPLACE FUNCTION update_user_elo(
  user_uuid UUID,
  quiz_attempt_id TEXT,
  questions_data JSONB
) RETURNS TABLE(
  old_elo INTEGER,
  new_elo INTEGER,
  total_elo_change INTEGER
) AS $$
DECLARE
  current_elo INTEGER;
  new_elo_value INTEGER;
  total_change INTEGER := 0;
  question_record JSONB;
  elo_change INTEGER;
  question_difficulty TEXT;
BEGIN
  -- Get current ELO from user_profiles
  SELECT elo_rating INTO current_elo FROM user_profiles WHERE user_id = user_uuid;
  
  -- If no ELO found, set to default
  IF current_elo IS NULL THEN
    current_elo := 1000;
    -- Create user profile if it doesn't exist
    INSERT INTO user_profiles (user_id, username, full_name, elo_rating, peak_elo)
    VALUES (user_uuid, 'User', 'Unknown User', 1000, 1000)
    ON CONFLICT (user_id) DO UPDATE SET elo_rating = 1000, peak_elo = 1000;
  END IF;
  
  -- Process each question
  FOR question_record IN SELECT * FROM jsonb_array_elements(questions_data)
  LOOP
    -- Get question difficulty
    SELECT difficulty INTO question_difficulty 
    FROM quiz_questions 
    WHERE id = (question_record->>'question_id')::INTEGER;
    
    -- Default to medium if not found
    IF question_difficulty IS NULL THEN
      question_difficulty := 'medium';
    END IF;
    
    -- Calculate ELO change for this question
    elo_change := calculate_elo_change(
      current_elo + total_change,
      (question_record->>'is_correct')::BOOLEAN,
      question_difficulty
    );
    
    total_change := total_change + elo_change;
  END LOOP;
  
  -- Calculate new ELO (ensure it doesn't go below 100)
  new_elo_value := GREATEST(100, current_elo + total_change);
  
  -- Update user's ELO in user_profiles table
  UPDATE user_profiles 
  SET 
    elo_rating = new_elo_value,
    peak_elo = GREATEST(peak_elo, new_elo_value),
    updated_at = NOW()
  WHERE user_id = user_uuid;
  
  -- Update the quiz attempt with ELO changes
  UPDATE ranked_quiz_attempts 
  SET 
    elo_before = current_elo,
    elo_after = new_elo_value,
    elo_change = total_change
  WHERE id = quiz_attempt_id::UUID;
  
  -- Return the results
  old_elo := current_elo;
  new_elo := new_elo_value;
  total_elo_change := total_change;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- 6. Drop existing views and create individual leaderboard view (ELO-based) using user_profiles
DROP VIEW IF EXISTS individual_leaderboard CASCADE;
CREATE VIEW individual_leaderboard AS
SELECT 
  ROW_NUMBER() OVER (ORDER BY up.elo_rating DESC, up.peak_elo DESC, up.created_at ASC) AS rank,
  up.user_id,
  up.username,
  up.full_name,
  up.team_number,
  up.elo_rating,
  up.peak_elo,
  COUNT(rqa.id) AS total_attempts,
  COALESCE(AVG(rqa.score), 0) AS average_score,
  COALESCE(MAX(rqa.score), 0) AS best_score,
  MAX(rqa.created_at) AS last_attempt
FROM user_profiles up
LEFT JOIN ranked_quiz_attempts rqa ON up.user_id = rqa.user_id
  AND rqa.date_attempted >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY up.user_id, up.username, up.full_name, up.team_number, up.elo_rating, up.peak_elo, up.created_at
ORDER BY up.elo_rating DESC, up.peak_elo DESC, up.created_at ASC;

-- 7. Drop existing team leaderboard view and create team leaderboard view (ELO-based) using user_profiles
DROP VIEW IF EXISTS team_leaderboard CASCADE;
CREATE VIEW team_leaderboard AS
SELECT 
  ROW_NUMBER() OVER (ORDER BY ROUND(AVG(elo_rating)) DESC, SUM(peak_elo) DESC) AS rank,
  team_number,
  COUNT(*) AS team_size,
  ROUND(AVG(elo_rating)) AS avg_elo,
  MAX(elo_rating) AS max_elo,
  MIN(elo_rating) AS min_elo,
  SUM(peak_elo) AS total_peak_elo,
  COUNT(DISTINCT rqa.user_id) AS active_members
FROM user_profiles up
LEFT JOIN ranked_quiz_attempts rqa ON up.user_id = rqa.user_id
  AND rqa.date_attempted >= CURRENT_DATE - INTERVAL '30 days'
WHERE team_number IS NOT NULL
GROUP BY team_number
HAVING COUNT(*) > 0
ORDER BY ROUND(AVG(elo_rating)) DESC, SUM(peak_elo) DESC;

-- 8. Create function to get ELO tier
CREATE OR REPLACE FUNCTION get_elo_tier(elo_rating INTEGER)
RETURNS TEXT AS $$
BEGIN
  CASE 
    WHEN elo_rating >= 2000 THEN RETURN 'Grandmaster';
    WHEN elo_rating >= 1800 THEN RETURN 'Master';
    WHEN elo_rating >= 1600 THEN RETURN 'Expert';
    WHEN elo_rating >= 1400 THEN RETURN 'Advanced';
    WHEN elo_rating >= 1200 THEN RETURN 'Intermediate';
    WHEN elo_rating >= 1000 THEN RETURN 'Novice';
    ELSE RETURN 'Beginner';
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- 9. Create additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_elo_rating ON user_profiles(elo_rating DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_peak_elo ON user_profiles(peak_elo DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_team_elo ON user_profiles(team_number, elo_rating DESC);

-- 10. Create a function to handle daily quiz attempt limits
CREATE OR REPLACE FUNCTION check_daily_quiz_limit(user_uuid UUID, attempt_date DATE DEFAULT CURRENT_DATE)
RETURNS BOOLEAN AS $$
DECLARE
  attempt_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO attempt_count
  FROM ranked_quiz_attempts
  WHERE user_id = user_uuid AND date_attempted = attempt_date;
  
  RETURN attempt_count = 0; -- Return true if no attempts today
END;
$$ LANGUAGE plpgsql;

-- Verification queries
SELECT 'ELO System Setup Complete!' as status;

-- Show current table status
SELECT 
  'ranked_quiz_attempts' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ranked_quiz_attempts') 
    THEN 'EXISTS' 
    ELSE 'MISSING' 
  END as status;

-- Show ELO functions status
SELECT 
  'calculate_elo_change' as function_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'calculate_elo_change') 
    THEN 'EXISTS' 
    ELSE 'MISSING' 
  END as status
UNION ALL
SELECT 
  'update_user_elo' as function_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'update_user_elo') 
    THEN 'EXISTS' 
    ELSE 'MISSING' 
  END as status;