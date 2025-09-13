#!/usr/bin/env node

/**
 * Working FTCScout GraphQL API integration
 * 
 * Now that we know the API works, let's create proper queries
 */

async function getWorkingTeamQuery() {
  console.log('🔍 Testing corrected GraphQL queries...')
  
  const graphqlEndpoint = 'https://api.ftcscout.org/graphql'
  
  // Fixed query - location needs subfields
  const correctQuery = `
    query {
      teamByNumber(number: 731) {
        number
        name
        location {
          city
          stateProv
          country
        }
        rookieYear
        website
      }
    }
  `
  
  try {
    console.log('📋 Testing corrected query with location subfields...')
    
    const response = await fetch(graphqlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CybotZ-Quiz-App/1.0'
      },
      body: JSON.stringify({
        query: correctQuery
      })
    })
    
    if (response.ok) {
      const result = await response.json()
      
      if (result.errors) {
        console.error('❌ Errors:', result.errors)
        return false
      } else if (result.data && result.data.teamByNumber) {
        console.log('✅ Perfect! Corrected query works:')
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

// Test getting multiple teams by searching
async function testTeamsSearch() {
  console.log('\n🔍 Testing teamsSearch...')
  
  const graphqlEndpoint = 'https://api.ftcscout.org/graphql'
  
  // Search query - let's try different variations
  const searchQueries = [
    `query { teamsSearch(search: "cyber", first: 5) { edges { node { number name } } } }`,
    `query { teamsSearch(search: "", first: 5) { edges { node { number name } } } }`,
    `query { teamsSearch(first: 5) { edges { node { number name } } } }`
  ]
  
  for (const [index, query] of searchQueries.entries()) {
    try {
      console.log(`\n📋 Testing search variation ${index + 1}...`)
      
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
        
        if (result.errors) {
          console.log(`❌ Search ${index + 1} errors:`, result.errors[0]?.message)
        } else if (result.data && result.data.teamsSearch) {
          console.log(`✅ Search ${index + 1} works! Found ${result.data.teamsSearch.edges.length} teams`)
          result.data.teamsSearch.edges.slice(0, 3).forEach(edge => {
            console.log(`   - #${edge.node.number}: ${edge.node.name}`)
          })
          return result.data.teamsSearch.edges
        }
      } else {
        console.log(`❌ Search ${index + 1}: HTTP ${response.status}`)
      }
      
    } catch (error) {
      console.log(`❌ Search ${index + 1} error:`, error.message)
    }
  }
  
  return false
}

// Test by manually getting known team numbers
async function getAllTeamsManually() {
  console.log('\n🔍 Getting teams by known numbers...')
  
  const graphqlEndpoint = 'https://api.ftcscout.org/graphql'
  
  // Let's try to get teams in ranges to build our database
  const teamRanges = [
    [1, 100],
    [100, 1000],
    [1000, 2000],
    [5000, 6000],
    [10000, 11000],
    [15000, 16000],
    [20000, 21000]
  ]
  
  const foundTeams = []
  
  for (const [start, end] of teamRanges.slice(0, 2)) { // Just test first 2 ranges
    console.log(`\n📋 Testing range ${start}-${end}...`)
    
    for (let i = start; i < Math.min(start + 10, end); i++) { // Test 10 numbers per range
      try {
        const query = `
          query {
            teamByNumber(number: ${i}) {
              number
              name
              location {
                city
                stateProv
                country
              }
            }
          }
        `
        
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
            foundTeams.push(result.data.teamByNumber)
            console.log(`   ✅ #${i}: ${result.data.teamByNumber.name}`)
          }
        }
        
        // Small delay to be nice to the API
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error) {
        // Ignore individual errors
      }
    }
  }
  
  console.log(`\n📊 Found ${foundTeams.length} teams in sample ranges`)
  return foundTeams
}

async function runWorkingTests() {
  console.log('🚀 Testing working GraphQL queries...\n')
  
  const teamResult = await getWorkingTeamQuery()
  
  if (teamResult) {
    console.log('\n🎉 GraphQL API is fully working!')
    
    const searchResult = await testTeamsSearch()
    
    if (!searchResult) {
      console.log('\n📋 Search might not work, but individual team lookup does.')
      console.log('We can use teamByNumber to build our database.')
      
      const manualTeams = await getAllTeamsManually()
      
      if (manualTeams.length > 0) {
        console.log('\n✅ We can get teams manually and populate the database!')
      }
    }
    
    console.log('\n📋 Next steps:')
    console.log('1. Update the sync script to use GraphQL')
    console.log('2. Use teamByNumber queries to get team data')
    console.log('3. This will fix the "External APIs unavailable" error')
  }
}

runWorkingTests()
