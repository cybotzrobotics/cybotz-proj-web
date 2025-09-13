#!/usr/bin/env node

/**
 * Create correct GraphQL queries for FTCScout
 * 
 * This will show you the exact queries to use in the GraphQL playground
 */

console.log('📋 Correct GraphQL Queries for FTCScout API')
console.log('============================================\n')

console.log('🔍 1. Query a specific team by number:')
console.log('   (Use this in the GraphQL playground)\n')

const teamByNumberQuery = `query GetTeamByNumber($number: Int!) {
  teamByNumber(number: $number) {
    number
    name
    location
    rookieYear
    website
    quickStats {
      rank
      wins
      losses
      ties
    }
  }
}`

console.log(teamByNumberQuery)

console.log('\n📝 Query Variables (put this in the Variables panel):')
console.log(JSON.stringify({ number: 731 }, null, 2))

console.log('\n' + '='.repeat(50) + '\n')

console.log('🔍 2. Search for teams:')
console.log('   (This should work for getting multiple teams)\n')

const teamsSearchQuery = `query SearchTeams($search: String!, $first: Int) {
  teamsSearch(search: $search, first: $first) {
    edges {
      node {
        number
        name
        location
        rookieYear
        website
      }
    }
  }
}`

console.log(teamsSearchQuery)

console.log('\n📝 Query Variables for search:')
console.log(JSON.stringify({ search: "cyber", first: 10 }, null, 2))

console.log('\n' + '='.repeat(50) + '\n')

console.log('🔍 3. Get all teams (empty search):')
console.log('   (This might work to get all teams)\n')

const allTeamsQuery = `query GetAllTeams($first: Int) {
  teamsSearch(search: "", first: $first) {
    edges {
      node {
        number
        name
        location
        rookieYear
      }
    }
  }
}`

console.log(allTeamsQuery)

console.log('\n📝 Query Variables for all teams:')
console.log(JSON.stringify({ first: 50 }, null, 2))

console.log('\n' + '='.repeat(50) + '\n')

console.log('📋 Instructions for GraphQL Playground:')
console.log('1. Go to: https://api.ftcscout.org/graphql')
console.log('2. Copy one of the queries above into the left panel')
console.log('3. Copy the corresponding variables into the Variables panel (bottom left)')
console.log('4. Click the play button to run the query')
console.log('5. Check the results in the right panel')

console.log('\n💡 Tips:')
console.log('- Remove the "id" field from your query - it\'s not needed')
console.log('- The "$number: Int!" syntax defines a variable that must be provided')
console.log('- Put actual values in the Variables panel, not in the query itself')
console.log('- Start with the teamByNumber query first since it\'s simpler')

// Test one of these queries programmatically
async function testCorrectQuery() {
  console.log('\n🧪 Testing the teamByNumber query programmatically...')
  
  const graphqlEndpoint = 'https://api.ftcscout.org/graphql'
  
  try {
    const response = await fetch(graphqlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CybotZ-Quiz-App/1.0'
      },
      body: JSON.stringify({
        query: teamByNumberQuery,
        variables: { number: 731 }
      })
    })
    
    console.log(`📡 Response Status: ${response.status} ${response.statusText}`)
    
    if (response.ok) {
      const result = await response.json()
      
      if (result.errors) {
        console.error('❌ GraphQL Errors:', result.errors)
      } else if (result.data && result.data.teamByNumber) {
        console.log('✅ Query worked! Team data:')
        console.log(JSON.stringify(result.data.teamByNumber, null, 2))
      } else {
        console.log('⚠️  Unexpected response:', result)
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testCorrectQuery()
