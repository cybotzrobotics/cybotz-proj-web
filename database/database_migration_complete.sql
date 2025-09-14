-- COMPLETE SUPABASE MIGRATION SCRIPT
-- For migrating Cybotz FTC Quiz App to new Supabase project
-- Run this entire script in your new Supabase SQL Editor

-- ========================================
-- 1. USER PROFILES AND AUTH SETUP
-- ========================================

-- Create user profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT,
  full_name TEXT,
  team_number INTEGER,
  team_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 2. QUIZ QUESTIONS TABLE (CORRECT SCHEMA)
-- ========================================

-- Create quiz_questions table with ALL required columns for QuizDebug component
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  season TEXT NOT NULL,
  question TEXT NOT NULL,  -- Note: 'question' not 'question_text'
  options JSONB NOT NULL,
  correct_answer INTEGER NOT NULL,
  explanation TEXT,
  category TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  section TEXT,            -- Required by QuizDebug
  rule_name TEXT,          -- Required by QuizDebug
  tags JSONB,              -- Required by QuizDebug (array of strings)
  source_page TEXT,        -- Required by QuizDebug
  confidence INTEGER,      -- Required by QuizDebug
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 3. QUIZ ATTEMPTS TABLES
-- ========================================

-- Main quiz attempts table
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  season TEXT NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  questions_answered JSONB,
  time_taken INTEGER, -- in seconds
  is_guest BOOLEAN DEFAULT false,
  accuracy DECIMAL(5,2),
  date_attempted DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily ranked questions tracking
CREATE TABLE IF NOT EXISTS daily_ranked_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  question_id UUID REFERENCES quiz_questions(id),
  question_position INTEGER NOT NULL, -- 1-15 for the daily set
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(date, question_position),
  UNIQUE(date, question_id)
);

