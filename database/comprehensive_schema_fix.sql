-- Comprehensive Database Schema Fix
-- This script fixes all the identified issues in the database schema

-- 1. DROP AND RECREATE ranked_quiz_attempts table (it exists but has no columns)
DROP TABLE IF EXISTS ranked_quiz_attempts CASCADE;

CREATE TABLE ranked_quiz_attempts (
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
  accuracy INTEGER DEFAULT 0, -- Added for frontend compatibility
  is_guest BOOLEAN DEFAULT false, -- Added for frontend compatibility
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for ranked_quiz_attempts
ALTER TABLE ranked_quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ranked_quiz_attempts
CREATE POLICY "Users can view all ranked quiz attempts" ON ranked_quiz_attempts FOR SELECT USING (true);
CREATE POLICY "Users can insert own ranked quiz attempts" ON ranked_quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ranked quiz attempts" ON ranked_quiz_attempts FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ranked_quiz_attempts_user_id ON ranked_quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_ranked_quiz_attempts_date ON ranked_quiz_attempts(date_attempted);
CREATE INDEX IF NOT EXISTS idx_ranked_quiz_attempts_score ON ranked_quiz_attempts(score DESC);

-- 2. DROP AND RECREATE practice_quiz_attempts table (it also exists but has no columns)
DROP TABLE IF EXISTS practice_quiz_attempts CASCADE;

CREATE TABLE practice_quiz_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  time_taken INTEGER, -- in seconds
  date_attempted DATE DEFAULT CURRENT_DATE,
  season TEXT DEFAULT '2025-2026',
  questions_answered JSONB, -- Store question IDs and whether they were correct
  accuracy INTEGER DEFAULT 0, -- Added for frontend compatibility
  is_guest BOOLEAN DEFAULT false, -- Added for frontend compatibility
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for practice_quiz_attempts
ALTER TABLE practice_quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for practice_quiz_attempts
CREATE POLICY "Users can view all practice quiz attempts" ON practice_quiz_attempts FOR SELECT USING (true);
CREATE POLICY "Users can insert own practice quiz attempts" ON practice_quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own practice quiz attempts" ON practice_quiz_attempts FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_practice_quiz_attempts_user_id ON practice_quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_quiz_attempts_date ON practice_quiz_attempts(date_attempted);

-- 3. Create missing daily_tracking table
CREATE TABLE IF NOT EXISTS daily_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE DEFAULT CURRENT_DATE,
  user_name TEXT NOT NULL,
  user_score INTEGER NOT NULL,
  total_participants INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for daily_tracking
ALTER TABLE daily_tracking ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for daily_tracking
CREATE POLICY "Users can view daily tracking" ON daily_tracking FOR SELECT USING (true);
CREATE POLICY "Users can insert daily tracking" ON daily_tracking FOR INSERT WITH CHECK (true);

-- Create indexes for daily_tracking
CREATE INDEX IF NOT EXISTS idx_daily_tracking_date ON daily_tracking(date);
CREATE INDEX IF NOT EXISTS idx_daily_tracking_user_name ON daily_tracking(user_name);

-- 4. Add missing columns to quiz_questions if they don't exist (from CSV import script)
ALTER TABLE quiz_questions 
ADD COLUMN IF NOT EXISTS question_type TEXT,
ADD COLUMN IF NOT EXISTS confidence_score INTEGER,
ADD COLUMN IF NOT EXISTS requires_review BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_verified TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS times_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS times_correct INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 5. Recreate ELO functions with proper permissions
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
  IF is_correct THEN
    base_change := ROUND(k_factor * difficulty_multiplier * 0.5);
  ELSE
    base_change := -ROUND(k_factor * (2.0 - difficulty_multiplier) * 0.3);
  END IF;
  
  -- Apply diminishing returns for very high ELO
  IF current_elo > 1800 THEN
    final_change := ROUND(base_change * 0.7);
  ELSIF current_elo > 1500 THEN
    final_change := ROUND(base_change * 0.85);
  ELSE
    final_change := base_change;
  END IF;
  
  -- Ensure minimum change
  IF final_change = 0 AND is_correct THEN
    final_change := 1;
  ELSIF final_change = 0 AND NOT is_correct THEN
    final_change := -1;
  END IF;
  
  RETURN final_change;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions on calculate_elo_change
GRANT EXECUTE ON FUNCTION calculate_elo_change TO authenticated, anon, service_role;

-- 6. Drop existing update_user_elo function variants and recreate
DROP FUNCTION IF EXISTS update_user_elo(UUID, TEXT, JSONB);
DROP FUNCTION IF EXISTS update_user_elo(UUID, UUID, JSONB);

-- Create update_user_elo function
CREATE OR REPLACE FUNCTION update_user_elo(
  user_uuid UUID,
  quiz_attempt_id UUID,
  questions_data JSONB
) RETURNS TABLE(
  old_elo INTEGER,
  new_elo INTEGER,
  elo_change INTEGER,
  questions_processed INTEGER
) AS $$
DECLARE
  current_elo INTEGER;
  total_change INTEGER := 0;
  question_item JSONB;
  question_difficulty TEXT;
  is_answer_correct BOOLEAN;
  individual_change INTEGER;
  new_elo_rating INTEGER;
  questions_count INTEGER := 0;
BEGIN
  -- Get current ELO rating
  SELECT elo_rating INTO current_elo 
  FROM user_profiles 
  WHERE user_id = user_uuid;
  
  IF current_elo IS NULL THEN
    current_elo := 1000; -- Default starting ELO
  END IF;
  
  -- Process each question in the quiz
  FOR question_item IN SELECT * FROM jsonb_array_elements(questions_data)
  LOOP
    questions_count := questions_count + 1;
    
    -- Extract question data
    is_answer_correct := (question_item->>'is_correct')::BOOLEAN;
    
    -- Get question difficulty (default to 'medium' if not found)
    SELECT COALESCE(difficulty, 'medium') INTO question_difficulty
    FROM quiz_questions 
    WHERE id = (question_item->>'question_id')::UUID;
    
    IF question_difficulty IS NULL THEN
      question_difficulty := 'medium';
    END IF;
    
    -- Calculate ELO change for this question
    individual_change := calculate_elo_change(current_elo + total_change, is_answer_correct, question_difficulty);
    total_change := total_change + individual_change;
  END LOOP;
  
  -- Calculate new ELO (minimum 100, maximum 3000)
  new_elo_rating := GREATEST(100, LEAST(3000, current_elo + total_change));
  
  -- Update user's ELO rating and peak ELO
  UPDATE user_profiles 
  SET 
    elo_rating = new_elo_rating,
    peak_elo = GREATEST(peak_elo, new_elo_rating),
    updated_at = NOW()
  WHERE user_id = user_uuid;
  
  -- Update the quiz attempt with ELO data
  UPDATE ranked_quiz_attempts 
  SET 
    elo_before = current_elo,
    elo_after = new_elo_rating,
    elo_change = total_change,
    updated_at = NOW()
  WHERE id = quiz_attempt_id;
  
  -- Return the ELO change information
  RETURN QUERY SELECT current_elo, new_elo_rating, total_change, questions_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions on update_user_elo
GRANT EXECUTE ON FUNCTION update_user_elo TO authenticated, anon, service_role;

-- 7. Create record_daily_completion function
CREATE OR REPLACE FUNCTION record_daily_completion(
  user_name TEXT,
  user_score INTEGER
) RETURNS VOID AS $$
BEGIN
  INSERT INTO daily_tracking (date, user_name, user_score)
  VALUES (CURRENT_DATE, user_name, user_score)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions on record_daily_completion
GRANT EXECUTE ON FUNCTION record_daily_completion TO authenticated, anon, service_role;

-- 8. Grant necessary permissions on tables
GRANT ALL ON ranked_quiz_attempts TO authenticated, anon, service_role;
GRANT ALL ON practice_quiz_attempts TO authenticated, anon, service_role;
GRANT ALL ON daily_tracking TO authenticated, anon, service_role;

-- 9. Final verification
SELECT 'Schema fix complete! All tables and functions should now work properly.' as status;