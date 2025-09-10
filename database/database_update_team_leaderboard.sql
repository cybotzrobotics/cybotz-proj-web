-- Update team leaderboard view to use CEIL (round up) instead of ROUND
DROP VIEW IF EXISTS team_leaderboard;
CREATE VIEW team_leaderboard AS
SELECT 
  ROW_NUMBER() OVER (ORDER BY CEIL(AVG(elo_rating)) DESC, SUM(peak_elo) DESC) AS rank,
  team_number,
  COUNT(*) AS team_size,
  CEIL(AVG(elo_rating)) AS avg_elo, -- Round up as requested
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
ORDER BY CEIL(AVG(elo_rating)) DESC, SUM(peak_elo) DESC;

-- Also create a function to get team info with FTC Scout API integration
CREATE OR REPLACE FUNCTION get_team_leaderboard_with_info()
RETURNS TABLE(
  rank INTEGER,
  team_number INTEGER,
  team_size BIGINT,
  avg_elo INTEGER,
  max_elo INTEGER,
  min_elo INTEGER,
  total_peak_elo INTEGER,
  active_members BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tl.rank,
    tl.team_number,
    tl.team_size,
    tl.avg_elo,
    tl.max_elo,
    tl.min_elo,
    tl.total_peak_elo,
    tl.active_members
  FROM team_leaderboard tl
  ORDER BY tl.rank;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON team_leaderboard TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_team_leaderboard_with_info TO authenticated, anon;

SELECT 'Team leaderboard updated with CEIL function!' as status;
