-- Create missing team_leaderboard view
-- This needs to be run in Supabase SQL Editor

-- Drop existing view if it exists
DROP VIEW IF EXISTS team_leaderboard CASCADE;

-- Create team leaderboard view (ELO-based) using user_profiles
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

-- Grant permissions
GRANT SELECT ON team_leaderboard TO authenticated, anon, service_role;

-- Verification
SELECT 'Team leaderboard view created successfully!' as status;

-- Test the view
SELECT COUNT(*) as team_count FROM team_leaderboard;