-- Practice quiz attempts (separate from ranked)
CREATE TABLE IF NOT EXISTS practice_quiz_attempts (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  season TEXT NOT NULL,
  questions_answered JSONB NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  time_taken INTEGER,
  accuracy DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- 4. FTC TEAMS CACHE
-- ========================================

-- Create teams cache table
CREATE TABLE IF NOT EXISTS ftc_teams (
  id SERIAL PRIMARY KEY,
  team_number INTEGER UNIQUE NOT NULL,
  team_name TEXT NOT NULL,
  team_name_short TEXT,
  city TEXT,
  state_prov TEXT,
  country TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 5. INDEXES FOR PERFORMANCE
-- ========================================

-- Quiz attempts indexes
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_date ON quiz_attempts(user_id, date_attempted);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_created ON quiz_attempts(created_at);

-- Daily ranked questions indexes
CREATE INDEX IF NOT EXISTS idx_daily_ranked_date ON daily_ranked_questions(date);

-- FTC teams indexes
CREATE INDEX IF NOT EXISTS idx_teams_number ON ftc_teams(team_number);
CREATE INDEX IF NOT EXISTS idx_teams_name ON ftc_teams USING gin(to_tsvector('english', team_name));
CREATE INDEX IF NOT EXISTS idx_teams_name_short ON ftc_teams USING gin(to_tsvector('english', team_name_short));

-- ========================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_ranked_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ftc_teams ENABLE ROW LEVEL SECURITY;

-- User profiles policies
DROP POLICY IF EXISTS "Anyone can read user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

CREATE POLICY "Anyone can read user profiles" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Quiz questions policies (allow all for question insertion via test page)
DROP POLICY IF EXISTS "Anyone can read quiz questions" ON quiz_questions;
DROP POLICY IF EXISTS "Anyone can insert quiz questions" ON quiz_questions;
DROP POLICY IF EXISTS "Anyone can update quiz questions" ON quiz_questions;
DROP POLICY IF EXISTS "Anyone can delete quiz questions" ON quiz_questions;

CREATE POLICY "Anyone can read quiz questions" ON quiz_questions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert quiz questions" ON quiz_questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update quiz questions" ON quiz_questions FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete quiz questions" ON quiz_questions FOR DELETE USING (true);

-- Quiz attempts policies
DROP POLICY IF EXISTS "Users can view own quiz attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Users can insert own quiz attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Anyone can read quiz attempts" ON quiz_attempts;

CREATE POLICY "Anyone can read quiz attempts" ON quiz_attempts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert quiz attempts" ON quiz_attempts FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Daily ranked questions policies
DROP POLICY IF EXISTS "Users can view daily ranked questions" ON daily_ranked_questions;
CREATE POLICY "Users can view daily ranked questions" ON daily_ranked_questions FOR SELECT USING (true);

-- Practice quiz attempts policies
DROP POLICY IF EXISTS "Users can insert their own practice attempts" ON practice_quiz_attempts;
DROP POLICY IF EXISTS "Users can view their own practice attempts" ON practice_quiz_attempts;

CREATE POLICY "Users can insert their own practice attempts" ON practice_quiz_attempts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own practice attempts" ON practice_quiz_attempts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- FTC teams policies
DROP POLICY IF EXISTS "Allow public read access on teams" ON ftc_teams;
CREATE POLICY "Allow public read access on teams" ON ftc_teams 
  FOR SELECT TO authenticated, anon USING (true);

-- ========================================
-- 7. DATABASE FUNCTIONS
-- ========================================

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, username, full_name, team_number, team_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'full_name',
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'team_number' IS NOT NULL 
           AND NEW.raw_user_meta_data ->> 'team_number' != ''
           AND NEW.raw_user_meta_data ->> 'team_number' ~ '^[0-9]+$'
      THEN (NEW.raw_user_meta_data ->> 'team_number')::integer 
      ELSE NULL 
    END,
    NEW.raw_user_meta_data ->> 'team_name'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name,
    team_number = EXCLUDED.team_number,
    team_name = EXCLUDED.team_name,
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error creating user profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Function to get daily ranked questions
CREATE OR REPLACE FUNCTION get_daily_ranked_questions(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  question_position INTEGER,
  id UUID,
  section TEXT,
  rule_name TEXT,
  question TEXT,
  options JSONB,
  correct_answer INTEGER,
  explanation TEXT,
  difficulty TEXT,
  category TEXT,
  season TEXT,
  tags JSONB,
  source_page TEXT,
  confidence INTEGER
) AS $$
BEGIN
  -- Check if we have questions for this date
  IF NOT EXISTS (SELECT 1 FROM daily_ranked_questions WHERE date = target_date) THEN
    -- Generate new daily questions by selecting 15 random questions
    INSERT INTO daily_ranked_questions (date, question_id, question_position)
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
    drq.question_position,
    q.id,
    COALESCE(q.section, '') as section,
    COALESCE(q.rule_name, '') as rule_name,
    COALESCE(q.question, '') as question,
    COALESCE(q.options, '[]'::jsonb) as options,
    COALESCE(q.correct_answer, 0) as correct_answer,
    COALESCE(q.explanation, '') as explanation,
    COALESCE(q.difficulty, 'medium') as difficulty,
    COALESCE(q.category, '') as category,
    COALESCE(q.season, '') as season,
    COALESCE(q.tags, '[]'::jsonb) as tags,
    COALESCE(q.source_page, '') as source_page,
    COALESCE(q.confidence, 10) as confidence
  FROM daily_ranked_questions drq
  JOIN quiz_questions q ON drq.question_id = q.id
  WHERE drq.date = target_date
  ORDER BY drq.question_position;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get practice questions
CREATE OR REPLACE FUNCTION get_practice_questions(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  id UUID,
  section TEXT,
  rule_name TEXT,
  question TEXT,
  options JSONB,
  correct_answer INTEGER,
  explanation TEXT,
  difficulty TEXT,
  category TEXT,
  season TEXT,
  tags JSONB,
  source_page TEXT,
  confidence INTEGER
) AS $$
BEGIN
  -- Check if daily ranked questions exist for the target date
  IF NOT EXISTS (SELECT 1 FROM daily_ranked_questions WHERE date = target_date) THEN
    -- If no daily ranked questions exist yet, return all questions for practice
    RETURN QUERY
    SELECT 
      q.id,
      COALESCE(q.section, '') as section,
      COALESCE(q.rule_name, '') as rule_name,
      COALESCE(q.question, '') as question,
      COALESCE(q.options, '[]'::jsonb) as options,
      COALESCE(q.correct_answer, 0) as correct_answer,
      COALESCE(q.explanation, '') as explanation,
      COALESCE(q.difficulty, 'medium') as difficulty,
      COALESCE(q.category, '') as category,
      COALESCE(q.season, '') as season,
      COALESCE(q.tags, '[]'::jsonb) as tags,
      COALESCE(q.source_page, '') as source_page,
      COALESCE(q.confidence, 10) as confidence
    FROM quiz_questions q
    ORDER BY q.id;
  ELSE
    -- Return questions NOT in today's ranked set
    RETURN QUERY
    SELECT 
      q.id,
      COALESCE(q.section, '') as section,
      COALESCE(q.rule_name, '') as rule_name,
      COALESCE(q.question, '') as question,
      COALESCE(q.options, '[]'::jsonb) as options,
      COALESCE(q.correct_answer, 0) as correct_answer,
      COALESCE(q.explanation, '') as explanation,
      COALESCE(q.difficulty, 'medium') as difficulty,
      COALESCE(q.category, '') as category,
      COALESCE(q.season, '') as season,
      COALESCE(q.tags, '[]'::jsonb) as tags,
      COALESCE(q.source_page, '') as source_page,
      COALESCE(q.confidence, 10) as confidence
    FROM quiz_questions q
    WHERE q.id NOT IN (
      SELECT drq.question_id 
      FROM daily_ranked_questions drq 
      WHERE drq.date = target_date
    )
    ORDER BY q.id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search teams efficiently
CREATE OR REPLACE FUNCTION search_teams(search_term TEXT)
RETURNS TABLE(
  team_number INTEGER,
  team_name TEXT,
  team_name_short TEXT,
  city TEXT,
  state_prov TEXT,
  country TEXT
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.team_number,
    t.team_name,
    t.team_name_short,
    t.city,
    t.state_prov,
    t.country
  FROM ftc_teams t
  WHERE 
    t.team_number::text ILIKE '%' || search_term || '%'
    OR t.team_name ILIKE '%' || search_term || '%'
    OR t.team_name_short ILIKE '%' || search_term || '%'
  ORDER BY 
    CASE 
      WHEN t.team_number::text = search_term THEN 1
      WHEN t.team_number::text ILIKE search_term || '%' THEN 2
      WHEN t.team_name ILIKE search_term || '%' THEN 3
      WHEN t.team_name_short ILIKE search_term || '%' THEN 4
      ELSE 5
    END,
    t.team_number
  LIMIT 20;
END;
$$;

-- Function to get team info by number
CREATE OR REPLACE FUNCTION get_team_info(team_num INTEGER)
RETURNS TABLE(
  team_number INTEGER,
  team_name TEXT,
  team_name_short TEXT,
  city TEXT,
  state_prov TEXT,
  country TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.team_number,
    t.team_name,
    t.team_name_short,
    t.city,
    t.state_prov,
    t.country
  FROM ftc_teams t
  WHERE t.team_number = team_num;
END;
$$;

-- ========================================
-- 8. AUTH TRIGGERS
-- ========================================

-- Drop existing triggers and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- 9. LEADERBOARD VIEWS
-- ========================================

-- Individual leaderboard view
DROP VIEW IF EXISTS individual_leaderboard;
CREATE OR REPLACE VIEW individual_leaderboard AS
WITH user_stats AS (
  SELECT 
    qa.user_id,
    COALESCE(up.username, u.email) as username,
    COALESCE(up.full_name, u.email) as full_name,
    COALESCE(up.team_number, 0) as team_number,
    COALESCE(up.team_name, 'No Team') as team_name,
    MAX(qa.score) as best_score,
    COUNT(*) as total_attempts,
    ROUND(AVG(qa.score::numeric), 1) as average_score,
    COALESCE(MAX(qa.created_at), NOW()) as last_attempt
  FROM quiz_attempts qa
  LEFT JOIN auth.users u ON qa.user_id = u.id
  LEFT JOIN user_profiles up ON qa.user_id = up.user_id
  WHERE qa.is_guest = false
  GROUP BY qa.user_id, up.username, u.email, up.full_name, up.team_number, up.team_name
),
ranked_users AS (
  SELECT *,
    ROW_NUMBER() OVER (ORDER BY best_score DESC, average_score DESC, total_attempts ASC) as rank
  FROM user_stats
)
SELECT 
  user_id as id,
  username,
  full_name,
  team_number,
  team_name,
  best_score,
  total_attempts,
  average_score,
  last_attempt,
  rank
FROM ranked_users
ORDER BY rank;

-- Team leaderboard view
DROP VIEW IF EXISTS team_leaderboard;
CREATE OR REPLACE VIEW team_leaderboard AS
WITH team_stats AS (
  SELECT 
    COALESCE(up.team_number, 0) as team_number,
    COALESCE(up.team_name, 'No Team') as team_name,
    COUNT(DISTINCT qa.user_id) as team_members,
    MAX(qa.score) as best_team_score,
    ROUND(AVG(qa.score::numeric), 1) as average_team_score,
    SUM(qa.score) as total_team_points,
    COUNT(*) as total_team_attempts,
    COALESCE(MAX(qa.created_at), NOW()) as last_team_activity
  FROM quiz_attempts qa
  LEFT JOIN user_profiles up ON qa.user_id = up.user_id
  WHERE qa.is_guest = false 
    AND up.team_number IS NOT NULL 
    AND up.team_number > 0
  GROUP BY up.team_number, up.team_name
),
ranked_teams AS (
  SELECT *,
    ROW_NUMBER() OVER (ORDER BY best_team_score DESC, average_team_score DESC, total_team_points DESC) as rank
  FROM team_stats
)
SELECT 
  team_number,
  team_name,
  team_members,
  best_team_score,
  average_team_score,
  total_team_points,
  total_team_attempts,
  last_team_activity,
  rank
FROM ranked_teams
ORDER BY rank;

-- ========================================
-- 10. PERMISSIONS
-- ========================================

-- Grant all necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Grant specific function permissions
GRANT EXECUTE ON FUNCTION get_daily_ranked_questions TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION get_practice_questions TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION search_teams TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_team_info TO authenticated, anon;
GRANT EXECUTE ON FUNCTION handle_new_user TO service_role;

-- Grant view permissions
GRANT SELECT ON individual_leaderboard TO authenticated, anon;
GRANT SELECT ON team_leaderboard TO authenticated, anon;

-- ========================================
-- 11. VERIFICATION QUERIES
-- ========================================

-- Test that everything was created successfully
SELECT 'Tables created:' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_profiles', 'quiz_questions', 'quiz_attempts', 'daily_ranked_questions', 'practice_quiz_attempts', 'ftc_teams');

SELECT 'Functions created:' as status;
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_daily_ranked_questions', 'get_practice_questions', 'search_teams', 'get_team_info', 'handle_new_user');

SELECT 'Views created:' as status;
SELECT table_name FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name IN ('individual_leaderboard', 'team_leaderboard');

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
-- Next steps:
-- 1. Update your .env.local with new Supabase credentials
-- 2. Go to /test page and click "Insert New 100+ Questions"
-- 3. Run team synchronization scripts for FTC teams
-- 4. Test the application functionality