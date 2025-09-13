#!/usr/bin/env node

/**
 * GraphQL-based FTC Teams Sync Script
 * 
 * This script uses the working FTCScout GraphQL API to populate the database
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const graphqlEndpoint = 'https://api.ftcscout.org/graphql'

/**
 * Get team data from FTCScout GraphQL API
 */
async function getTeamByNumber(number) {
  const query = `
    query {
      teamByNumber(number: ${number}) {
        number
        name
        location {
          city
          state
          country
        }
        rookieYear
        website
      }
    }
  `
  
  try {
    const response = await fetch(graphqlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CybotZ-Quiz-App/1.0'
      },
      body: JSON.stringify({ query })
    })
    
    if (response.ok) {
      const result = await response.json()
      
      if (result.data && result.data.teamByNumber) {
        const team = result.data.teamByNumber
        return {
          team_number: team.number,
          team_name: team.name,
          team_name_short: team.name,
          city: team.location?.city,
          state_prov: team.location?.state,
          country: team.location?.country
        }
      }
    }
  } catch (error) {
    console.error(`Error getting team ${number}:`, error.message)
  }
  
  return null
}

/**
 * Get teams in a range
 */
async function getTeamsInRange(start, end, delay = 150) {
  console.log(`📡 Fetching teams ${start}-${end}...`)
  const teams = []
  let found = 0
  let checked = 0
  
  for (let i = start; i <= end; i++) {
    checked++
    const team = await getTeamByNumber(i)
    
    if (team) {
      teams.push(team)
      found++
      console.log(`   ✅ #${team.team_number}: ${team.team_name}`)
    }
    
    // Progress indicator every 50 checks
    if (checked % 50 === 0) {
      console.log(`   📊 Progress: Checked ${checked}/${end - start + 1}, Found ${found} teams`)
    }
    
    // Be nice to the API
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  console.log(`✅ Range ${start}-${end}: Found ${found} teams out of ${checked} checked`)
  return teams
}

/**
 * Add teams to database
 */
async function addTeamsToDatabase(teams) {
  console.log(`💾 Adding ${teams.length} teams to database...`)
  
  let added = 0
  let updated = 0
  let errors = 0
  
  // Process teams in batches of 10
  for (let i = 0; i < teams.length; i += 10) {
    const batch = teams.slice(i, i + 10)
    
    try {
      const { data, error } = await supabase
        .from('ftc_teams')
        .upsert(batch, { 
          onConflict: 'team_number',
          ignoreDuplicates: false 
        })
        .select()
      
      if (error) {
        console.error(`❌ Batch error:`, error.message)
        errors += batch.length
      } else {
        added += batch.length
        console.log(`   ✅ Batch ${Math.floor(i/10) + 1}: Added ${batch.length} teams`)
      }
      
    } catch (error) {
      console.error(`❌ Database error:`, error.message)
      errors += batch.length
    }
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  console.log(`📊 Database update complete:`)
  console.log(`   ✅ Added/Updated: ${added}`)
  console.log(`   ❌ Errors: ${errors}`)
  
  return { added, errors }
}

/**
 * Main sync function
 */
async function syncTeamsGraphQL() {
  console.log('🚀 Starting GraphQL-based FTC teams sync...')
  console.log(`Time: ${new Date().toISOString()}`)
  
  try {
    // Test database connection with simple query
    const { data: testData, error: testError } = await supabase
      .from('ftc_teams')
      .select('*')
      .limit(1)
    
    if (testError && !testError.message.includes('relation "ftc_teams" does not exist')) {
      console.error('❌ Database connection failed:', testError.message)
      return
    }
    
    console.log('✅ Database connection successful')
    console.log(`Current teams in database: ${testData ? testData.length : 0} (sample check)`)
    
    // Get actual count
    const { data: countData, error: countError } = await supabase
      .from('ftc_teams')
      .select('team_number')
    
    const currentCount = countData ? countData.length : 0
    console.log(`Total teams currently in database: ${currentCount}`)
    
    // Define ranges to check (common FTC team number ranges)
    const ranges = [
      [1, 1000],        // Early teams
      [1000, 3000],     // Common range
      [3000, 6000],     // Another common range  
      [6000, 10000],    // Mid-range teams
      [10000, 15000],   // Newer teams
      [15000, 20000],   // Recent teams
      [20000, 25000]    // Very recent teams
    ]
    
    const allTeams = []
    
    // Process each range
    for (const [start, end] of ranges.slice(0, 3)) { // Start with first 3 ranges
      const rangeTeams = await getTeamsInRange(start, end, 100) // 100ms delay
      allTeams.push(...rangeTeams)
      
      // Add teams to database after each range
      if (rangeTeams.length > 0) {
        await addTeamsToDatabase(rangeTeams)
      }
      
      console.log(`📊 Total teams collected so far: ${allTeams.length}`)
      
      // Break if we have a good amount of teams (to avoid long running times)
      if (allTeams.length >= 500) {
        console.log('🛑 Stopping at 500 teams for this sync run')
        break
      }
    }
    
    console.log(`\n🎉 Sync completed!`)
    console.log(`📊 Total teams synced: ${allTeams.length}`)
    
    // Test the search function
    console.log('\n🔍 Testing search function...')
    const { data: searchResult, error: searchError } = await supabase
      .rpc('search_teams', { search_term: 'cyber' })
    
    if (searchError) {
      console.error('❌ Search function error:', searchError.message)
    } else {
      console.log(`✅ Search test: Found ${searchResult ? searchResult.length : 0} teams with "cyber"`)
      if (searchResult && searchResult.length > 0) {
        searchResult.slice(0, 3).forEach(team => {
          console.log(`   - #${team.team_number}: ${team.team_name_short}`)
        })
      }
    }
    
  } catch (error) {
    console.error('❌ Sync failed:', error.message)
  }
}

// Run the sync
syncTeamsGraphQL()
