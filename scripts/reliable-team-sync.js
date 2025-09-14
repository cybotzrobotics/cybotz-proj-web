#!/usr/bin/env node

/**
 * RELIABLE TEAM SYNC - Better error handling and verification
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)
const graphqlEndpoint = 'https://api.ftcscout.org/graphql'

// More conservative config for reliability
const CONFIG = {
  startTeam: 7278, // Start after your highest team (7277)
  endTeam: 30000,
  delayMs: 100,
  batchSize: 5, // Smaller batches for reliability
  maxRetries: 3
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
        'User-Agent': 'CybotZ-Reliable/1.0'
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
    console.log(`❌ API Error for team ${teamNumber}: ${error.message}`)
  }
  
  return null
}

/**
 * Save teams with detailed error handling and verification
 */
async function saveTeamsReliably(teams) {
  if (teams.length === 0) return { saved: 0, failed: 0 }
  
  console.log(`💾 Attempting to save ${teams.length} teams...`)
  
  let saved = 0
  let failed = 0
  
  // Try batch insert first
  try {
    const { data, error } = await supabase
      .from('ftc_teams')
      .upsert(teams, { 
        onConflict: 'team_number',
        ignoreDuplicates: false 
      })
      .select()
    
    if (error) {
      console.log(`❌ Batch error: ${error.message}`)
      console.log(`🔄 Falling back to individual inserts...`)
      
      // Fall back to individual inserts
      for (const team of teams) {
        try {
          const { data: singleData, error: singleError } = await supabase
            .from('ftc_teams')
            .upsert(team, { 
              onConflict: 'team_number',
              ignoreDuplicates: false 
            })
            .select()
          
          if (singleError) {
            console.log(`❌ Failed to save team ${team.team_number}: ${singleError.message}`)
            failed++
          } else {
            saved++
            console.log(`✅ Saved team ${team.team_number}: ${team.team_name}`)
          }
        } catch (singleErr) {
          console.log(`❌ Exception saving team ${team.team_number}: ${singleErr.message}`)
          failed++
        }
        
        // Small delay between individual inserts
        await new Promise(resolve => setTimeout(resolve, 50))
      }
    } else {
      saved = teams.length
      console.log(`✅ Batch saved ${saved} teams successfully`)
      
      // Verify they were actually saved
      const teamNumbers = teams.map(t => t.team_number)
      const { data: verification } = await supabase
        .from('ftc_teams')
        .select('team_number')
        .in('team_number', teamNumbers)
      
      const actualSaved = verification?.length || 0
      if (actualSaved !== teams.length) {
        console.log(`⚠️  Verification mismatch: Expected ${teams.length}, found ${actualSaved}`)
      }
    }
  } catch (error) {
    console.log(`❌ Critical save error: ${error.message}`)
    failed = teams.length
  }
  
  return { saved, failed }
}

/**
 * Reliable team sync with verification
 */
async function reliableTeamSync() {
  console.log('🛡️  RELIABLE TEAM SYNC WITH VERIFICATION')
  console.log(`🔍 Checking teams ${CONFIG.startTeam} to ${CONFIG.endTeam}`)
  
  // Get existing teams to skip
  console.log('📋 Loading existing teams...')
  const { data: existingTeams } = await supabase
    .from('ftc_teams')
    .select('team_number')
  
  const existingSet = new Set(existingTeams?.map(t => t.team_number) || [])
  console.log(`📋 Found ${existingSet.size} existing teams - will skip these`)
  
  // Track everything
  let teamsFound = []
  let totalFound = 0
  let totalSaved = 0
  let totalFailed = 0
  let totalChecked = 0
  let totalSkipped = 0
  
  console.log('\n🔄 Starting reliable sync...')
  
  for (let teamNum = CONFIG.startTeam; teamNum <= CONFIG.endTeam; teamNum++) {
    totalChecked++
    
    // Skip if already exists
    if (existingSet.has(teamNum)) {
      totalSkipped++
      continue
    }
    
    // Check team via API
    const team = await checkTeam(teamNum)
    
    if (team) {
      teamsFound.push(team)
      totalFound++
      console.log(`🔍 Found #${teamNum}: ${team.team_name}`)
      
      // Save when batch is full
      if (teamsFound.length >= CONFIG.batchSize) {
        const { saved, failed } = await saveTeamsReliably(teamsFound)
        totalSaved += saved
        totalFailed += failed
        
        // Update existing set with successfully saved teams
        teamsFound.slice(0, saved).forEach(t => existingSet.add(t.team_number))
        teamsFound = [] // Clear batch
        
        console.log(`📊 Running totals: Found ${totalFound}, Saved ${totalSaved}, Failed ${totalFailed}`)
      }
    }
    
    // Progress update
    if (totalChecked % 100 === 0) {
      console.log(`📈 Progress: Checked ${totalChecked}, Found ${totalFound}, Saved ${totalSaved}, Failed ${totalFailed}`)
    }
    
    await new Promise(resolve => setTimeout(resolve, CONFIG.delayMs))
    
    // Status every 1000
    if (teamNum % 1000 === 0) {
      console.log(`\n🎯 CHECKPOINT - Team ${teamNum}:`)
      console.log(`   API found: ${totalFound}`)
      console.log(`   DB saved: ${totalSaved}`)
      console.log(`   DB failed: ${totalFailed}`)
      console.log(`   Success rate: ${totalFound > 0 ? Math.round((totalSaved/totalFound)*100) : 0}%`)
      console.log('')
    }
  }
  
  // Save any remaining teams
  if (teamsFound.length > 0) {
    const { saved, failed } = await saveTeamsReliably(teamsFound)
    totalSaved += saved
    totalFailed += failed
  }
  
  // Final verification
  const { data: finalData } = await supabase
    .from('ftc_teams')
    .select('team_number')
  
  console.log('\n🎉 RELIABLE SYNC COMPLETE!')
  console.log(`📊 Final Results:`)
  console.log(`   Teams found via API: ${totalFound}`)
  console.log(`   Teams saved to DB: ${totalSaved}`)
  console.log(`   Teams failed to save: ${totalFailed}`)
  console.log(`   Success rate: ${totalFound > 0 ? Math.round((totalSaved/totalFound)*100) : 0}%`)
  console.log(`   Total in database: ${finalData?.length || 0}`)
  
  if (totalFailed > 0) {
    console.log(`\n⚠️  ${totalFailed} teams failed to save - may need to retry`)
  } else {
    console.log(`\n✅ All found teams saved successfully!`)
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', async () => {
  console.log('\n🛑 Stopping reliable sync...')
  const { data } = await supabase.from('ftc_teams').select('team_number')
  console.log(`📊 Current teams in database: ${data?.length || 0}`)
  process.exit(0)
})

reliableTeamSync().catch(console.error)