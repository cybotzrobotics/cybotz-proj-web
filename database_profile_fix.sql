-- FTC Quiz App - Fix User Profile Creation and Leaderboard
-- Run this in your Supabase SQL Editor

-- First, let's create a trigger function to automatically create user profiles
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
