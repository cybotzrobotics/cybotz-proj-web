#!/usr/bin/env node

/**
 * DATABASE DIAGNOSTIC - Check what happened to the missing teams
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function testDatabaseOperations() {
  console.log('🔍 DATABASE DIAGNOSTIC')
  console.log('======================')
  
  // Test 1: Check current database count
  console.log('\n1️⃣ Checking current database count...')
  const { data: allTeams, error: countError } = await supabase
    .from('ftc_teams')
    .select('team_number')
  
  if (countError) {
    console.log(`❌ Error reading database: ${countError.message}`)
    return
  }
  
  console.log(`✅ Current teams in database: ${allTeams?.length || 0}`)
  
  if (allTeams && allTeams.length > 0) {
    const numbers = allTeams.map(t => t.team_number).sort((a, b) => a - b)
    console.log(`   Range: ${numbers[0]} - ${numbers[numbers.length - 1]}`)
    console.log(`   Sample teams: ${numbers.slice(0, 5).join(', ')}...`)
  }
  
  // Test 2: Try inserting a single test team
  console.log('\n2️⃣ Testing single team insertion...')
  const testTeam = {
    team_number: 99999,
    team_name: 'Test Team - DELETE ME',
    team_name_short: 'Test Team',
    city: 'Test City',
    state_prov: 'TS',
    country: 'USA'
  }
  
  const { data: insertData, error: insertError } = await supabase
    .from('ftc_teams')
    .upsert(testTeam, { 
      onConflict: 'team_number',
      ignoreDuplicates: false 
    })
    .select()
  
  if (insertError) {
    console.log(`❌ Single insert failed: ${insertError.message}`)
    console.log(`   Code: ${insertError.code}`)
    console.log(`   Details: ${insertError.details}`)
    console.log(`   Hint: ${insertError.hint}`)
  } else {
    console.log(`✅ Single insert successful`)
    
    // Clean up test team
    await supabase
      .from('ftc_teams')
      .delete()
      .eq('team_number', 99999)
    console.log(`🧹 Cleaned up test team`)
  }
  
  // Test 3: Try batch insertion
  console.log('\n3️⃣ Testing batch insertion...')
  const testTeams = [
    {
      team_number: 99997,
      team_name: 'Batch Test 1',
      team_name_short: 'Batch Test 1',
      city: 'Test City',
      state_prov: 'TS',
      country: 'USA'
    },
    {
      team_number: 99998,
      team_name: 'Batch Test 2',
      team_name_short: 'Batch Test 2',
      city: 'Test City',
      state_prov: 'TS',
      country: 'USA'
    }
  ]
  
  const { data: batchData, error: batchError } = await supabase
    .from('ftc_teams')
    .upsert(testTeams, { 
      onConflict: 'team_number',
      ignoreDuplicates: false 
    })
    .select()
  
  if (batchError) {
    console.log(`❌ Batch insert failed: ${batchError.message}`)
    console.log(`   Code: ${batchError.code}`)
    console.log(`   Details: ${batchError.details}`)
  } else {
    console.log(`✅ Batch insert successful: ${batchData?.length || 0} teams`)
    
    // Clean up test teams
    await supabase
      .from('ftc_teams')
      .delete()
      .in('team_number', [99997, 99998])
    console.log(`🧹 Cleaned up test teams`)
  }
  
  // Test 4: Check table structure
  console.log('\n4️⃣ Checking table structure...')
  const { data: sampleTeam, error: structureError } = await supabase
    .from('ftc_teams')
    .select('*')
    .limit(1)
  
  if (structureError) {
    console.log(`❌ Error reading table structure: ${structureError.message}`)
  } else if (sampleTeam && sampleTeam.length > 0) {
    console.log(`✅ Table structure:`)
    console.log(`   Columns: ${Object.keys(sampleTeam[0]).join(', ')}`)
  }
  
  // Test 5: Check for constraints/policies that might be blocking
  console.log('\n5️⃣ Testing potential constraint issues...')
  
  // Try inserting team with minimal data
  const minimalTeam = {
    team_number: 99996,
    team_name: 'Minimal Test',
    team_name_short: 'Minimal Test'
  }
  
  const { data: minimalData, error: minimalError } = await supabase
    .from('ftc_teams')
    .upsert(minimalTeam, { 
      onConflict: 'team_number',
      ignoreDuplicates: false 
    })
    .select()
  
  if (minimalError) {
    console.log(`❌ Minimal insert failed: ${minimalError.message}`)
  } else {
    console.log(`✅ Minimal insert successful`)
    await supabase.from('ftc_teams').delete().eq('team_number', 99996)
  }
  
  console.log('\n📋 SUMMARY:')
  console.log('===========')
  console.log('If single/batch inserts work but your sync lost teams:')
  console.log('1. Silent failures in the sync script')
  console.log('2. RLS policies blocking inserts')
  console.log('3. Connection timeouts during batch operations')
  console.log('4. Memory issues causing data loss')
  
  console.log('\n💡 NEXT STEPS:')
  console.log('1. Run a smaller test sync (100 teams)')
  console.log('2. Add more error logging to the sync script')
  console.log('3. Use smaller batch sizes')
  console.log('4. Check Supabase dashboard for error logs')
}

testDatabaseOperations().catch(console.error)