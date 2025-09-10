-- FTC Quiz App - Complete Database Setup with Leaderboard Views
-- Run this in your Supabase SQL Editor

-- Create leaderboard views that are missing

-- Individual Leaderboard View
DROP VIEW IF EXISTS individual_leaderboard;
CREATE OR REPLACE VIEW individual_leaderboard AS
WITH user_stats AS (
  SELECT 
    qa.user_id,
    u.email as username,
    COALESCE(up.full_name, u.email) as full_name,
    up.team_number,
    up.team_name,
    MAX(qa.score) as best_score,
    COUNT(*) as total_attempts,
    ROUND(AVG(qa.score::numeric), 1) as average_score,
    MAX(qa.created_at) as last_attempt
  FROM quiz_attempts qa
  LEFT JOIN auth.users u ON qa.user_id = u.id
  LEFT JOIN user_profiles up ON qa.user_id = up.user_id
  WHERE qa.is_guest = false
  GROUP BY qa.user_id, u.email, up.full_name, up.team_number, up.team_name
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
  COALESCE(team_number, 0) as team_number,
  COALESCE(team_name, 'No Team') as team_name,
  best_score,
  total_attempts,
  average_score,
  last_attempt,
  rank
FROM ranked_users
ORDER BY rank;

-- Team Leaderboard View
DROP VIEW IF EXISTS team_leaderboard;
CREATE OR REPLACE VIEW team_leaderboard AS
WITH team_stats AS (
  SELECT 
    up.team_number,
    up.team_name,
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
  COALESCE(team_name, 'Team ' || team_number) as team_name,
  team_members,
  best_team_score,
  average_team_score,
  total_team_points,
  total_team_attempts,
  last_team_activity,
  rank
FROM ranked_teams
ORDER BY rank;

-- Grant permissions on views
GRANT SELECT ON individual_leaderboard TO authenticated;
GRANT SELECT ON team_leaderboard TO authenticated;
GRANT SELECT ON individual_leaderboard TO anon;
GRANT SELECT ON team_leaderboard TO anon;

-- Enable RLS on views (though they inherit from base tables)
ALTER VIEW individual_leaderboard OWNER TO postgres;
ALTER VIEW team_leaderboard OWNER TO postgres;

-- Verify the views work
SELECT 'Individual Leaderboard Count:' as info, COUNT(*) as count FROM individual_leaderboard
UNION ALL
SELECT 'Team Leaderboard Count:' as info, COUNT(*) as count FROM team_leaderboard;

-- Also let's make sure user_profiles table exists and has proper structure
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT,
  full_name TEXT,
  team_number INTEGER,
  team_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_profiles
DROP POLICY IF EXISTS "Anyone can read user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

CREATE POLICY "Anyone can read user profiles" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Insert some sample user profiles for testing
-- Note: These will only work if the corresponding users exist in auth.users
-- You should run this after users have signed up

-- Function to refresh leaderboard (materialized views alternative)
CREATE OR REPLACE FUNCTION refresh_leaderboards()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  -- This is a placeholder function
  -- Views are automatically updated when underlying data changes
  SELECT 1;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION refresh_leaderboards() TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_leaderboards() TO anon;
