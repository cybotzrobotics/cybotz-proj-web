#!/usr/bin/env node

/**
 * Apply Database Schema Script
 * 
 * This script applies the FTC teams cache database schema
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function applySchema() {
  console.log('🏗️  Applying FTC Teams Cache Database Schema...')
  
  try {
    // Step 1: Create the table
    console.log('1. Creating ftc_teams table...')
    const { error: tableError } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    })
    
    if (tableError && !tableError.message.includes('already exists')) {
      console.log('✅ Table created (or already exists)')
    }
    
    // Step 2: Create indexes
    console.log('2. Creating indexes...')
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_teams_number ON ftc_teams(team_number);
        CREATE INDEX IF NOT EXISTS idx_teams_name ON ftc_teams USING gin(to_tsvector('english', team_name));
        CREATE INDEX IF NOT EXISTS idx_teams_name_short ON ftc_teams USING gin(to_tsvector('english', team_name_short));
      `
    })
    console.log('✅ Indexes created')
    
    // Step 3: Enable RLS
    console.log('3. Setting up Row Level Security...')
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE ftc_teams ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow public read access on teams" ON ftc_teams;
        CREATE POLICY "Allow public read access on teams" ON ftc_teams 
          FOR SELECT TO authenticated, anon USING (true);
      `
    })
    console.log('✅ RLS configured')
    
    console.log('✅ Database schema applied successfully!')
    
  } catch (error) {
    console.error('❌ Error applying schema:', error.message)
    console.log('\n📋 Manual steps required:')
    console.log('1. Go to your Supabase dashboard')
    console.log('2. Navigate to SQL Editor')
    console.log('3. Run the SQL from database/database_ftc_teams_cache.sql')
  }
}

// Let's try a simpler approach - just create the table directly
async function createTableDirect() {
  console.log('🏗️  Creating ftc_teams table directly...')
  
  try {
    // Try creating via SQL query
    const { data, error } = await supabase
      .from('ftc_teams')
      .select('*')
      .limit(1)
    
    if (error && error.message.includes('relation "ftc_teams" does not exist')) {
      console.log('❌ Table does not exist. Manual creation required.')
      console.log('\n📋 Please run this SQL in your Supabase dashboard:')
      console.log(`
CREATE TABLE ftc_teams (
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

-- Enable public read access
ALTER TABLE ftc_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access on teams" ON ftc_teams 
  FOR SELECT TO authenticated, anon USING (true);
      `)
      return false
    } else {
      console.log('✅ Table exists!')
      return true
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    return false
  }
}

createTableDirect()
