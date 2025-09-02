-- FTC Quiz App - Fix User Profile Creation and Leaderboard
-- Run this in your Supabase SQL Editor

-- First, create the user_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT,
  full_name TEXT,
  team_number INTEGER,
  team_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quiz_attempts table if it doesn't exist
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  season TEXT NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  questions_answered JSONB,
  time_taken INTEGER, -- in seconds
  is_guest BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quiz_questions table if it doesn't exist
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  season TEXT NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of answer options
  correct_answer INTEGER NOT NULL, -- Index of correct option
  explanation TEXT,
  category TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_profiles
DROP POLICY IF EXISTS "Anyone can read user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

CREATE POLICY "Anyone can read user profiles" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = user_id);

-- RLS policies for quiz_attempts
DROP POLICY IF EXISTS "Anyone can read quiz attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Authenticated users can insert quiz attempts" ON quiz_attempts;

CREATE POLICY "Anyone can read quiz attempts" ON quiz_attempts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert quiz attempts" ON quiz_attempts FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- RLS policies for quiz_questions
DROP POLICY IF EXISTS "Anyone can read quiz questions" ON quiz_questions;
DROP POLICY IF EXISTS "Anyone can insert quiz questions" ON quiz_questions;
DROP POLICY IF EXISTS "Anyone can update quiz questions" ON quiz_questions;
DROP POLICY IF EXISTS "Anyone can delete quiz questions" ON quiz_questions;

CREATE POLICY "Anyone can read quiz questions" ON quiz_questions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert quiz questions" ON quiz_questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update quiz questions" ON quiz_questions FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete quiz questions" ON quiz_questions FOR DELETE USING (true);

-- Now let's create a trigger function to automatically create user profiles
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_profiles (user_id, username, full_name, team_number, team_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', NEW.email),
    NEW.raw_user_meta_data ->> 'full_name',
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'team_number' IS NOT NULL 
      THEN (NEW.raw_user_meta_data ->> 'team_number')::integer 
      ELSE NULL 
    END,
    NEW.raw_user_meta_data ->> 'team_name'
  );
  RETURN NEW;
END;
$$;

-- Drop the trigger if it exists and recreate it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update existing users who don't have profiles
INSERT INTO user_profiles (user_id, username, full_name, team_number, team_name)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data ->> 'username', u.email) as username,
  u.raw_user_meta_data ->> 'full_name' as full_name,
  CASE 
    WHEN u.raw_user_meta_data ->> 'team_number' IS NOT NULL 
    THEN (u.raw_user_meta_data ->> 'team_number')::integer 
    ELSE NULL 
  END as team_number,
  u.raw_user_meta_data ->> 'team_name' as team_name
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE up.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Now update the leaderboard views to work properly
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
    MAX(qa.created_at) as last_attempt
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

-- Update team leaderboard view
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
    MAX(qa.created_at) as last_team_activity
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

-- Ensure proper permissions
GRANT SELECT ON individual_leaderboard TO authenticated, anon;
GRANT SELECT ON team_leaderboard TO authenticated, anon;

-- Test queries to verify data
SELECT 'Current Users with Profiles:' as info, COUNT(*) as count 
FROM auth.users u 
JOIN user_profiles up ON u.id = up.user_id;

SELECT 'Quiz Attempts:' as info, COUNT(*) as count FROM quiz_attempts WHERE is_guest = false;

SELECT 'Individual Leaderboard Entries:' as info, COUNT(*) as count FROM individual_leaderboard;

SELECT 'Team Leaderboard Entries:' as info, COUNT(*) as count FROM team_leaderboard;
