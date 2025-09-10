-- Optional: Script to remove team leaderboard functionality
-- This script disables team leaderboard views while preserving individual team associations

-- Note: We're keeping the team_leaderboard view in case you want to re-enable it later
-- If you want to completely remove it, uncomment the following line:
-- DROP VIEW IF EXISTS team_leaderboard;

-- The individual_leaderboard view already includes team information
-- so users can still see their team associations in the individual rankings

-- Test query to verify individual leaderboard still shows team associations:
SELECT 
  username,
  team_number,
  team_name,
  best_score,
  rank
FROM individual_leaderboard 
WHERE team_number IS NOT NULL
ORDER BY rank 
LIMIT 10;

-- If you need to completely remove team tracking later, you would need to:
-- 1. Remove team_number and team_name columns from user_profiles
-- 2. Update the individual_leaderboard view
-- 3. Drop the team_leaderboard view
-- But for now, we're just hiding it in the UI while keeping the data structure
