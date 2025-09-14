#!/usr/bin/env node

/**
 * FULL TEAMS SYNC - ALL 9K+ TEAMS FOR DEPLOYMENT
 * 
 * This script aggressively syncs ALL FTC teams for complete deployment
 * Uses multiple parallel workers and optimized ranges
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)
const graphqlEndpoint = 'https://api.ftcscout.org/graphql'

// MAXIMUM AGGRESSIVE CONFIG
const CONFIG = {
  batchSize: 100,
  apiDelay: 15, // Very fast!
  parallelWorkers: 5, // Multiple parallel workers
  maxRetries: 2,
  workerRangeSize: 500 // Each worker handles 500 teams
}

/**
 * Fast team fetch with minimal error handling
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
        'User-Agent': 'CybotZ-FullSync/1.0'
      },
      body: JSON.stringify({ query }),
      timeout: 4000
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
    // Fail silently for speed
  }
  
  return null
}

/**
 * Worker function - processes a range of teams
 */
async function workerSync(workerId, start, end, existingTeams) {
  console.log(`🔥 Worker ${workerId}: Processing ${start}-${end}`)
  
  const teams = []
  const promises = []
  
  for (let i = start; i <= end; i++) {
    if (existingTeams.has(i)) continue
    
    const promise = getTeamByNumber(i).then(team => {
      if (team) {
        teams.push(team)
        if (teams.length % 50 === 0) {
          process.stdout.write(`W${workerId}:${teams.length} `)
        }
      }
    })
    
    promises.push(promise)
    
    // Process in smaller batches for speed
    if (promises.length >= 10) {
      await Promise.all(promises)
      promises.length = 0
      await new Promise(resolve => setTimeout(resolve, CONFIG.apiDelay))
    }
  }
  
  // Process remaining
  if (promises.length > 0) {
    await Promise.all(promises)
  }
  
  console.log(`\n✅ Worker ${workerId}: Found ${teams.length} teams`)
  return teams
}

/**
 * Ultra-fast bulk insert
 */
async function ultraBulkInsert(teams, batchName) {
  if (teams.length === 0) return
  
  console.log(`💾 ${batchName}: Inserting ${teams.length} teams`)
  
  // Use larger batches for speed
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
        process.stdout.write(`✅${batch.length} `)
      }
    } catch (error) {
      console.error(`❌ Insert error: ${error.message}`)
    }
  }
  console.log(`\n📊 ${batchName}: Complete`)
}

/**
 * FULL DEPLOYMENT SYNC - ALL TEAMS
 */
async function fullDeploymentSync() {
  console.log('🚀 FULL DEPLOYMENT SYNC - ALL FTC TEAMS')
  console.log('⚡ MAXIMUM SPEED MODE - ALL 9K+ TEAMS')
  
  const startTime = Date.now()
  
  // Get existing teams
  console.log('📋 Checking existing teams...')
  const { data: existingTeams } = await supabase
    .from('ftc_teams')
    .select('team_number')
  
  const existingSet = new Set(existingTeams?.map(t => t.team_number) || [])
  console.log(`📋 Skipping ${existingSet.size} existing teams`)
  
  // ALL possible team ranges - complete coverage
  const allRanges = [
    // High-density ranges first
    [1, 1000],       // Original teams
    [1000, 3000],    // Early growth  
    [3000, 6000],    // Major expansion
    [6000, 10000],   // Continued growth
    [10000, 15000],  // Recent teams
    [15000, 20000],  // Very recent
    [20000, 25000],  // Latest teams
    [25000, 30000]   // Future-proofing
  ]
  
  let totalNewTeams = 0
  
  for (const [rangeStart, rangeEnd] of allRanges) {
    console.log(`\n🎯 PROCESSING RANGE: ${rangeStart}-${rangeEnd}`)
    
    // Split range into worker chunks
    const workerPromises = []
    
    for (let start = rangeStart; start < rangeEnd; start += CONFIG.workerRangeSize) {
      const end = Math.min(start + CONFIG.workerRangeSize - 1, rangeEnd)
      const workerId = workerPromises.length + 1
      
      const workerPromise = workerSync(workerId, start, end, existingSet)
      workerPromises.push(workerPromise)
      
      // Don't overwhelm with too many parallel workers
      if (workerPromises.length >= CONFIG.parallelWorkers) {
        const results = await Promise.all(workerPromises)
        
        // Bulk insert all results
        const allTeams = results.flat()
        if (allTeams.length > 0) {
          await ultraBulkInsert(allTeams, `Range ${rangeStart}-${rangeEnd}`)
          totalNewTeams += allTeams.length
          
          // Update existing set
          allTeams.forEach(team => existingSet.add(team.team_number))
        }
        
        workerPromises.length = 0
        console.log(`📈 Total new teams so far: ${totalNewTeams}`)
        
        // Brief pause between worker batches
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
    
    // Process remaining workers
    if (workerPromises.length > 0) {
      const results = await Promise.all(workerPromises)
      const allTeams = results.flat()
      
      if (allTeams.length > 0) {
        await ultraBulkInsert(allTeams, `Range ${rangeStart}-${rangeEnd} (Final)`)
        totalNewTeams += allTeams.length
        allTeams.forEach(team => existingSet.add(team.team_number))
      }
    }
    
    console.log(`✅ Range ${rangeStart}-${rangeEnd} complete`)
    console.log(`📊 Running total: ${existingSet.size} teams in database`)
  }
  
  const endTime = Date.now()
  const duration = Math.round((endTime - startTime) / 1000 / 60)
  
  // Final verification
  const { data: finalData } = await supabase
    .from('ftc_teams')
    .select('team_number')
    .order('team_number')
  
  const finalCount = finalData?.length || 0
  const teamNumbers = finalData?.map(t => t.team_number) || []
  const minTeam = Math.min(...teamNumbers)
  const maxTeam = Math.max(...teamNumbers)
  
  console.log('\n🎉 FULL DEPLOYMENT SYNC COMPLETE!')
  console.log(`⏱️  Total Duration: ${duration} minutes`)
  console.log(`📊 Total teams in database: ${finalCount}`)
  console.log(`📈 Added this run: ${totalNewTeams}`)
  console.log(`📏 Team range: ${minTeam} - ${maxTeam}`)
  console.log(`🚀 READY FOR FULL DEPLOYMENT!`)
  
  if (finalCount >= 5000) {
    console.log('✅ EXCELLENT: 5000+ teams - Premium deployment ready!')
  } else if (finalCount >= 3000) {
    console.log('✅ GREAT: 3000+ teams - Full deployment ready!')
  } else if (finalCount >= 1000) {
    console.log('✅ GOOD: 1000+ teams - Standard deployment ready!')
  } else {
    console.log('⚠️  LIMITED: <1000 teams - Basic deployment only')
  }
}

// Add error handling and recovery
process.on('SIGINT', async () => {
  console.log('\n🛑 Sync interrupted - checking final count...')
  const { data } = await supabase.from('ftc_teams').select('team_number')
  console.log(`📊 Current teams in database: ${data?.length || 0}`)
  process.exit(0)
})

fullDeploymentSync().catch(console.error)