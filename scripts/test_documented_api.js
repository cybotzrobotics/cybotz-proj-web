#!/usr/bin/env node

/**
 * Test FTCScout GraphQL API with the documented structure
 * 
 * Based on the documentation: teamByNumber(number: Int!)
 */

async function testDocumentedAPI() {
  console.log('🔍 Testing FTCScout GraphQL with documented structure...')
  
  const graphqlEndpoint = 'https://api.ftcscout.org/graphql'
  
  // Simple query based on the documentation
  const simpleQuery = `
    query {
      teamByNumber(number: 731) {
        number
        name
        location
        rookieYear
      }
    }
  `
  
  try {
    console.log('📋 Testing simple teamByNumber query...')
    console.log('Query:', simpleQuery)
    
    const response = await fetch(graphqlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CybotZ-Quiz-App/1.0',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        query: simpleQuery
      })
    })
    
    console.log(`📡 Response Status: ${response.status} ${response.statusText}`)
    
    // Get the response text to see what we're actually getting
    const responseText = await response.text()
    console.log('📄 Raw response:', responseText)
    
    if (response.ok) {
      try {
        const result = JSON.parse(responseText)
        
        if (result.errors) {
          console.error('❌ GraphQL Errors:')
          result.errors.forEach(error => {
            console.error(`   - ${error.message}`)
            if (error.path) console.error(`     Path: ${error.path.join('.')}`)
            if (error.locations) {
              error.locations.forEach(loc => {
                console.error(`     Location: Line ${loc.line}, Column ${loc.column}`)
              })
            }
          })
        } else if (result.data && result.data.teamByNumber) {
          console.log('✅ Success! Team data:')
          console.log(JSON.stringify(result.data.teamByNumber, null, 2))
          return result.data.teamByNumber
        } else {
          console.log('⚠️  Unexpected response structure:', result)
        }
      } catch (parseError) {
        console.error('❌ JSON Parse Error:', parseError.message)
      }
    } else {
      // Check if it's HTML (might be an error page)
      if (responseText.includes('<html')) {
        console.log('⚠️  Received HTML response (likely an error page)')
        console.log('🔗 Try opening https://api.ftcscout.org/graphql in your browser')
      }
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message)
  }
}

// Test with a parameterized query too
async function testParameterizedQuery() {
  console.log('\n🔍 Testing parameterized query...')
  
  const graphqlEndpoint = 'https://api.ftcscout.org/graphql'
  
  const paramQuery = `
    query GetTeam($number: Int!) {
      teamByNumber(number: $number) {
        number
        name
        location
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
        query: paramQuery,
        variables: { number: 731 }
      })
    })
    
    console.log(`📡 Parameterized query status: ${response.status}`)
    
    const responseText = await response.text()
    
    if (response.ok) {
      const result = JSON.parse(responseText)
      if (result.data && result.data.teamByNumber) {
        console.log('✅ Parameterized query works!')
        console.log(`Team: #${result.data.teamByNumber.number} - ${result.data.teamByNumber.name}`)
      } else if (result.errors) {
        console.error('❌ Parameterized query errors:', result.errors)
      }
    }
    
  } catch (error) {
    console.error('❌ Parameterized query failed:', error.message)
  }
}

// Test different team numbers to see what works
async function testMultipleTeams() {
  console.log('\n🔍 Testing multiple team numbers...')
  
  const testTeams = [731, 1002, 5100, 12345, 99999]
  
  for (const teamNum of testTeams) {
    await testTeamNumber(teamNum)
  }
}

async function testTeamNumber(number) {
  const graphqlEndpoint = 'https://api.ftcscout.org/graphql'
  
  const query = `
    query {
      teamByNumber(number: ${number}) {
        number
        name
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
        console.log(`✅ Team ${number}: ${result.data.teamByNumber.name}`)
      } else if (result.errors) {
        console.log(`❌ Team ${number}: ${result.errors[0]?.message || 'Error'}`)
      } else {
        console.log(`⚠️  Team ${number}: Not found`)
      }
    } else {
      console.log(`❌ Team ${number}: HTTP ${response.status}`)
    }
    
  } catch (error) {
    console.log(`❌ Team ${number}: ${error.message}`)
  }
}

async function runTests() {
  await testDocumentedAPI()
  await testParameterizedQuery()
  await testMultipleTeams()
  
  console.log('\n📋 Summary:')
  console.log('- If any queries worked, we can use GraphQL for team data')
  console.log('- If all failed, the API might require authentication or have other restrictions')
  console.log('- Try the queries manually in the playground at: https://api.ftcscout.org/graphql')
}

runTests()
