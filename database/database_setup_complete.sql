-- Complete Database Setup for FTC Quiz App
-- Run this in your Supabase SQL Editor

-- 1. Create profiles table (if not exists)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  full_name TEXT,
  team_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create quiz_questions table
CREATE TABLE IF NOT EXISTS quiz_questions (
  id SERIAL PRIMARY KEY,
  season TEXT NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of options
  correct_answer INTEGER NOT NULL, -- Index of correct answer (0-based)
  explanation TEXT,
  category TEXT DEFAULT 'General',
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create quiz_attempts table
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  season TEXT NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  questions_answered JSONB, -- Array of question details
  time_taken INTEGER, -- Time in seconds
  is_guest BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Insert sample questions for "DECODE" season
INSERT INTO quiz_questions (season, question_text, options, correct_answer, explanation, category, difficulty) VALUES
('DECODE', 'How many points does a robot score for placing a Sample in the High Basket during Autonomous?', 
 '["6 points", "8 points", "10 points", "12 points"]', 2, 
 'According to the DECODE game manual, robots score 10 points for each Sample placed in the High Basket during the Autonomous period.', 
 'Scoring', 'medium'),

('DECODE', 'What is the maximum height a robot can extend during the match?', 
 '["42 inches", "48 inches", "54 inches", "60 inches"]', 0, 
 'The maximum robot height extension is 42 inches as specified in the robot design constraints section.', 
 'Robot Design', 'easy'),

('DECODE', 'During which period can robots score Specimen points in the High Chamber?', 
 '["Autonomous only", "TeleOp only", "Both Autonomous and TeleOp", "Neither period"]', 2, 
 'Specimens can be scored in the High Chamber during both Autonomous and TeleOp periods, with different point values.', 
 'Game Rules', 'hard'),

('DECODE', 'What happens when a robot touches the Submersible zone during Autonomous?', 
 '["Nothing happens", "2 point penalty", "Robot is disabled", "5 bonus points"]', 0, 
 'There is no penalty for entering the Submersible zone during Autonomous period.', 
 'Game Rules', 'medium'),

('DECODE', 'How many Sample elements are there on the field at the start of each match?', 
 '["8 samples", "12 samples", "16 samples", "20 samples"]', 1, 
 'There are 12 Sample elements placed on the field at the beginning of each match.', 
 'Field Setup', 'easy'),

('DECODE', 'What is the maximum number of robots allowed on an alliance?', 
 '["1 robot", "2 robots", "3 robots", "4 robots"]', 1, 
 'Each alliance consists of exactly 2 robots working together.', 
 'Game Rules', 'easy'),

('DECODE', 'How many points is a Specimen worth when scored in the High Chamber during TeleOp?', 
 '["6 points", "10 points", "15 points", "20 points"]', 0, 
 'A Specimen scored in the High Chamber during TeleOp is worth 6 points.', 
 'Scoring', 'medium'),

('DECODE', 'What is the penalty for a robot that extends beyond the 42-inch height limit?', 
 '["Warning only", "5 point penalty", "Minor penalty", "Major penalty"]', 2, 
 'Exceeding the height limit results in a Minor penalty.', 
 'Penalties', 'hard'),

('DECODE', 'During which period can alliances earn Ascent points?', 
 '["Autonomous only", "TeleOp only", "End Game only", "Both TeleOp and End Game"]', 2, 
 'Ascent points can only be earned during the End Game period.', 
 'Scoring', 'medium'),

('DECODE', 'What color are the Sample elements?', 
 '["Red and Blue", "Yellow and Purple", "Red and Yellow", "Blue and Yellow"]', 2, 
 'Sample elements are Red and Yellow colored.', 
 'Field Setup', 'easy');

-- 5. Create individual leaderboard view
CREATE OR REPLACE VIEW individual_leaderboard AS
SELECT 
  ROW_NUMBER() OVER (ORDER BY best_score DESC, best_percentage DESC, username) as rank,
  p.id as user_id,
  p.username,
  p.full_name,
  p.team_number,
  COALESCE(stats.best_score, 0) as best_score,
  COALESCE(stats.total_questions, 0) as total_questions,
  COALESCE(ROUND((stats.best_score::float / NULLIF(stats.total_questions, 0)) * 100, 1), 0) as best_percentage,
  COALESCE(stats.total_attempts, 0) as total_attempts,
  COALESCE(stats.avg_time, 0) as avg_time_taken
FROM profiles p
LEFT JOIN (
  SELECT 
    user_id,
    MAX(score) as best_score,
    MAX(total_questions) as total_questions,
    COUNT(*) as total_attempts,
    ROUND(AVG(time_taken)) as avg_time
  FROM quiz_attempts 
  WHERE is_guest = FALSE
  GROUP BY user_id
) stats ON p.id = stats.user_id
WHERE p.username IS NOT NULL
ORDER BY best_score DESC, best_percentage DESC, username;

-- 6. Create team leaderboard view
CREATE OR REPLACE VIEW team_leaderboard AS
SELECT 
  ROW_NUMBER() OVER (ORDER BY avg_score DESC, team_number) as rank,
  team_number,
  COUNT(DISTINCT p.id) as member_count,
  ROUND(AVG(COALESCE(stats.best_score, 0)), 1) as avg_score,
  MAX(COALESCE(stats.total_questions, 0)) as total_questions,
  ROUND(AVG(COALESCE((stats.best_score::float / NULLIF(stats.total_questions, 0)) * 100, 0)), 1) as avg_percentage,
  SUM(COALESCE(stats.total_attempts, 0)) as total_team_attempts
FROM profiles p
LEFT JOIN (
  SELECT 
    user_id,
    MAX(score) as best_score,
    MAX(total_questions) as total_questions,
    COUNT(*) as total_attempts
  FROM quiz_attempts 
  WHERE is_guest = FALSE
  GROUP BY user_id
) stats ON p.id = stats.user_id
WHERE p.team_number IS NOT NULL
GROUP BY team_number
HAVING COUNT(DISTINCT p.id) > 0
ORDER BY avg_score DESC, team_number;

-- 7. Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS Policies

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Quiz questions policies (read-only for users)
CREATE POLICY "Anyone can read quiz questions" ON quiz_questions FOR SELECT USING (true);

-- Quiz attempts policies
CREATE POLICY "Users can view own quiz attempts" ON quiz_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own quiz attempts" ON quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 9. Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'full_name', '')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 11. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Verification queries (optional - run these to check if everything worked)
-- SELECT COUNT(*) as question_count FROM quiz_questions;
-- SELECT COUNT(*) as profile_count FROM profiles;
-- SELECT * FROM individual_leaderboard LIMIT 5;
-- SELECT * FROM team_leaderboard LIMIT 5;
