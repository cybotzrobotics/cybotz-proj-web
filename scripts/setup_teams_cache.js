#!/usr/bin/env node

/**
 * Setup Script for FTC Teams Cache
 * 
 * This script sets up and tests the FTC teams cache system:
 * 1. Tests database connection
 * 2. Creates database schema
 * 3. Syncs team data from APIs
 * 4. Validates the setup
 * 
 * Usage: node scripts/setup_teams_cache.js
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  console.log('Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * Test database connection
 */
async function testConnection() {
  console.log('🔗 Testing database connection...')
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('count(*)', { count: 'exact' })
      .limit(1)
    
    if (error && !error.message.includes('relation "profiles" does not exist')) {
      throw error
    }
    
    console.log('✅ Database connection successful')
    return true
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
    return false
  }
}

/**
 * Check if teams table exists
 */
async function checkTeamsTable() {
  console.log('🔍 Checking if ftc_teams table exists...')
  
  try {
    const { data, error } = await supabase
      .from('ftc_teams')
      .select('count(*)', { count: 'exact' })
      .limit(1)
    
    if (error) {
      if (error.message.includes('relation "ftc_teams" does not exist')) {
        console.log('⚠️  ftc_teams table does not exist')
        return false
      }
      throw error
    }
    
    console.log(`✅ ftc_teams table exists with ${data?.[0]?.count || 0} teams`)
    return true
    
  } catch (error) {
    console.error('❌ Error checking teams table:', error.message)
    return false
  }
}

/**
 * Test the search function
 */
async function testSearchFunction() {
  console.log('🔍 Testing search_teams function...')
  
  try {
    const { data, error } = await supabase
      .rpc('search_teams', { search_term: '12345' })
    
    if (error) {
      console.log('⚠️  search_teams function not available:', error.message)
      return false
    }
    
    console.log(`✅ search_teams function working (found ${data?.length || 0} results for test)`)
    return true
    
  } catch (error) {
    console.error('❌ Error testing search function:', error.message)
    return false
  }
}

/**
 * Create database schema from SQL file
 */
async function createSchema() {
  console.log('🏗️  Creating database schema...')
  
  try {
    const sqlPath = path.join(__dirname, '..', 'database', 'database_ftc_teams_cache.sql')
    
    if (!fs.existsSync(sqlPath)) {
      console.error('❌ SQL file not found:', sqlPath)
      return false
    }
    
    const sqlContent = fs.readFileSync(sqlPath, 'utf8')
    console.log('📄 SQL file loaded, executing...')
    console.log('⚠️  Note: You may need to run this SQL manually in your Supabase dashboard')
    console.log('📍 SQL file location:', sqlPath)
    console.log('\n--- SQL Content ---')
    console.log(sqlContent)
    console.log('--- End SQL ---\n')
    
    return true
    
  } catch (error) {
    console.error('❌ Error creating schema:', error.message)
    return false
  }
}

/**
 * Run basic sync test
 */
async function testSync() {
  console.log('🔄 Testing team sync (small batch)...')
  
  try {
    // Try to fetch just a few teams for testing
    const response = await fetch('https://theorangealliance.org/api/team')
    
    if (!response.ok) {
      console.log('⚠️  Orange Alliance API not available, this is normal')
      return true
    }
    
    const teams = await response.json()
    console.log(`✅ API connection successful (${teams.length} teams available)`)
    
    if (teams.length > 0) {
      // Test inserting one team
      const testTeam = teams[0]
      const { error } = await supabase
        .from('ftc_teams')
        .upsert({
          team_number: testTeam.team_number,
          team_name: testTeam.team_name_long || testTeam.team_name_short || `Team ${testTeam.team_number}`,
          team_name_short: testTeam.team_name_short || testTeam.team_name_long || `Team ${testTeam.team_number}`,
          city: testTeam.city,
          state_prov: testTeam.state_prov,
          country: testTeam.country,
          last_updated: new Date().toISOString()
        })
      
      if (error) {
        console.log('⚠️  Could not insert test team:', error.message)
        return false
      }
      
      console.log(`✅ Test team insert successful (team ${testTeam.team_number})`)
    }
    
    return true
    
  } catch (error) {
    console.error('❌ Error testing sync:', error.message)
    return false
  }
}

/**
 * Main setup function
 */
async function setupTeamsCache() {
  console.log('🚀 Starting FTC Teams Cache Setup')
  console.log('==================================\n')
  
  // Test connection
  const connectionOk = await testConnection()
  if (!connectionOk) {
    console.log('\n❌ Setup failed: Database connection issue')
    process.exit(1)
  }
  
  // Check if table exists
  const tableExists = await checkTeamsTable()
  
  if (!tableExists) {
    console.log('\n📋 Database schema needs to be created')
    await createSchema()
    console.log('\n⚠️  Please run the SQL commands in your Supabase dashboard, then run this script again')
    process.exit(0)
  }
  
  // Test search function
  const searchOk = await testSearchFunction()
  if (!searchOk) {
    console.log('\n⚠️  Search function not available. Please run the SQL schema first.')
  }
  
  // Test sync
  const syncOk = await testSync()
  
  console.log('\n📊 Setup Summary')
  console.log('================')
  console.log(`Database Connection: ${connectionOk ? '✅' : '❌'}`)
  console.log(`Teams Table: ${tableExists ? '✅' : '❌'}`)
  console.log(`Search Function: ${searchOk ? '✅' : '❌'}`)
  console.log(`API Sync Test: ${syncOk ? '✅' : '❌'}`)
  
  if (connectionOk && tableExists && searchOk) {
    console.log('\n🎉 Setup completed successfully!')
    console.log('\nNext steps:')
    console.log('1. Run: node scripts/sync_ftc_teams.js')
    console.log('2. Test registration form search functionality')
  } else {
    console.log('\n⚠️  Setup incomplete. Please address the issues above.')
  }
}

// Run setup if called directly
if (require.main === module) {
  setupTeamsCache().catch(error => {
    console.error('Setup failed:', error)
    process.exit(1)
  })
}

module.exports = { setupTeamsCache, testConnection, checkTeamsTable }