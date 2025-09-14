#!/usr/bin/env node

/**
 * Persistent FTC Teams Sync Service for Raspberry Pi
 * 
 * This script runs continuously and syncs teams at specified intervals
 * Includes proper error handling, logging, and graceful shutdown
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const graphqlEndpoint = 'https://api.ftcscout.org/graphql'

// Configuration
const CONFIG = {
  syncInterval: 6 * 60 * 60 * 1000, // 6 hours in milliseconds
  batchSize: 20, // Increased batch size for better efficiency
  apiDelay: 50, // Reduced delay since we're skipping duplicates
  maxTeamsPerRun: 300, // Increased since we skip duplicates
  logFile: '/var/log/ftc-teams-sync.log',
  duplicateCheckBatchSize: 1000 // Check for existing teams in batches
}

let isRunning = false
let syncTimeout = null

/**
 * Enhanced logging with timestamps
 */
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] [${level}] ${message}`
  
  console.log(logMessage)
  
  // Also write to log file if possible
  try {
    fs.appendFileSync(CONFIG.logFile, logMessage + '\n')
  } catch (error) {
    // Fallback to local log file if /var/log is not writable
    try {
      const localLogFile = path.join(__dirname, 'teams-sync.log')
      fs.appendFileSync(localLogFile, logMessage + '\n')
    } catch (localError) {
      // If even local logging fails, just continue
    }
  }
}

/**
 * Get team data from FTCScout GraphQL API with retries
 */
async function getTeamByNumber(number, retries = 3) {
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
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(graphqlEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'CybotZ-Quiz-App/1.0'
        },
        body: JSON.stringify({ query }),
        timeout: 10000 // 10 second timeout
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
      if (attempt === retries) {
        log(`Error getting team ${number} after ${retries} attempts: ${error.message}`, 'ERROR')
      } else {
        log(`Attempt ${attempt} failed for team ${number}, retrying...`, 'WARN')
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)) // Exponential backoff
      }
    }
  }
  
  return null
}

/**
 * Check which teams already exist in database for a given range
 */
async function getExistingTeamsInRange(start, end) {
  try {
    const { data: existingTeams, error } = await supabase
      .from('ftc_teams')
      .select('team_number')
      .gte('team_number', start)
      .lte('team_number', end)
    
    if (error) {
      log(`❌ Error checking existing teams: ${error.message}`, 'ERROR')
      return new Set()
    }
    
    return new Set(existingTeams.map(team => team.team_number))
  } catch (error) {
    log(`❌ Error checking existing teams: ${error.message}`, 'ERROR')
    return new Set()
  }
}

/**
 * Get teams in a range with progress tracking and duplicate checking
 */
async function getTeamsInRange(start, end) {
  log(`📡 Fetching teams ${start}-${end}...`)
  
  // First, check which teams already exist in this range
  const existingTeams = await getExistingTeamsInRange(start, end)
  log(`   📋 Found ${existingTeams.size} existing teams in range ${start}-${end}`)
  
  const teams = []
  let found = 0
  let checked = 0
  let skipped = 0
  
  for (let i = start; i <= end && teams.length < CONFIG.maxTeamsPerRun; i++) {
    if (!isRunning) {
      log('Service stopping, interrupting team fetch', 'INFO')
      break
    }
    
    checked++
    
    // Skip if team already exists in database
    if (existingTeams.has(i)) {
      skipped++
      continue
    }
    
    const team = await getTeamByNumber(i)
    
    if (team) {
      teams.push(team)
      found++
      log(`   ✅ #${team.team_number}: ${team.team_name}`)
    }
    
    // Progress indicator every 25 checks
    if (checked % 25 === 0) {
      log(`   📊 Progress: Checked ${checked}, Found ${found} new teams, Skipped ${skipped} existing`)
    }
    
    // Be nice to the API
    await new Promise(resolve => setTimeout(resolve, CONFIG.apiDelay))
  }
  
  log(`✅ Range ${start}-${end}: Found ${found} new teams out of ${checked} checked (skipped ${skipped} existing)`)
  return teams
}

