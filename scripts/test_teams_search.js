#!/usr/bin/env node

/**
 * Test teamsSearch GraphQL Query (No Database Required)
 */

const graphqlEndpoint = 'https://api.ftcscout.org/graphql'

async function testTeamsSearchQuery() {
  console.log('🧪 Testing teamsSearch with region: All...')
  
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
        })
        return false
      } else if (result.data && result.data.teamsSearch) {
        const teams = result.data.teamsSearch
        console.log(`✅ SUCCESS! Found ${teams.length} teams using teamsSearch`)
        
        console.log('\n📊 Sample teams:')
        teams.slice(0, 10).forEach(team => {
          console.log(`   - #${team.number}: ${team.name} (${team.location?.city}, ${team.location?.state})`)
        })
        
        console.log('\n💾 Database format preview:')
        const dbTeams = teams.slice(0, 3).map(team => {
          return {
            team_number: team.number,
            team_name: team.name,
            team_name_short: team.name,
            city: team.location?.city,
            state_prov: team.location?.state,
            country: team.location?.country
          }
        })
        
        console.log(JSON.stringify(dbTeams, null, 2))
        console.log(`... and ${teams.length - 3} more teams ready for database`)
        
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

async function runTest() {
  console.log('🚀 Testing FTC Teams GraphQL API')
  console.log('=================================\n')
  
  const teams = await testTeamsSearchQuery()
  
  if (teams && teams.length > 0) {
    console.log('\n🎉 GraphQL API is working perfectly!')
    console.log(`📊 ${teams.length} teams available for database population`)
    console.log('\n📋 Next steps:')
    console.log('   1. Provide Supabase URL and service role key')
    console.log('   2. Update quick_populate.js with your credentials')
    console.log('   3. Run the population script')
    console.log('   4. Test team search on your website!')
  } else {
    console.log('\n❌ GraphQL API test failed')
  }
}

runTest()
