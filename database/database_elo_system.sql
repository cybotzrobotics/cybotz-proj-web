-- ELO Rating System Implementation
-- This script adds ELO rating system to the existing quiz application

-- 1. Add ELO rating to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS elo_rating INTEGER DEFAULT 1000,
ADD COLUMN IF NOT EXISTS peak_elo INTEGER DEFAULT 1000;

-- 2. Update existing users to have starting ELO of 1000
UPDATE profiles 
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
  -- Get current ELO
  SELECT elo_rating INTO current_elo FROM profiles WHERE id = user_uuid;
  
  -- If no ELO found, set to default
  IF current_elo IS NULL THEN
    current_elo := 1000;
    UPDATE profiles SET elo_rating = 1000 WHERE id = user_uuid;
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
  
  -- Update user's ELO
  UPDATE profiles 
  SET 
    elo_rating = new_elo_value,
    peak_elo = GREATEST(peak_elo, new_elo_value),
    updated_at = NOW()
  WHERE id = user_uuid;
  
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

-- 6. Drop and recreate individual leaderboard view (ELO-based)
DROP VIEW IF EXISTS individual_leaderboard;
CREATE VIEW individual_leaderboard AS
SELECT 
  ROW_NUMBER() OVER (ORDER BY p.elo_rating DESC, p.peak_elo DESC, p.created_at ASC) AS rank,
  p.id AS user_id,
  p.username,
  p.full_name,
  p.team_number,
  p.elo_rating,
  p.peak_elo,
  COUNT(rqa.id) AS total_attempts,
  COALESCE(AVG(rqa.score), 0) AS average_score,
  COALESCE(MAX(rqa.score), 0) AS best_score,
  MAX(rqa.created_at) AS last_attempt
FROM profiles p
LEFT JOIN ranked_quiz_attempts rqa ON p.id = rqa.user_id
  AND rqa.date_attempted >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY p.id, p.username, p.full_name, p.team_number, p.elo_rating, p.peak_elo
ORDER BY p.elo_rating DESC, p.peak_elo DESC, p.created_at ASC;

-- 7. Drop and recreate team leaderboard view (ELO-based)
DROP VIEW IF EXISTS team_leaderboard;
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
FROM profiles p
LEFT JOIN ranked_quiz_attempts rqa ON p.id = rqa.user_id
  AND rqa.date_attempted >= CURRENT_DATE - INTERVAL '30 days'
WHERE team_number IS NOT NULL
GROUP BY team_number
HAVING COUNT(*) > 0
ORDER BY ROUND(AVG(elo_rating)) DESC, SUM(peak_elo) DESC;

-- 8. Create function to get ELO distribution/tiers
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

-- 9. Enable RLS policies for new columns
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranked_quiz_attempts ENABLE ROW LEVEL SECURITY;

-- 10. Update RLS policies for profiles to include ELO fields
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 11. Update RLS policies for ranked_quiz_attempts
DROP POLICY IF EXISTS "Users can view all quiz attempts" ON ranked_quiz_attempts;
DROP POLICY IF EXISTS "Users can insert own quiz attempts" ON ranked_quiz_attempts;
DROP POLICY IF EXISTS "Users can update own quiz attempts" ON ranked_quiz_attempts;
CREATE POLICY "Users can view all quiz attempts" ON ranked_quiz_attempts FOR SELECT USING (true);
CREATE POLICY "Users can insert own quiz attempts" ON ranked_quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own quiz attempts" ON ranked_quiz_attempts FOR UPDATE USING (auth.uid() = user_id);

-- 12. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_elo_rating ON profiles(elo_rating DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_peak_elo ON profiles(peak_elo DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_team_elo ON profiles(team_number, elo_rating DESC);

-- Verification queries
SELECT 'ELO System Setup Complete!' as status;

-- Show current ELO distribution
SELECT 
  get_elo_tier(elo_rating) as tier,
  COUNT(*) as user_count,
  MIN(elo_rating) as min_elo,
  MAX(elo_rating) as max_elo
FROM profiles 
WHERE elo_rating IS NOT NULL
GROUP BY get_elo_tier(elo_rating)
ORDER BY MIN(elo_rating) DESC;
