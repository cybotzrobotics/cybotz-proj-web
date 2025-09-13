#!/usr/bin/env node

/**
 * Fix RLS and Add Sample Teams
 * This script helps diagnose and fix RLS issues
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function diagnoseRLS() {
  console.log('🔧 Diagnosing RLS issue...')
  console.log(`Using key: ${supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'NOT FOUND'}`)

  // Check if we have service role key vs anon key
  const isServiceRole = supabaseKey && supabaseKey.includes('service_role')
  const isAnonKey = supabaseKey && !supabaseKey.includes('service_role')

  console.log(`Key type: ${isServiceRole ? 'SERVICE_ROLE' : isAnonKey ? 'ANON' : 'UNKNOWN'}`)

  if (isAnonKey) {
    console.log(`
❌ PROBLEM FOUND: Using anon key for data insertion

The current key is an anonymous key, which has limited permissions.
To insert teams data, you need either:

1. SERVICE ROLE KEY (recommended):
   - Go to your Supabase project settings
   - Go to API section
   - Copy the 'service_role' key
   - Add to .env.local as: SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

2. OR update RLS policies to allow anon inserts:
   - Go to Supabase SQL Editor
   - Run this SQL:

   CREATE POLICY "Allow anon insert on teams" ON ftc_teams 
     FOR INSERT TO anon USING (true);

📋 For now, I'll show you the manual SQL to insert sample teams:
`)

    const sampleTeamsSQL = `
-- Manual insert of sample teams (run in Supabase SQL Editor)
INSERT INTO ftc_teams (team_number, team_name, team_name_short, city, state_prov, country) VALUES
(731, 'Wannabee Strange', 'Wannabee Strange', 'Stonington', 'CT', 'USA'),
(1002, 'Circuit Crushers', 'Circuit Crushers', 'Hartford', 'CT', 'USA'),
(5100, 'Cyberdragons', 'Cyberdragons', 'Stamford', 'CT', 'USA'),
(6832, 'Iron Pulse', 'Iron Pulse', 'Waterbury', 'CT', 'USA'),
(8393, 'Giant Diencephalon', 'Giant Diencephalon', 'West Hartford', 'CT', 'USA'),
(9794, 'Wizards.exe', 'Wizards.exe', 'New Haven', 'CT', 'USA'),
(11115, 'Gluten Free', 'Gluten Free', 'Guilford', 'CT', 'USA'),
(12533, 'Mechanical Meltdown', 'Mechanical Meltdown', 'Bridgeport', 'CT', 'USA')
ON CONFLICT (team_number) DO UPDATE SET
  team_name = EXCLUDED.team_name,
  team_name_short = EXCLUDED.team_name_short,
  city = EXCLUDED.city,
  state_prov = EXCLUDED.state_prov,
  country = EXCLUDED.country,
  last_updated = NOW();
`

    console.log(sampleTeamsSQL)
    
  } else {
    console.log('✅ Using service role key, should have full permissions')
    
    // Try to insert one test team
    try {
      const { data, error } = await supabase
        .from('ftc_teams')
        .upsert({
          team_number: 99999,
          team_name: 'Test Team',
          team_name_short: 'Test Team',
          city: 'Test City',
          state_prov: 'Test State',
          country: 'USA'
        })
        .select()
      
      if (error) {
        console.error('❌ Still getting RLS error with service role:', error.message)
        console.log('\n📋 Try running this SQL in Supabase SQL Editor:')
        console.log('ALTER TABLE ftc_teams DISABLE ROW LEVEL SECURITY;')
      } else {
        console.log('✅ Successfully inserted test team!')
      }
      
    } catch (error) {
      console.error('❌ Error:', error.message)
    }
  }

  // Regardless of key type, let's test the search function
  console.log('\n🔍 Testing search function with existing data...')
  try {
    const { data: searchResult, error: searchError } = await supabase
      .rpc('search_teams', { search_term: 'test' })
    
    if (searchError) {
      console.error('❌ Search function error:', searchError.message)
      console.log('\n📋 The search_teams function might need to be created. Run this SQL:')
      console.log(`
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

GRANT EXECUTE ON FUNCTION search_teams TO authenticated, anon;
`)
    } else {
      console.log(`✅ Search function works! Found ${searchResult ? searchResult.length : 0} teams`)
      if (searchResult && searchResult.length > 0) {
        searchResult.forEach(team => {
          console.log(`   - #${team.team_number}: ${team.team_name_short}`)
        })
      }
    }
  } catch (error) {
    console.error('❌ Search test failed:', error.message)
  }
}

diagnoseRLS()
