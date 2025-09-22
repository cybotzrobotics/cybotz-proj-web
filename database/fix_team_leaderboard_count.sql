-- Fix team_leaderboard view to show correct team_size
-- Run this in Supabase SQL Editor

-- Drop and recreate the team_leaderboard view with correct counting
DROP VIEW IF EXISTS team_leaderboard CASCADE;

CREATE VIEW team_leaderboard AS
WITH team_stats AS (
  SELECT 
    team_number,
    COUNT(*) AS team_size,
    ROUND(AVG(elo_rating)) AS avg_elo,
    MAX(elo_rating) AS max_elo,
    MIN(elo_rating) AS min_elo,
    SUM(peak_elo) AS total_peak_elo
  FROM user_profiles 
  WHERE team_number IS NOT NULL
  GROUP BY team_number
),
active_members AS (
  SELECT 
    up.team_number,
    COUNT(DISTINCT rqa.user_id) AS active_members
  FROM user_profiles up
  LEFT JOIN ranked_quiz_attempts rqa ON up.user_id = rqa.user_id
    AND rqa.date_attempted >= CURRENT_DATE - INTERVAL '30 days'
  WHERE up.team_number IS NOT NULL
  GROUP BY up.team_number
)
SELECT 
  ROW_NUMBER() OVER (ORDER BY ts.avg_elo DESC, ts.total_peak_elo DESC) AS rank,
  ts.team_number,
  ts.team_size,
  ts.avg_elo,
  ts.max_elo,
  ts.min_elo,
  ts.total_peak_elo,
  COALESCE(am.active_members, 0) AS active_members
FROM team_stats ts
LEFT JOIN active_members am ON ts.team_number = am.team_number
ORDER BY ts.avg_elo DESC, ts.total_peak_elo DESC;

-- Grant permissions
GRANT SELECT ON team_leaderboard TO authenticated, anon, service_role;

-- Test the fix
SELECT 
  team_number, 
  team_size, 
  avg_elo, 
  total_peak_elo,
  active_members
FROM team_leaderboard 
WHERE team_number = 9034;

-- Expected results for team 9034 (after user profile ELO update to 1060):
-- team_size: 1 (was 3)
-- avg_elo: 1060 (updated from user profile)
-- total_peak_elo: 1060 (updated from user profile)
-- active_members: 1 (should remain 1)