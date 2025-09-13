#!/usr/bin/env node

/**
 * Final Working FTCScout GraphQL Integration
 * 
 * Corrected field names based on API feedback
 */

async function getFinalWorkingQuery() {
  console.log('🔍 Testing final corrected GraphQL query...')
  
  const graphqlEndpoint = 'https://api.ftcscout.org/graphql'
  
  // Final corrected query with proper field names
  const finalQuery = `
    query {
      teamByNumber(number: 731) {
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
  
  try {
    console.log('📋 Testing with correct field names (state instead of stateProv)...')
    
    const response = await fetch(graphqlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CybotZ-Quiz-App/1.0'
      },
      body: JSON.stringify({
        query: finalQuery
      })
    })
    
    if (response.ok) {
      const result = await response.json()
      
      if (result.errors) {
        console.error('❌ Errors:', result.errors)
        return false
      } else if (result.data && result.data.teamByNumber) {
        console.log('✅ PERFECT! Final query works:')
        console.log(JSON.stringify(result.data.teamByNumber, null, 2))
        return result.data.teamByNumber
      }
    } else {
      console.log(`❌ HTTP ${response.status}`)
      const text = await response.text()
      console.log('Response:', text)
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
  
  return false
}

// Create the sync function using GraphQL
async function createGraphQLSync() {
  console.log('\n🔧 Creating GraphQL-based sync function...')
  
  const graphqlEndpoint = 'https://api.ftcscout.org/graphql'
  
  // Function to get a single team
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
          rookieYear
          website
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
        body: JSON.stringify({ query })
      })
      
      if (response.ok) {
        const result = await response.json()
        
        if (result.data && result.data.teamByNumber) {
          const team = result.data.teamByNumber
          return {
            team_number: team.number,
            team_name: team.name,
            team_name_short: team.name, // GraphQL doesn't seem to have short name
            city: team.location?.city,
            state_prov: team.location?.state,
            country: team.location?.country
          }
        }
      }
    } catch (error) {
      console.error(`Error getting team ${number}:`, error.message)
    }
    
    return null
  }
  
  // Test getting several teams
  const testTeamNumbers = [731, 1002, 5100, 6832, 9794]
  const foundTeams = []
  
  console.log('📋 Testing team retrieval...')
  
  for (const teamNum of testTeamNumbers) {
    const team = await getTeamByNumber(teamNum)
    if (team) {
      foundTeams.push(team)
      console.log(`   ✅ #${team.team_number}: ${team.team_name}`)
    } else {
      console.log(`   ❌ #${teamNum}: Not found`)
    }
    
    // Small delay to be nice to the API
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  
  console.log(`\n📊 Successfully retrieved ${foundTeams.length} teams`)
  
  if (foundTeams.length > 0) {
    console.log('\n🎉 GraphQL sync method works!')
    console.log('✅ We can now update the sync script to use GraphQL')
    console.log('✅ This will fix the "External APIs unavailable" error')
    
    return foundTeams
  }
  
  return false
}

async function runFinalTest() {
  const singleTeam = await getFinalWorkingQuery()
  
  if (singleTeam) {
    const teams = await createGraphQLSync()
    
    if (teams) {
      console.log('\n🚀 Ready to implement GraphQL sync!')
      console.log('\n📋 Implementation plan:')
      console.log('1. Update sync_ftc_teams.js to use GraphQL')
      console.log('2. Use teamByNumber queries for known team numbers')
      console.log('3. Add these teams to the database')
      console.log('4. Team search will work from database cache')
      console.log('5. No more "External APIs unavailable" errors!')
    }
  }
}

runFinalTest()
