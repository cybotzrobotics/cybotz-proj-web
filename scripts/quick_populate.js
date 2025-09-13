#!/usr/bin/env node

/**
 * Quick Team Database Population using teamsSearch
 * 
 * Using the discovered teamsSearch(region: RegionOption) query
 */

// HARDCODE YOUR ENV VARIABLES HERE:
const SUPABASE_URL = 'https://ideberpblterkkntilgj.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkZWJlcnBibHRlcmtrbnRpbGdqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjY1NjI5MywiZXhwIjoyMDcyMjMyMjkzfQ.pff0t7OZz9lHHIHVO6-e2DCPBjhTvuCFL0zpbi6ofw0'

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const graphqlEndpoint = 'https://api.ftcscout.org/graphql'

async function testTeamsSearchQuery() {
  console.log('🧪 Testing teamsSearch with region...')
  
  // Test query using the corrected schema
  const testQuery = `
    query {
      teamsSearch(region: All) {
        number
        name
        location {
          city
          state
          country
        }
        rookieYear
      }
    }
  `
  
  try {
    console.log('📋 Testing teamsSearch with region: All...')
    
    const response = await fetch(graphqlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CybotZ-Quiz-App/1.0'
      },
      body: JSON.stringify({
        query: testQuery
      })
    })
    
    console.log(`📡 Response Status: ${response.status} ${response.statusText}`)
    
    if (response.ok) {
      const result = await response.json()
      
      if (result.errors) {
        console.error('❌ GraphQL Errors:')
        result.errors.forEach(error => {
          console.error(`   - ${error.message}`)
          if (error.extensions) {
            console.error(`     Code: ${error.extensions.code}`)
          }
        })
        return false
      } else if (result.data && result.data.teamsSearch) {
        const teams = result.data.teamsSearch
        console.log(`✅ SUCCESS! Found ${teams.length} teams`)
        
        console.log('\n📊 Sample teams:')
        teams.slice(0, 5).forEach(team => {
          console.log(`   - #${team.number}: ${team.name} (${team.location?.city}, ${team.location?.state})`)
        })
        
        return teams
      } else {
        console.log('⚠️  Unexpected response:', result)
        return false
      }
    } else {
      const errorText = await response.text()
      console.error('❌ HTTP Error:', errorText)
      return false
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message)
    return false
  }
}

async function populateDatabase(teams) {
  console.log(`\n💾 Adding ${teams.length} teams to database...`)
  
  if (SUPABASE_URL === 'https://ideberpblterkkntilgj.supabase.co') {
    console.log('✅ Supabase credentials loaded successfully!')
  }
  
  const dbTeams = teams.map(team => {
    return {
      team_number: team.number,
      team_name: team.name,
      team_name_short: team.name,
      city: team.location?.city,
      state_prov: team.location?.state,
      country: team.location?.country
    }
  })
  
  try {
    // Insert in batches of 50
    let inserted = 0
    
    for (let i = 0; i < dbTeams.length; i += 50) {
      const batch = dbTeams.slice(i, i + 50)
      
      const { data, error } = await supabase
        .from('ftc_teams')
        .upsert(batch, { 
          onConflict: 'team_number',
          ignoreDuplicates: false 
        })
      
      if (error) {
        console.error(`❌ Batch ${Math.floor(i/50) + 1} error:`, error.message)
        
        // If RLS error, show manual SQL
        if (error.message.includes('row-level security')) {
          console.log('\n📋 RLS Policy issue. Run this SQL in Supabase:')
          console.log(`
-- Allow inserts for testing
CREATE POLICY "Allow insert for sync" ON ftc_teams 
  FOR INSERT TO anon, authenticated USING (true);
          `)
        }
        
      } else {
        inserted += batch.length
        console.log(`   ✅ Batch ${Math.floor(i/50) + 1}: Added ${batch.length} teams`)
      }
    }
    
    console.log(`\n📊 Total inserted: ${inserted} teams`)
    return inserted > 0
    
  } catch (error) {
    console.error('❌ Database error:', error.message)
    return false
  }
}

async function runQuickPopulation() {
  console.log('🚀 Quick FTC Teams Database Population')
  console.log('=====================================\n')
  
  console.log('📋 Step 1: Test the teamsSearch query...')
  const teams = await testTeamsSearchQuery()
  
  if (teams && teams.length > 0) {
    console.log('\n📋 Step 2: Add teams to database...')
    const success = await populateDatabase(teams)
    
    if (success) {
      console.log('\n🎉 Database populated successfully!')
      console.log('✅ Team search should now work on your website!')
      
      // Test search function
      console.log('\n📋 Step 3: Test search function...')
      try {
        const { data: searchResult, error: searchError } = await supabase
          .rpc('search_teams', { search_term: 'cyber' })
        
        if (searchError) {
          console.error('❌ Search function error:', searchError.message)
        } else {
          console.log(`✅ Search test: Found ${searchResult ? searchResult.length : 0} teams with "cyber"`)
        }
      } catch (error) {
        console.log('⚠️  Search function test skipped (update env variables first)')
      }
      
    } else {
      console.log('\n⚠️  Database population failed, but team data is available')
      console.log('📋 Update the environment variables at the top of this script and run again')
    }
  } else {
    console.log('\n❌ Could not retrieve teams from GraphQL API')
  }
}

runQuickPopulation()
