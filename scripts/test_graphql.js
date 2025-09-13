#!/usr/bin/env node

/**
 * Test FTCScout GraphQL API
 * 
 * This script tests the FTCScout GraphQL API to see if it's working
 * and what data structure it returns for teams.
 */

async function testGraphQLAPI() {
  console.log('🧪 Testing FTCScout GraphQL API...')
  
  const graphqlEndpoint = 'https://api.ftcscout.org/graphql'
  
  // Test query to get a few teams
  const testQuery = `
    query {
      teams(first: 10) {
        edges {
          node {
            number
            name
            shortName
            city
            stateProv
            country
          }
        }
      }
    }
  `
  
  try {
    console.log(`🔗 Querying: ${graphqlEndpoint}`)
    console.log(`📋 Query: ${testQuery}`)
    
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
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    
    if (result.errors) {
      console.error('❌ GraphQL Errors:', result.errors)
      return false
    }
    
    if (result.data && result.data.teams) {
      const teams = result.data.teams.edges
      console.log(`✅ Successfully fetched ${teams.length} teams!`)
      
      console.log('\n📊 Sample teams:')
      teams.slice(0, 5).forEach(edge => {
        const team = edge.node
        console.log(`   - #${team.number}: ${team.shortName || team.name} (${team.city}, ${team.stateProv})`)
      })
      
      return { success: true, teams }
    } else {
      console.log('⚠️  Unexpected response structure:', result)
      return false
    }
    
  } catch (error) {
    console.error('❌ GraphQL API test failed:', error.message)
    return false
  }
}

// Test with a different query structure in case the first one doesn't work
async function testAlternativeQuery() {
  console.log('\n🔄 Trying alternative GraphQL query...')
  
  const graphqlEndpoint = 'https://api.ftcscout.org/graphql'
  
  // Alternative query structure
  const altQuery = `
    query GetTeams {
      allTeams(first: 10) {
        nodes {
          teamNumber
          teamName
          teamNameShort
          city
          state
          country
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
        query: altQuery
      })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    
    if (result.errors) {
      console.error('❌ Alternative query errors:', result.errors)
      return false
    }
    
    console.log('✅ Alternative query result:', result)
    return result
    
  } catch (error) {
    console.error('❌ Alternative query failed:', error.message)
    return false
  }
}

// Test schema introspection to see what's available
async function introspectSchema() {
  console.log('\n🔍 Introspecting GraphQL schema...')
  
  const graphqlEndpoint = 'https://api.ftcscout.org/graphql'
  
  const introspectionQuery = `
    query IntrospectionQuery {
      __schema {
        queryType {
          fields {
            name
            description
            type {
              name
              kind
            }
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
        query: introspectionQuery
      })
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result = await response.json()
    
    if (result.errors) {
      console.error('❌ Introspection errors:', result.errors)
      return false
    }
    
    if (result.data && result.data.__schema) {
      console.log('✅ Available query fields:')
      result.data.__schema.queryType.fields.forEach(field => {
        console.log(`   - ${field.name}: ${field.type.name || field.type.kind}`)
      })
      return true
    }
    
  } catch (error) {
    console.error('❌ Introspection failed:', error.message)
    return false
  }
}

async function runTests() {
  console.log('🚀 Starting FTCScout GraphQL API tests...\n')
  
  const result1 = await testGraphQLAPI()
  
  if (!result1) {
    await testAlternativeQuery()
  }
  
  await introspectSchema()
  
  console.log('\n📋 Next steps:')
  console.log('1. If any queries worked, we can update the sync script')
  console.log('2. If not, we can visit the GraphQL playground at:')
  console.log('   https://api.ftcscout.org/graphql')
  console.log('3. Test queries manually in the playground to find the right structure')
}

runTests()
