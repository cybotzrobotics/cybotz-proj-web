-- FTC Teams Cache Database Schema
-- This creates a cached table for FTC teams to avoid slow API calls

-- Create teams cache table
CREATE TABLE IF NOT EXISTS ftc_teams (
  id SERIAL PRIMARY KEY,
  team_number INTEGER UNIQUE NOT NULL,
  team_name TEXT NOT NULL,
  team_name_short TEXT,
  city TEXT,
  state_prov TEXT,
  country TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for fast searching
CREATE INDEX IF NOT EXISTS idx_teams_number ON ftc_teams(team_number);
CREATE INDEX IF NOT EXISTS idx_teams_name ON ftc_teams USING gin(to_tsvector('english', team_name));
CREATE INDEX IF NOT EXISTS idx_teams_name_short ON ftc_teams USING gin(to_tsvector('english', team_name_short));

-- Enable RLS (Row Level Security)
ALTER TABLE ftc_teams ENABLE ROW LEVEL SECURITY;

-- Allow public read access to teams (needed for registration)
DROP POLICY IF EXISTS "Allow public read access on teams" ON ftc_teams;
CREATE POLICY "Allow public read access on teams" ON ftc_teams 
  FOR SELECT TO authenticated, anon USING (true);

-- Function to search teams efficiently
CREATE OR REPLACE FUNCTION search_teams(search_term TEXT)
RETURNS TABLE(
  team_number INTEGER,
  team_name TEXT,
  team_name_short TEXT,
  city TEXT,
  state_prov TEXT,
  country TEXT
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.team_number,
    t.team_name,
    t.team_name_short,
    t.city,
    t.state_prov,
    t.country
  FROM ftc_teams t
  WHERE 
    t.team_number::text ILIKE '%' || search_term || '%'
    OR t.team_name ILIKE '%' || search_term || '%'
    OR t.team_name_short ILIKE '%' || search_term || '%'
  ORDER BY 
    -- Prioritize exact matches and partial matches at start
    CASE 
      WHEN t.team_number::text = search_term THEN 1
      WHEN t.team_number::text ILIKE search_term || '%' THEN 2
      WHEN t.team_name ILIKE search_term || '%' THEN 3
      WHEN t.team_name_short ILIKE search_term || '%' THEN 4
      ELSE 5
    END,
    t.team_number
  LIMIT 20;
END;
$$;

-- Grant execute permission to the search function
GRANT EXECUTE ON FUNCTION search_teams TO authenticated, anon;

-- Function to get team info by number (for leaderboard)
CREATE OR REPLACE FUNCTION get_team_info(team_num INTEGER)
RETURNS TABLE(
  team_number INTEGER,
  team_name TEXT,
  team_name_short TEXT,
  city TEXT,
  state_prov TEXT,
  country TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.team_number,
    t.team_name,
    t.team_name_short,
    t.city,
    t.state_prov,
    t.country
  FROM ftc_teams t
  WHERE t.team_number = team_num;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_team_info TO authenticated, anon;

-- Insert some sample teams for testing (remove after real sync)
INSERT INTO ftc_teams (team_number, team_name, team_name_short, city, state_prov, country) VALUES
  (12345, 'Test Robotics Team', 'Test Team', 'Test City', 'Test State', 'USA'),
  (67890, 'Another Test Team', 'Another Team', 'Another City', 'Another State', 'USA')
ON CONFLICT (team_number) DO NOTHING;