-- Create a function to safely create user profiles
CREATE OR REPLACE FUNCTION create_user_profile(
  user_id UUID,
  username TEXT,
  full_name TEXT,
  team_number INTEGER DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  INSERT INTO profiles (id, username, full_name, team_number, elo_rating, peak_elo)
  VALUES (user_id, username, full_name, team_number, 1000, 1000)
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name,
    team_number = EXCLUDED.team_number,
    updated_at = NOW()
  RETURNING json_build_object(
    'id', id,
    'username', username,
    'full_name', full_name,
    'team_number', team_number,
    'elo_rating', elo_rating,
    'peak_elo', peak_elo
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_user_profile TO authenticated;

-- Create profiles for any existing users who don't have them
INSERT INTO profiles (id, username, full_name, elo_rating, peak_elo, team_number)
SELECT DISTINCT 
  rqa.user_id,
  'User_' || SUBSTRING(rqa.user_id::text, 1, 8),
  'Quiz Participant',
  1000,
  1000,
  1
FROM ranked_quiz_attempts rqa
LEFT JOIN profiles p ON p.id = rqa.user_id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

SELECT 'Profile creation function created and missing profiles added!' as status;
