#!/usr/bin/env node

/**
 * Test FTCScout GraphQL API with correct queries
 * 
 * Based on the introspection, we now know the available fields
 */

async function testTeamsSearch() {
  console.log('🔍 Testing teamsSearch GraphQL query...')
  
  const graphqlEndpoint = 'https://api.ftcscout.org/graphql'
  
  // Test the teamsSearch field
  const searchQuery = `
    query {
      teamsSearch(search: "", first: 20) {
        edges {
          node {
            number
            name
            nameShort
            city
            stateProv
            country
          }
        }
      }
    }
  `
  
  try {
    console.log('📋 Testing teamsSearch with empty search (should return teams)...')
    
    const response = await fetch(graphqlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CybotZ-Quiz-App/1.0'
      },
      body: JSON.stringify({
        query: searchQuery
      })
    })
    
    console.log(`📡 Response Status: ${response.status} ${response.statusText}`)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    
    if (result.errors) {
      console.error('❌ GraphQL Errors:', result.errors)
      // Try to get more details about the error
      result.errors.forEach(error => {
        console.error(`   Error: ${error.message}`)
        if (error.locations) {
          console.error(`   Location: Line ${error.locations[0].line}, Column ${error.locations[0].column}`)
        }
      })
      return false
    }
    
    if (result.data && result.data.teamsSearch) {
      const teams = result.data.teamsSearch.edges
      console.log(`✅ Successfully fetched ${teams.length} teams!`)
      
      console.log('\n📊 Sample teams:')
      teams.slice(0, 5).forEach(edge => {
        const team = edge.node
        console.log(`   - #${team.number}: ${team.nameShort || team.name} (${team.city}, ${team.stateProv})`)
      })
      
      return { success: true, teams }
    } else {
      console.log('⚠️  Unexpected response structure:', result)
      return false
    }
    
  } catch (error) {
    console.error('❌ teamsSearch test failed:', error.message)
    return false
  }
}

async function testTeamByNumber() {
  console.log('\n🔍 Testing teamByNumber GraphQL query...')
  
  const graphqlEndpoint = 'https://api.ftcscout.org/graphql'
  
  // Test getting a specific team by number
  const teamQuery = `
    query {
      teamByNumber(number: 731) {
        number
        name
        nameShort
        city
        stateProv
        country
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
        query: teamQuery
      })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    
    if (result.errors) {
      console.error('❌ teamByNumber errors:', result.errors)
      return false
    }
    
    if (result.data && result.data.teamByNumber) {
      const team = result.data.teamByNumber
      console.log(`✅ Found team: #${team.number} - ${team.nameShort || team.name}`)
      console.log(`   Location: ${team.city}, ${team.stateProv}, ${team.country}`)
      return { success: true, team }
    } else {
      console.log('⚠️  Team not found or unexpected response:', result)
      return false
    }
    
  } catch (error) {
    console.error('❌ teamByNumber test failed:', error.message)
    return false
  }
}

// Try to get team schema details
async function getTeamSchema() {
  console.log('\n🔍 Getting Team type schema...')
  
  const graphqlEndpoint = 'https://api.ftcscout.org/graphql'
  
  const schemaQuery = `
    query {
      __type(name: "Team") {
        fields {
          name
          type {
            name
            kind
          }
        }
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
        query: schemaQuery
      })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    
    if (result.data && result.data.__type) {
      console.log('✅ Team type fields:')
      result.data.__type.fields.forEach(field => {
        console.log(`   - ${field.name}: ${field.type.name || field.type.kind}`)
      })
      return true
    }
    
  } catch (error) {
    console.error('❌ Schema query failed:', error.message)
    return false
  }
}

async function runGraphQLTests() {
  console.log('🚀 Testing FTCScout GraphQL API with correct structure...\n')
  
  // Test team schema first
  await getTeamSchema()
  
  // Test specific team lookup
  const teamResult = await testTeamByNumber()
  
  // Test teams search
  const searchResult = await testTeamsSearch()
  
  if (searchResult && searchResult.success) {
    console.log('\n🎉 GraphQL API is working! We can use this for team sync.')
    console.log('\n📋 Next step: Update sync script to use GraphQL API')
  } else {
    console.log('\n❌ GraphQL API tests failed. Check the playground at:')
    console.log('   https://api.ftcscout.org/graphql')
  }
}

runGraphQLTests()
