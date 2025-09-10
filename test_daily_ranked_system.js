// Test the daily ranked questions system for duplicates
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://ideberpblterkkntilgj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkZWJlcnBibHRlcmtrbnRpbGdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NTYyOTMsImV4cCI6MjA3MjIzMjI5M30.5S_jcOBF_4a7owUMDY-iQ2jMvCOK7thoyNqzpu-dWsM'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testDailyRankedQuestions() {
  console.log('=== TESTING DAILY RANKED QUESTIONS SYSTEM ===')
  
  try {
    // 1. Check if daily_ranked_questions table exists and has data
    console.log('\n1. Checking daily_ranked_questions table...')
    const { data: dailyQuestions, error: dailyError } = await supabase
      .from('daily_ranked_questions')
      .select('*')
      .order('date', { ascending: false })
      .limit(20)
    
    console.log('Daily ranked questions records:', dailyQuestions?.length || 0)
    if (dailyQuestions && dailyQuestions.length > 0) {
      console.log('Recent entries:')
      dailyQuestions.slice(0, 5).forEach(q => {
        console.log(`  Date: ${q.date}, Question ID: ${q.question_id}, Position: ${q.question_position}`)
      })
    }
    console.log('Daily questions error:', dailyError)
    
    // 2. Test the get_daily_ranked_questions function
    console.log('\n2. Testing get_daily_ranked_questions function...')
    const { data: todaysQuestions, error: functionsError } = await supabase
      .rpc('get_daily_ranked_questions')
    
    console.log('Today\'s ranked questions count:', todaysQuestions?.length || 0)
    console.log('Functions error:', functionsError)
    
    if (todaysQuestions && todaysQuestions.length > 0) {
      console.log('\n3. Checking for duplicates in today\'s questions...')
      
      // Check for duplicate question IDs
      const questionIds = todaysQuestions.map(q => q.id)
      const uniqueIds = new Set(questionIds)
      
      console.log('Total questions:', questionIds.length)
      console.log('Unique question IDs:', uniqueIds.size)
      
      if (questionIds.length !== uniqueIds.size) {
        console.log('❌ DUPLICATES FOUND!')
        
        // Find which IDs are duplicated
        const duplicates = questionIds.filter((id, index) => questionIds.indexOf(id) !== index)
        console.log('Duplicate question IDs:', [...new Set(duplicates)])
        
        // Show the duplicated questions
        duplicates.forEach(dupId => {
          const dupQuestions = todaysQuestions.filter(q => q.id === dupId)
          console.log(`\nDuplicate question ID ${dupId}:`)
          dupQuestions.forEach((q, i) => {
            console.log(`  Position ${q.question_position}: "${q.question?.substring(0, 100)}..."`)
          })
        })
      } else {
        console.log('✅ No duplicates found - all questions are unique!')
      }
      
      // Check for duplicate positions
      const positions = todaysQuestions.map(q => q.question_position).sort((a, b) => a - b)
      console.log('\nQuestion positions:', positions)
      
      const uniquePositions = new Set(positions)
      if (positions.length !== uniquePositions.size) {
        console.log('❌ DUPLICATE POSITIONS FOUND!')
      } else {
        console.log('✅ All positions are unique (1-15)')
      }
      
      // Show first few questions
      console.log('\n4. Sample questions for today:')
      todaysQuestions.slice(0, 3).forEach(q => {
        console.log(`\nPosition ${q.question_position}:`)
        console.log(`Question: ${q.question?.substring(0, 100)}...`)
        console.log(`Difficulty: ${q.difficulty}`)
        console.log(`Category: ${q.category}`)
      })
    }
    
    // 5. Check total available questions in the database
    console.log('\n5. Checking total quiz questions available...')
    const { count, error: countError } = await supabase
      .from('quiz_questions')
      .select('*', { count: 'exact', head: true })
    
    console.log('Total quiz questions in database:', count)
    console.log('Count error:', countError)
    
    if (count && count < 15) {
      console.log('⚠️  WARNING: Only', count, 'questions available. Need at least 15 for daily ranked quiz.')
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

testDailyRankedQuestions().catch(console.error)