/**
 * Add teams to database with enhanced duplicate handling
 */
async function addTeamsToDatabase(teams) {
  if (teams.length === 0) {
    log('📋 No new teams to add to database')
    return { added: 0, errors: 0 }
  }
  
  log(`💾 Adding ${teams.length} teams to database...`)
  
  let added = 0
  let updated = 0
  let errors = 0
  
  // Process teams in batches
  for (let i = 0; i < teams.length; i += CONFIG.batchSize) {
    if (!isRunning) {
      log('Service stopping, interrupting database insert', 'INFO')
      break
    }
    
    const batch = teams.slice(i, i + CONFIG.batchSize)
    
    try {
      // Use upsert with proper conflict resolution
      const { data, error } = await supabase
        .from('ftc_teams')
        .upsert(batch, { 
          onConflict: 'team_number',
          ignoreDuplicates: false // Allow updates to existing teams
        })
        .select()
      
      if (error) {
        log(`❌ Batch error: ${error.message}`, 'ERROR')
        errors += batch.length
        
        // Try individual inserts if batch fails
        for (const team of batch) {
          try {
            const { data: singleData, error: singleError } = await supabase
              .from('ftc_teams')
              .upsert(team, { 
                onConflict: 'team_number',
                ignoreDuplicates: false 
              })
              .select()
            
            if (!singleError) {
              added++
              log(`   ✅ Individual insert: #${team.team_number}`)
            }
          } catch (singleErr) {
            log(`   ❌ Failed individual insert for team ${team.team_number}: ${singleErr.message}`, 'ERROR')
          }
        }
      } else {
        added += batch.length
        log(`   ✅ Batch ${Math.floor(i/CONFIG.batchSize) + 1}: Processed ${batch.length} teams`)
        
        // Log some team numbers for verification
        const teamNumbers = batch.map(t => t.team_number).slice(0, 3).join(', ')
        log(`     Teams: ${teamNumbers}${batch.length > 3 ? '...' : ''}`)
      }
      
    } catch (error) {
      log(`❌ Database error: ${error.message}`, 'ERROR')
      errors += batch.length
    }
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  log(`📊 Database update complete: Added/Updated: ${added}, Errors: ${errors}`)
  return { added, errors }
}

/**
 * Get range completion statistics
 */
async function getRangeStats(ranges) {
  const stats = []
  
  for (const [start, end] of ranges) {
    try {
      const { data: existingTeams, error } = await supabase
        .from('ftc_teams')
        .select('team_number')
        .gte('team_number', start)
        .lte('team_number', end)
      
      const existingCount = existingTeams ? existingTeams.length : 0
      const rangeSize = end - start + 1
      const completionPercent = Math.round((existingCount / rangeSize) * 100)
      
      stats.push({
        start,
        end,
        existing: existingCount,
        total: rangeSize,
        completion: completionPercent
      })
    } catch (error) {
      log(`❌ Error getting stats for range ${start}-${end}: ${error.message}`, 'ERROR')
      stats.push({
        start,
        end,
        existing: 0,
        total: end - start + 1,
        completion: 0
      })
    }
  }
  
  return stats
}

/**
 * Main sync function
 */
async function performSync() {
  if (!isRunning) return
  
  log('🚀 Starting FTC teams sync...')
  
  try {
    // Test database connection
    const { data: testData, error: testError } = await supabase
      .from('ftc_teams')
      .select('team_number')
      .limit(1)
    
    if (testError && !testError.message.includes('relation "ftc_teams" does not exist')) {
      log(`❌ Database connection failed: ${testError.message}`, 'ERROR')
      return
    }
    
    // Get current count
    const { data: countData } = await supabase
      .from('ftc_teams')
      .select('team_number')
    
    const currentCount = countData ? countData.length : 0
    log(`✅ Database connected. Current teams in database: ${currentCount}`)
    
    // Define ranges to check
    const ranges = [
      [1, 1000],
      [1000, 3000],
      [3000, 6000],
      [6000, 10000],
      [10000, 15000],
      [15000, 20000],
      [20000, 25000]
    ]
    
    // Get completion stats for all ranges
    log('📊 Analyzing range completion status...')
    const rangeStats = await getRangeStats(ranges)
    
    // Log completion status
    rangeStats.forEach(stat => {
      log(`   Range ${stat.start}-${stat.end}: ${stat.existing}/${stat.total} teams (${stat.completion}% complete)`)
    })
    
    // Find the range with lowest completion percentage
    const incompleteRanges = rangeStats.filter(stat => stat.completion < 90) // Less than 90% complete
    
    let targetRange
    if (incompleteRanges.length > 0) {
      // Pick the range with lowest completion
      targetRange = incompleteRanges.sort((a, b) => a.completion - b.completion)[0]
      log(`🎯 Targeting least complete range: ${targetRange.start}-${targetRange.end} (${targetRange.completion}% complete)`)
    } else {
      // All ranges are mostly complete, pick one based on time rotation
      const rangeIndex = Math.floor(Date.now() / CONFIG.syncInterval) % ranges.length
      targetRange = rangeStats[rangeIndex]
      log(`� All ranges >90% complete, using rotation: ${targetRange.start}-${targetRange.end}`)
    }
    
    const [start, end] = [targetRange.start, targetRange.end]
    
    const teams = await getTeamsInRange(start, end)
    
    if (teams.length > 0) {
      await addTeamsToDatabase(teams)
      log(`🎉 Sync completed! Added ${teams.length} new teams to database`)
    } else {
      log(`📋 Sync completed! No new teams found in range ${start}-${end}`)
    }
    
    // Final stats
    const { data: finalCountData } = await supabase
      .from('ftc_teams')
      .select('team_number')
    
    const finalCount = finalCountData ? finalCountData.length : 0
    const newTeams = finalCount - currentCount
    log(`📈 Database now contains ${finalCount} teams (${newTeams > 0 ? '+' + newTeams : newTeams} this sync)`)
    
  } catch (error) {
    log(`❌ Sync failed: ${error.message}`, 'ERROR')
  }
}

/**
 * Schedule next sync
 */
function scheduleNextSync() {
  if (!isRunning) return
  
  const nextSync = new Date(Date.now() + CONFIG.syncInterval)
  log(`⏰ Next sync scheduled for: ${nextSync.toISOString()}`)
  
  syncTimeout = setTimeout(async () => {
    if (isRunning) {
      await performSync()
      scheduleNextSync()
    }
  }, CONFIG.syncInterval)
}

/**
 * Graceful shutdown
 */
function shutdown() {
  log('🛑 Shutting down FTC teams sync service...')
  isRunning = false
  
  if (syncTimeout) {
    clearTimeout(syncTimeout)
    syncTimeout = null
  }
  
  log('✅ Service shutdown complete')
  process.exit(0)
}

/**
 * Start the service
 */
async function start() {
  log('🚀 Starting FTC Teams Sync Service')
  log(`📊 Configuration:`)
  log(`   - Sync interval: ${CONFIG.syncInterval / (60 * 60 * 1000)} hours`)
  log(`   - Max teams per run: ${CONFIG.maxTeamsPerRun}`)
  log(`   - API delay: ${CONFIG.apiDelay}ms`)
  log(`   - Log file: ${CONFIG.logFile}`)
  
  isRunning = true
  
  // Set up signal handlers for graceful shutdown
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
  process.on('SIGQUIT', shutdown)
  
  // Perform initial sync
  await performSync()
  
  // Schedule ongoing syncs
  scheduleNextSync()
  
  log('✅ Service started successfully')
}

// Start the service
start().catch(error => {
  log(`❌ Failed to start service: ${error.message}`, 'ERROR')
  process.exit(1)
})