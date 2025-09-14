-- Fix FTC Teams RLS Policy for Insertion
-- Run this in your Supabase SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "Allow public read access on teams" ON ftc_teams;
DROP POLICY IF EXISTS "Allow service role insert on teams" ON ftc_teams;

-- Create policies that allow reading for everyone and inserting for service role
CREATE POLICY "Allow public read access on teams" ON ftc_teams 
  FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "Allow service role insert on teams" ON ftc_teams 
  FOR INSERT TO service_role, authenticated, anon WITH CHECK (true);

-- Also allow updates for service role (for upserts)
CREATE POLICY "Allow service role update on teams" ON ftc_teams 
  FOR UPDATE TO service_role, authenticated, anon USING (true);

SELECT 'FTC Teams policies updated for sync script' as status;