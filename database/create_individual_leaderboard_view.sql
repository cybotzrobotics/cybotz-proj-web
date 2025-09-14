-- Create individual_leaderboard view for the leaderboard component
-- This view aggregates user quiz performance data

CREATE OR REPLACE VIEW individual_leaderboard AS
WITH user_stats AS (
  SELECT 
    p.user_id,
    p.username,
    p.full_name,
    p.team_number,
    p.team_name,
    p.elo_rating,
    p.peak_elo,
    COUNT(rqa.id) as attempts,
    MAX(rqa.accuracy) as best_accuracy,
    MAX(rqa.score) as best_score,
    MIN(rqa.time_taken) as best_time,
    MAX(rqa.created_at) as last_attempt
  FROM user_profiles p
  LEFT JOIN ranked_quiz_attempts rqa ON p.user_id = rqa.user_id
  WHERE rqa.is_guest = false OR rqa.is_guest IS NULL
  GROUP BY p.user_id, p.username, p.full_name, p.team_number, p.team_name, p.elo_rating, p.peak_elo
)
SELECT 
  user_id as id,
  username,
  full_name,
  team_number,
  team_name,
  COALESCE(best_score, 0) as best_score,
  COALESCE(best_accuracy, 0) as best_accuracy,
  COALESCE(best_time, 0) as best_time,
  COALESCE(attempts, 0) as attempts,
  last_attempt,
  ROW_NUMBER() OVER (ORDER BY 
    COALESCE(best_score, 0) DESC, 
    COALESCE(best_accuracy, 0) DESC, 
    COALESCE(best_time, 999999) ASC,
    elo_rating DESC
  ) as rank
FROM user_stats
ORDER BY rank;

-- Grant permissions
GRANT SELECT ON individual_leaderboard TO authenticated;
GRANT SELECT ON individual_leaderboard TO anon;