#!/usr/bin/env node

/**
 * API DIAGNOSTIC - Check what's happening with team fetching
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const graphqlEndpoint = 'https://api.ftcscout.org/graphql'

async function testSingleTeam(number) {
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
  
  console.log(`🧪 Testing team ${number}...`)
  
  try {
    const response = await fetch(graphqlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CybotZ-Diagnostic/1.0'
      },
      body: JSON.stringify({ query })
    })
    
    console.log(`   Status: ${response.status} ${response.statusText}`)
    
    if (response.ok) {
      const result = await response.json()
      console.log(`   Response:`, JSON.stringify(result, null, 2))
      
      if (result.data && result.data.teamByNumber) {
        console.log(`   ✅ Found: ${result.data.teamByNumber.name}`)
        return true
      } else {
        console.log(`   ❌ No team data in response`)
        return false
      }
    } else {
      const text = await response.text()
      console.log(`   ❌ Error response: ${text}`)
      return false
    }
  } catch (error) {
    console.log(`   ❌ Fetch error: ${error.message}`)
    return false
  }
}

async function runDiagnostics() {
  console.log('🔍 API DIAGNOSTICS')
  console.log('==================')
  
  // Test known teams that should exist
  const testTeams = [
    254,   // Cheesy Poofs (famous FRC team, might be in FTC)
    731,   // Your team from earlier logs
    1002,  // From your earlier logs
    3000,  // Start of range that was processing
    5000,  // Middle range
    8000,  // Higher range
    11115, // From your earlier logs
  ]
  
  let successCount = 0
  
  for (const teamNum of testTeams) {
    const success = await testSingleTeam(teamNum)
    if (success) successCount++
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  console.log('\n📊 DIAGNOSTIC RESULTS:')
  console.log(`   Successful: ${successCount}/${testTeams.length}`)
  
  if (successCount === 0) {
    console.log('\n❌ API ISSUES DETECTED:')
    console.log('   - API might be down or rate limiting')
    console.log('   - Network connectivity issues')
    console.log('   - API endpoint might have changed')
    console.log('\n💡 RECOMMENDATIONS:')
    console.log('   1. Use sample teams script for immediate deployment')
    console.log('   2. Try again in 30 minutes')
    console.log('   3. Check FTCScout.org status')
  } else if (successCount < testTeams.length / 2) {
    console.log('\n⚠️  PARTIAL API ISSUES:')
    console.log('   - Some teams found, others missing')
    console.log('   - Possible rate limiting')
    console.log('\n💡 RECOMMENDATIONS:')
    console.log('   1. Reduce parallel workers to 1')
    console.log('   2. Increase delays to 100ms+')
    console.log('   3. Use slower sync script')
  } else {
    console.log('\n✅ API SEEMS OK:')
    console.log('   - Most test teams found')
    console.log('   - Issue might be with range selection')
    console.log('\n💡 RECOMMENDATIONS:')
    console.log('   1. Focus on known good ranges (1-3000)')
    console.log('   2. Reduce parallel workers')
    console.log('   3. Check if teams exist in target ranges')
  }
}

runDiagnostics()