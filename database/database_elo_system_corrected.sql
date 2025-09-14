-- ELO Rating System Implementation (Corrected for actual table structure)
-- This script adds ELO rating system to the existing quiz application

-- 1. Add ELO rating to user_profiles table (not profiles)
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS elo_rating INTEGER DEFAULT 1000,
ADD COLUMN IF NOT EXISTS peak_elo INTEGER DEFAULT 1000;

-- 2. Update existing users to have starting ELO of 1000
UPDATE user_profiles 
SET elo_rating = 1000, peak_elo = 1000 
WHERE elo_rating IS NULL;

-- 3. Add ELO change tracking to ranked_quiz_attempts
ALTER TABLE ranked_quiz_attempts 
ADD COLUMN IF NOT EXISTS elo_before INTEGER,
ADD COLUMN IF NOT EXISTS elo_after INTEGER,
ADD COLUMN IF NOT EXISTS elo_change INTEGER DEFAULT 0;

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
  -- Get current ELO from user_profiles (not profiles)
  SELECT elo_rating INTO current_elo FROM user_profiles WHERE user_id = user_uuid;
  
  -- If no ELO found, set to default
  IF current_elo IS NULL THEN
    current_elo := 1000;
    UPDATE user_profiles SET elo_rating = 1000 WHERE user_id = user_uuid;
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

-- 6. Create individual leaderboard view (ELO-based) using user_profiles
CREATE OR REPLACE VIEW individual_leaderboard AS
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
GROUP BY up.user_id, up.username, up.full_name, up.team_number, up.elo_rating, up.peak_elo
ORDER BY up.elo_rating DESC, up.peak_elo DESC, up.created_at ASC;

-- 7. Create team leaderboard view (ELO-based) using user_profiles
CREATE OR REPLACE VIEW team_leaderboard AS
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

-- 9. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_elo_rating ON user_profiles(elo_rating DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_peak_elo ON user_profiles(peak_elo DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_team_elo ON user_profiles(team_number, elo_rating DESC);

-- Verification queries
SELECT 'ELO System Setup Complete!' as status;

-- Show current ELO distribution
SELECT 
  get_elo_tier(elo_rating) as tier,
  COUNT(*) as user_count,
  MIN(elo_rating) as min_elo,
  MAX(elo_rating) as max_elo
FROM user_profiles 
WHERE elo_rating IS NOT NULL
GROUP BY get_elo_tier(elo_rating)
ORDER BY MIN(elo_rating) DESC;