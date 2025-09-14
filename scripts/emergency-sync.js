#!/usr/bin/env node

/**
 * EMERGENCY RAPID SYNC - For urgent deployment
 * 
 * This script aggressively syncs teams for rapid deployment
 * WARNING: Uses higher API rates - only use for urgent situations
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)
const graphqlEndpoint = 'https://api.ftcscout.org/graphql'

// AGGRESSIVE CONFIG FOR EMERGENCY
const CONFIG = {
  batchSize: 50,
  apiDelay: 25, // Much faster!
  maxTeamsPerRun: 1000, // Much higher!
  parallelRequests: 3 // Multiple requests at once
}

/**
 * Get team data with minimal delay
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
      }
    }
  `
  
  try {
    const response = await fetch(graphqlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CybotZ-Emergency-Sync/1.0'
      },
      body: JSON.stringify({ query }),
      timeout: 5000
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
    // Silently fail for speed
  }
  
  return null
}

/**
 * Parallel team fetching for speed
 */
async function getTeamsInRangeParallel(start, end, existingTeams) {
  console.log(`🚀 RAPID SYNC: Range ${start}-${end}`)
  
  const teams = []
  const promises = []
  
  for (let i = start; i <= end && teams.length < CONFIG.maxTeamsPerRun; i++) {
    if (existingTeams.has(i)) continue
    
    const promise = getTeamByNumber(i).then(team => {
      if (team) {
        teams.push(team)
        process.stdout.write(`✅ #${team.team_number} `)
      }
    })
    
    promises.push(promise)
    
    // Process in batches to avoid overwhelming
    if (promises.length >= CONFIG.parallelRequests) {
      await Promise.all(promises)
      promises.length = 0
      await new Promise(resolve => setTimeout(resolve, CONFIG.apiDelay))
    }
  }
  
  // Process remaining promises
  if (promises.length > 0) {
    await Promise.all(promises)
  }
  
  console.log(`\n📊 Found ${teams.length} teams in range ${start}-${end}`)
  return teams
}

/**
 * Emergency bulk database insert
 */
async function bulkInsert(teams) {
  console.log(`💾 BULK INSERT: ${teams.length} teams`)
  
  for (let i = 0; i < teams.length; i += CONFIG.batchSize) {
    const batch = teams.slice(i, i + CONFIG.batchSize)
    
    try {
      const { error } = await supabase
        .from('ftc_teams')
        .upsert(batch, { 
          onConflict: 'team_number',
          ignoreDuplicates: false 
        })
      
      if (!error) {
        console.log(`   ✅ Batch ${Math.floor(i/CONFIG.batchSize) + 1}: ${batch.length} teams`)
      }
    } catch (error) {
      console.error(`   ❌ Batch error: ${error.message}`)
    }
  }
}

/**
 * EMERGENCY SYNC - Multiple ranges in parallel
 */
async function emergencySync() {
  console.log('🚨 EMERGENCY RAPID SYNC STARTING!')
  console.log('⚡ WARNING: Using aggressive API rates for urgent deployment')
  
  const startTime = Date.now()
  
  // Get existing teams
  const { data: existingTeams } = await supabase
    .from('ftc_teams')
    .select('team_number')
  
  const existingSet = new Set(existingTeams?.map(t => t.team_number) || [])
  console.log(`📋 Skipping ${existingSet.size} existing teams`)
  
  // Priority ranges (most likely to have active teams)
  const priorityRanges = [
    [3000, 5000],    // High activity range
    [5000, 8000],    // High activity range  
    [8000, 12000],   // High activity range
    [12000, 16000],  // Medium activity
    [16000, 20000],  // Recent teams
    [1000, 3000],    // Fill gaps in existing
    [20000, 24000]   // Very recent teams
  ]
  
  let totalTeams = 0
  
  for (const [start, end] of priorityRanges) {
    const teams = await getTeamsInRangeParallel(start, end, existingSet)
    
    if (teams.length > 0) {
      await bulkInsert(teams)
      totalTeams += teams.length
      
      // Update existing set
      teams.forEach(team => existingSet.add(team.team_number))
    }
    
    console.log(`📈 Total teams synced so far: ${totalTeams}`)
    
    // Quick break between ranges
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Stop if we have enough teams for deployment
    if (totalTeams >= 3000) {
      console.log('🎯 Reached 3000+ teams - sufficient for deployment!')
      break
    }
  }
  
  const endTime = Date.now()
  const duration = Math.round((endTime - startTime) / 1000 / 60)
  
  // Final count
  const { data: finalData } = await supabase
    .from('ftc_teams')
    .select('team_number')
  
  console.log('\n🎉 EMERGENCY SYNC COMPLETE!')
  console.log(`⏱️  Duration: ${duration} minutes`)
  console.log(`📊 Total teams in database: ${finalData?.length || 0}`)
  console.log(`📈 Added this run: ${totalTeams}`)
  console.log('✅ Ready for deployment!')
}

emergencySync().catch(console.error)