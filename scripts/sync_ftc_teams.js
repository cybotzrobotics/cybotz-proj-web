#!/usr/bin/env node

/**
 * FTC Teams Database Sync Script
 * 
 * This script fetches team data from FTC APIs and caches it in our database
 * to avoid slow API calls during user registration and leaderboard updates.
 * 
 * Usage: node scripts/sync_ftc_teams.js
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' })

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  console.log('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// FTC API data structures

/**
 * Fetch teams from The Orange Alliance API (more reliable)
 */
async function fetchFromOrangeAlliance() {
  console.log('Fetching teams from The Orange Alliance...')
  
  try {
    const response = await fetch('https://theorangealliance.org/api/team', {
      headers: {
        'User-Agent': 'CybotZ-Quiz-App/1.0'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log(`Fetched ${data.length} teams from Orange Alliance`)
    
    return data.map((team) => ({
      team_number: parseInt(team.team_number?.toString() || '0'),
      team_name: team.team_name_long || team.team_name_short || team.name || `Team ${team.team_number}`,
      team_name_short: team.team_name_short || team.team_name_long || team.name || `Team ${team.team_number}`,
      city: team.city || undefined,
      state_prov: team.state_prov || undefined,
      country: team.country || undefined
    })).filter(team => team.team_number > 0)
    
  } catch (error) {
    console.error('Orange Alliance API failed:', error)
    return []
  }
}

/**
 * Fetch teams from FTCScout API (fallback)
 */
async function fetchFromFTCScout() {
  console.log('Fetching teams from FTCScout API...')
  
  try {
    const response = await fetch('https://ftcscout.org/api/teams', {
      headers: {
        'User-Agent': 'CybotZ-Quiz-App/1.0'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    const data = result.data || []
    console.log(`Fetched ${data.length} teams from FTCScout`)
    
    return data.map((team) => ({
      team_number: team.number || 0,
      team_name: team.name || `Team ${team.number}`,
      team_name_short: team.name || `Team ${team.number}`,
      city: team.city || undefined,
      state_prov: team.state || undefined,
      country: team.country || undefined
    })).filter(team => team.team_number > 0)
    
  } catch (error) {
    console.error('FTCScout API failed:', error)
    return []
  }
}

/**
 * Insert teams into database in batches
 */
async function insertTeamsInBatches(teams, batchSize = 1000) {
  console.log(`Inserting ${teams.length} teams in batches of ${batchSize}...`)
  
  for (let i = 0; i < teams.length; i += batchSize) {
    const batch = teams.slice(i, i + batchSize)
    const batchNumber = Math.floor(i / batchSize) + 1
    const totalBatches = Math.ceil(teams.length / batchSize)
    
    console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} teams)`)
    
    try {
      const { error } = await supabase
        .from('ftc_teams')
        .upsert(
          batch.map(team => ({
            ...team,
            last_updated: new Date().toISOString()
          })),
          { 
            onConflict: 'team_number',
            ignoreDuplicates: false 
          }
        )
      
      if (error) {
        console.error(`Error inserting batch ${batchNumber}:`, error)
        throw error
      }
      
      console.log(`✓ Batch ${batchNumber} inserted successfully`)
      
      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100))
      
    } catch (error) {
      console.error(`Failed to insert batch ${batchNumber}:`, error)
      throw error
    }
  }
}

/**
 * Main sync function
 */
async function syncTeamsFromAPI() {
  console.log('🚀 Starting FTC teams sync...')
  console.log('Time:', new Date().toISOString())
  
  try {
    let teams = []
    
    // Try Orange Alliance first (more reliable)
    teams = await fetchFromOrangeAlliance()
    
    // Fallback to FTCScout if Orange Alliance fails
    if (teams.length === 0) {
      console.log('Orange Alliance failed, trying FTCScout...')
      teams = await fetchFromFTCScout()
    }
    
    if (teams.length === 0) {
      console.error('❌ No teams fetched from any API')
      process.exit(1)
    }
    
    console.log(`📊 Total teams to sync: ${teams.length}`)
    
    // Insert teams into database
    await insertTeamsInBatches(teams)
    
    // Update sync statistics
    const { count, error: countError } = await supabase
      .from('ftc_teams')
      .select('*', { count: 'exact', head: true })
    
    console.log('✅ Team sync completed successfully!')
    console.log(`📈 Total teams in database: ${count || 'unknown'}`)
    console.log('Time:', new Date().toISOString())
    
  } catch (error) {
    console.error('❌ Error during team sync:', error)
    process.exit(1)
  }
}

/**
 * Test database connection
 */
async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('ftc_teams')
      .select('*', { count: 'exact', head: true })
    
    if (error) throw error
    
    console.log('✅ Database connection successful')
    console.log(`Current teams in database: ${data?.length || 0}`)
    
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    throw error
  }
}

// Run the script
async function main() {
  try {
    await testConnection()
    await syncTeamsFromAPI()
  } catch (error) {
    console.error('Script failed:', error)
    process.exit(1)
  }
}

// Only run if called directly
if (require.main === module) {
  main()
}

module.exports = { syncTeamsFromAPI, testConnection }