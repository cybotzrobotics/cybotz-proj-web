#!/usr/bin/env node

/**
 * Add Sample FTC Teams for Testing
 * Since the APIs are down, this adds some realistic sample teams
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

const sampleTeams = [
  { team_number: 731, team_name: 'Wannabee Strange', team_name_short: 'Wannabee Strange', city: 'Stonington', state_prov: 'CT', country: 'USA' },
  { team_number: 1002, team_name: 'Circuit Crushers', team_name_short: 'Circuit Crushers', city: 'Hartford', state_prov: 'CT', country: 'USA' },
  { team_number: 5100, team_name: 'Cyberdragons', team_name_short: 'Cyberdragons', city: 'Stamford', state_prov: 'CT', country: 'USA' },
  { team_number: 6832, team_name: 'Iron Pulse', team_name_short: 'Iron Pulse', city: 'Waterbury', state_prov: 'CT', country: 'USA' },
  { team_number: 8393, team_name: 'Giant Diencephalon', team_name_short: 'Giant Diencephalon', city: 'West Hartford', state_prov: 'CT', country: 'USA' },
  { team_number: 9794, team_name: 'Wizards.exe', team_name_short: 'Wizards.exe', city: 'New Haven', state_prov: 'CT', country: 'USA' },
  { team_number: 11115, team_name: 'Gluten Free', team_name_short: 'Gluten Free', city: 'Guilford', state_prov: 'CT', country: 'USA' },
  { team_number: 12533, team_name: 'Mechanical Meltdown', team_name_short: 'Mechanical Meltdown', city: 'Bridgeport', state_prov: 'CT', country: 'USA' },
  { team_number: 13475, team_name: 'Circuit Breakers', team_name_short: 'Circuit Breakers', city: 'Norwich', state_prov: 'CT', country: 'USA' },
  { team_number: 16896, team_name: 'Gear Heads', team_name_short: 'Gear Heads', city: 'Danbury', state_prov: 'CT', country: 'USA' },
  { team_number: 17776, team_name: 'Liberty', team_name_short: 'Liberty', city: 'Greenwich', state_prov: 'CT', country: 'USA' },
  { team_number: 18421, team_name: 'QuadX', team_name_short: 'QuadX', city: 'Middletown', state_prov: 'CT', country: 'USA' },
  { team_number: 22023, team_name: 'Misty Mountain Hoppers', team_name_short: 'Misty Mountain', city: 'Ridgefield', state_prov: 'CT', country: 'USA' },
  { team_number: 14320, team_name: 'Knight Shift', team_name_short: 'Knight Shift', city: 'Fairfield', state_prov: 'CT', country: 'USA' },
  { team_number: 15303, team_name: 'Admirals', team_name_short: 'Admirals', city: 'New London', state_prov: 'CT', country: 'USA' },
  // Add some popular national teams
  { team_number: 11260, team_name: 'Mindstorm Meltdown', team_name_short: 'Mindstorm Meltdown', city: 'Birmingham', state_prov: 'AL', country: 'USA' },
  { team_number: 7172, team_name: 'Technical Difficulties', team_name_short: 'Technical Difficulties', city: 'Phoenix', state_prov: 'AZ', country: 'USA' },
  { team_number: 8644, team_name: 'Brainstormers', team_name_short: 'Brainstormers', city: 'Los Angeles', state_prov: 'CA', country: 'USA' },
  { team_number: 9794, team_name: 'Wizards.exe', team_name_short: 'Wizards.exe', city: 'Denver', state_prov: 'CO', country: 'USA' },
  { team_number: 6165, team_name: 'Mechanical Misfits', team_name_short: 'Mechanical Misfits', city: 'Miami', state_prov: 'FL', country: 'USA' },
  { team_number: 5975, team_name: 'Cybots', team_name_short: 'Cybots', city: 'Atlanta', state_prov: 'GA', country: 'USA' },
  { team_number: 4137, team_name: 'Islandbots', team_name_short: 'Islandbots', city: 'Honolulu', state_prov: 'HI', country: 'USA' },
  { team_number: 15302, team_name: 'Delta Force', team_name_short: 'Delta Force', city: 'Chicago', state_prov: 'IL', country: 'USA' },
  { team_number: 9971, team_name: 'LanBros', team_name_short: 'LanBros', city: 'Indianapolis', state_prov: 'IN', country: 'USA' },
  { team_number: 2393, team_name: 'Robotics Reloaded', team_name_short: 'Robotics Reloaded', city: 'Kansas City', state_prov: 'MO', country: 'USA' },
  { team_number: 8417, team_name: 'Lectric Legends', team_name_short: 'Lectric Legends', city: 'Las Vegas', state_prov: 'NV', country: 'USA' },
  { team_number: 5484, team_name: 'Enderbots', team_name_short: 'Enderbots', city: 'New York', state_prov: 'NY', country: 'USA' },
  { team_number: 6547, team_name: 'The Quarks', team_name_short: 'The Quarks', city: 'Portland', state_prov: 'OR', country: 'USA' },
  { team_number: 10641, team_name: 'Atomic Gears', team_name_short: 'Atomic Gears', city: 'Dallas', state_prov: 'TX', country: 'USA' },
  { team_number: 8148, team_name: 'Alotobots', team_name_short: 'Alotobots', city: 'Salt Lake City', state_prov: 'UT', country: 'USA' },
  { team_number: 7244, team_name: 'OUT OF ORDER', team_name_short: 'OUT OF ORDER', city: 'Seattle', state_prov: 'WA', country: 'USA' }
]

async function addSampleTeams() {
  console.log('📥 Adding sample FTC teams for testing...')
  
  try {
    // Insert teams one by one to handle conflicts
    let added = 0
    let updated = 0
    
    for (const team of sampleTeams) {
      const { data, error } = await supabase
        .from('ftc_teams')
        .upsert(team, { 
          onConflict: 'team_number',
          ignoreDuplicates: false 
        })
        .select()
      
      if (error) {
        console.log(`   ❌ Error with team ${team.team_number}: ${error.message}`)
      } else {
        console.log(`   ✅ Team ${team.team_number}: ${team.team_name_short}`)
        added++
      }
    }
    
    console.log(`\n📊 Summary:`)
    console.log(`   ✅ Successfully processed ${added} teams`)
    
    // Test search function
    console.log('\n🔍 Testing search with new data...')
    const { data: searchResult, error: searchError } = await supabase
      .rpc('search_teams', { search_term: 'cyber' })
    
    if (searchError) {
      console.error('❌ Search function error:', searchError.message)
    } else {
      console.log(`✅ Search test: Found ${searchResult ? searchResult.length : 0} teams with "cyber"`)
      if (searchResult && searchResult.length > 0) {
        searchResult.forEach(team => {
          console.log(`   - #${team.team_number}: ${team.team_name_short}`)
        })
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to add sample teams:', error.message)
  }
}

addSampleTeams()
