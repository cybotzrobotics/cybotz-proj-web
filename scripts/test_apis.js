#!/usr/bin/env node

/**
 * Test FTC APIs to find working endpoints
 */

async function testAPIs() {
  console.log('🧪 Testing FTC API endpoints...')
  
  // Test different API endpoints
  const endpoints = [
    'https://theorangealliance.org/api/team',
    'https://theorangealliance.org/api/teams',
    'https://ftcscout.org/api/teams',
    'https://ftcscout.org/api/teams/search?q=test',
    'https://api.ftcscout.org/teams',
    'https://www.firstinspires.org/robotics/ftc/team-information-search'
  ]
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n🔗 Testing: ${endpoint}`)
      const response = await fetch(endpoint, {
        headers: {
          'User-Agent': 'CybotZ-Quiz-App/1.0'
        }
      })
      
      console.log(`   Status: ${response.status} ${response.statusText}`)
      
      if (response.ok) {
        const text = await response.text()
        console.log(`   Response length: ${text.length} characters`)
        console.log(`   First 200 chars: ${text.substring(0, 200)}...`)
        
        try {
          const json = JSON.parse(text)
          console.log(`   ✅ Valid JSON with ${Array.isArray(json) ? json.length : Object.keys(json).length} items`)
        } catch {
          console.log('   ⚠️  Response is not JSON')
        }
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`)
    }
  }
  
  console.log('\n📋 Try manually testing these APIs in your browser:')
  endpoints.forEach(url => console.log(`   ${url}`))
}

testAPIs()
