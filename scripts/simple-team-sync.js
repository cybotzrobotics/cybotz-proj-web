#!/usr/bin/env node

/**
 * SIMPLE TEAM-BY-TEAM SYNC
 * 
 * Goes through team numbers 1, 2, 3, 4... and checks each one
 * Skips teams already in database
 * Simple and reliable!
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)
const graphqlEndpoint = 'https://api.ftcscout.org/graphql'

// Simple config
const CONFIG = {
  startTeam: 3000, // Start after your existing teams (you have up to 2997)
  endTeam: 30000,
  delayMs: 50, // Faster - 50ms between each team check
  batchSize: 10 // Save to DB every 10 teams found
}

/**
 * Check if a single team exists via API
 */
async function checkTeam(teamNumber) {
  const query = `
    query {
      teamByNumber(number: ${teamNumber}) {
        number
        name
        location {
          city
          state
          country
        }
      }
    }
  `
  
  try {
    const response = await fetch(graphqlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CybotZ-Simple/1.0'
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
    console.log(`❌ Error checking team ${teamNumber}: ${error.message}`)
  }
  
  return null
}

/**
 * Save teams to database
 */
async function saveTeams(teams) {
  if (teams.length === 0) return
  
  try {
    const { data, error } = await supabase
      .from('ftc_teams')
      .upsert(teams, { 
        onConflict: 'team_number',
        ignoreDuplicates: false 
      })
      .select()
    
    if (error) {
      console.log(`❌ Database error: ${error.message}`)
    } else {
      console.log(`💾 Saved ${teams.length} teams to database`)
    }
  } catch (error) {
    console.log(`❌ Save error: ${error.message}`)
  }
}

/**
 * Main sync - go team by team
 */
async function teamByTeamSync() {
  console.log('🚀 SIMPLE TEAM-BY-TEAM SYNC')
  console.log(`🔍 Checking teams ${CONFIG.startTeam} to ${CONFIG.endTeam}`)
  
  // Get existing teams to skip
  console.log('📋 Loading existing teams...')
  const { data: existingTeams } = await supabase
    .from('ftc_teams')
    .select('team_number')
  
  const existingSet = new Set(existingTeams?.map(t => t.team_number) || [])
  console.log(`📋 Found ${existingSet.size} existing teams - will skip these`)
  
  // Start syncing
  let teamsFound = []
  let totalFound = 0
  let totalChecked = 0
  let totalSkipped = 0
  
  console.log('\n🔄 Starting team-by-team check...')
  
  for (let teamNum = CONFIG.startTeam; teamNum <= CONFIG.endTeam; teamNum++) {
    totalChecked++
    
    // Skip if already in database
    if (existingSet.has(teamNum)) {
      totalSkipped++
      
      // Show progress every 100 skipped
      if (totalSkipped % 100 === 0) {
        console.log(`⏭️  Skipped ${totalSkipped} existing teams (currently at team ${teamNum})`)
      }
      continue
    }
    
    // Check if team exists
    const team = await checkTeam(teamNum)
    
    if (team) {
      teamsFound.push(team)
      totalFound++
      console.log(`✅ #${teamNum}: ${team.team_name}`)
      
      // Save batch when we have enough
      if (teamsFound.length >= CONFIG.batchSize) {
        await saveTeams(teamsFound)
        
        // Add to existing set so we don't check them again
        teamsFound.forEach(t => existingSet.add(t.team_number))
        teamsFound = [] // Clear the batch
      }
    } else {
      // Show progress every 50 checks
      if (totalChecked % 50 === 0) {
        console.log(`📊 Progress: Checked ${totalChecked}, Found ${totalFound}, Skipped ${totalSkipped}`)
      }
    }
    
    // Small delay to be nice to API
    await new Promise(resolve => setTimeout(resolve, CONFIG.delayMs))
    
    // Show status every 1000 teams
    if (teamNum % 1000 === 0) {
      console.log(`\n📈 STATUS UPDATE - Team ${teamNum}:`)
      console.log(`   Teams found this run: ${totalFound}`)
      console.log(`   Teams skipped (existing): ${totalSkipped}`)
      console.log(`   Total in database: ${existingSet.size}`)
      console.log('')
    }
  }
  
  // Save any remaining teams
  if (teamsFound.length > 0) {
    await saveTeams(teamsFound)
  }
  
  // Final report
  const { data: finalData } = await supabase
    .from('ftc_teams')
    .select('team_number')
  
  console.log('\n🎉 SYNC COMPLETE!')
  console.log(`📊 Final Results:`)
  console.log(`   Teams checked: ${totalChecked}`)
  console.log(`   New teams found: ${totalFound}`)
  console.log(`   Teams skipped (existing): ${totalSkipped}`)
  console.log(`   Total teams in database: ${finalData?.length || 0}`)
  console.log(`✅ Ready for deployment!`)
}

// Handle Ctrl+C gracefully
process.on('SIGINT', async () => {
  console.log('\n🛑 Stopping sync...')
  const { data } = await supabase.from('ftc_teams').select('team_number')
  console.log(`📊 Current teams in database: ${data?.length || 0}`)
  process.exit(0)
})

teamByTeamSync().catch(console.error)