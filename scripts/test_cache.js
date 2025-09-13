#!/usr/bin/env node

/**
 * Test FTC Teams Cache
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function testCache() {
  console.log('🧪 Testing FTC Teams Cache...')
  
  try {
    // Check how many teams we have
    const { data: teams, error: countError } = await supabase
      .from('ftc_teams')
      .select('*')
    
    if (countError) {
      console.error('❌ Error querying teams:', countError.message)
      return
    }
    
    console.log(`📊 Teams in cache: ${teams ? teams.length : 0}`)
    
    if (teams && teams.length > 0) {
      console.log('✅ Sample teams:')
      teams.slice(0, 3).forEach(team => {
        console.log(`  - #${team.team_number}: ${team.team_name_short || team.team_name}`)
      })
    }
    
    // Test search function
    console.log('\n🔍 Testing search function...')
    const { data: searchResult, error: searchError } = await supabase
      .rpc('search_teams', { search_term: 'test' })
    
    if (searchError) {
      console.error('❌ Search function error:', searchError.message)
      console.log('📋 The search_teams function needs to be created manually.')
    } else {
      console.log(`✅ Search function works! Found ${searchResult ? searchResult.length : 0} results`)
    }
    
    // If no teams, suggest populating
    if (!teams || teams.length === 0) {
      console.log('\n📥 No teams found. Run sync script to populate:')
      console.log('   node scripts/sync_ftc_teams.js')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testCache()
