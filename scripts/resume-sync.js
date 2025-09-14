#!/usr/bin/env node

/**
 * Resume FTC Teams Sync
 * 
 * This script intelligently resumes syncing from where we left off,
 * avoiding duplicates and focusing on gaps in the data
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
 * Find gaps in the database and resume from there
 */
async function findNextRange() {
  console.log('🔍 Analyzing database to find optimal resume point...')
  
  const { data: existingTeams, error } = await supabase
    .from('ftc_teams')
    .select('team_number')
    .order('team_number')
  
  if (error) {
    console.error('❌ Error reading database:', error)
    return [3000, 6000] // Default fallback
  }
  
  if (!existingTeams || existingTeams.length === 0) {
    console.log('📋 Database is empty, starting from beginning')
    return [1, 1000]
  }
  
  const numbers = existingTeams.map(t => t.team_number).sort((a, b) => a - b)
  const maxNumber = Math.max(...numbers)
  const minNumber = Math.min(...numbers)
  
  console.log(`📊 Current database status:`)
  console.log(`   Teams in database: ${numbers.length}`)
  console.log(`   Range: ${minNumber} - ${maxNumber}`)
  
  // Define potential ranges
  const ranges = [
    [1, 1000],
    [1000, 3000], 
    [3000, 6000],
    [6000, 10000],
    [10000, 15000],
    [15000, 20000],
    [20000, 25000]
  ]
  
  // Find the range with the most gaps or start the next empty range
  for (const [start, end] of ranges) {
    const teamsInRange = numbers.filter(n => n >= start && n <= end)
    const coverage = teamsInRange.length / (end - start + 1)
    
    console.log(`   Range ${start}-${end}: ${teamsInRange.length} teams (${(coverage * 100).toFixed(1)}% coverage)`)
    
    // If this range has less than 80% coverage, continue it
    if (coverage < 0.8) {
      console.log(`🎯 Resuming range ${start}-${end} (${(coverage * 100).toFixed(1)}% complete)`)
      return [start, end]
    }
  }
  
  // If all ranges are well covered, start the next range after max
  const nextStart = Math.max(maxNumber + 1, 3000)
  const nextEnd = Math.min(nextStart + 3000, 25000)
  
  console.log(`🚀 All ranges well covered, starting new range: ${nextStart}-${nextEnd}`)
  return [nextStart, nextEnd]
}

/**
 * Resume sync from optimal point
 */
async function resumeSync() {
  console.log('🔄 Starting intelligent resume sync...')
  console.log(`Time: ${new Date().toISOString()}`)
  
  try {
    const [start, end] = await findNextRange()
    
    // Get existing teams in this range to skip
    const { data: existingInRange } = await supabase
      .from('ftc_teams')
      .select('team_number')
      .gte('team_number', start)
      .lte('team_number', end)
    
    const existingSet = new Set(existingInRange?.map(t => t.team_number) || [])
    console.log(`📋 Found ${existingSet.size} existing teams in range ${start}-${end}`)
    
    const teams = []
    let checked = 0
    let found = 0
    let skipped = 0
    
    console.log(`📡 Fetching teams ${start}-${end} (skipping existing)...`)
    
    for (let i = start; i <= end && teams.length < 300; i++) {
      checked++
      
      if (existingSet.has(i)) {
        skipped++
        continue
      }
      
      const team = await getTeamByNumber(i)
      
      if (team) {
        teams.push(team)
        found++
        console.log(`   ✅ #${team.team_number}: ${team.team_name}`)
      }
      
      if (checked % 50 === 0) {
        console.log(`   📊 Progress: Checked ${checked}/${end-start+1}, Found ${found} new, Skipped ${skipped} existing`)
      }
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 75))
    }
    
    console.log(`✅ Fetching complete: Found ${found} new teams, skipped ${skipped} existing`)
    
    // Add teams to database
    if (teams.length > 0) {
      console.log(`💾 Adding ${teams.length} teams to database...`)
      
      for (let i = 0; i < teams.length; i += 20) {
        const batch = teams.slice(i, i + 20)
        
        const { data, error } = await supabase
          .from('ftc_teams')
          .upsert(batch, { 
            onConflict: 'team_number',
            ignoreDuplicates: false 
          })
          .select()
        
        if (error) {
          console.error(`❌ Batch error:`, error.message)
        } else {
          console.log(`   ✅ Batch ${Math.floor(i/20) + 1}: Added ${batch.length} teams`)
        }
        
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    // Final status
    const { data: finalData } = await supabase
      .from('ftc_teams')
      .select('team_number')
    
    console.log(`🎉 Resume sync completed!`)
    console.log(`📊 Total teams now in database: ${finalData?.length || 0}`)
    console.log(`📈 Added ${teams.length} new teams this run`)
    
  } catch (error) {
    console.error('❌ Resume sync failed:', error.message)
  }
}

resumeSync()