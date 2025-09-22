-- Add insert policy for ftc_teams table to allow users to add missing teams
DROP POLICY IF EXISTS "Allow public insert on teams" ON ftc_teams;
CREATE POLICY "Allow public insert on teams" ON ftc_teams 
  FOR INSERT TO authenticated, anon WITH CHECK (true);

-- Also ensure the table grants are correct
GRANT SELECT, INSERT ON ftc_teams TO authenticated, anon;