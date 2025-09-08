// Test script to check if we can find quiz data for the current user
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testUserQuizData() {
  console.log('=== TESTING QUIZ DATA FETCHING ===\n')
  
  try {
    // First, let's see what's in the quiz_attempts table
    console.log('1. Checking quiz_attempts table...')
    const { data: allQuizAttempts, error: quizError } = await supabase
      .from('quiz_attempts')
      .select('*')
      .limit(5)
    
    if (quizError) {
      console.error('Error fetching quiz_attempts:', quizError)
    } else {
      console.log(`Found ${allQuizAttempts?.length || 0} quiz attempts`)
      if (allQuizAttempts && allQuizAttempts.length > 0) {
        console.log('Sample quiz attempt:', allQuizAttempts[0])
        
        // Calculate total correct from all attempts
        let totalCorrect = 0
        allQuizAttempts.forEach(attempt => {
          totalCorrect += attempt.score || 0
        })
        console.log(`Total correct answers in sample: ${totalCorrect}`)
      }
    }
    
    console.log('\n2. Checking ranked_quiz_attempts table...')
    const { data: rankedAttempts, error: rankedError } = await supabase
      .from('ranked_quiz_attempts')
      .select('*')
      .limit(5)
    
    if (rankedError) {
      console.error('Error fetching ranked_quiz_attempts:', rankedError)
    } else {
      console.log(`Found ${rankedAttempts?.length || 0} ranked quiz attempts`)
      if (rankedAttempts && rankedAttempts.length > 0) {
        console.log('Sample ranked attempt:', rankedAttempts[0])
      }
    }
    
    console.log('\n3. Checking current user authentication...')
    const { data: userAuth, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('Auth error:', authError)
    } else if (userAuth.user) {
      console.log('Current user ID:', userAuth.user.id)
      console.log('Current user email:', userAuth.user.email)
      
      // Now check attempts for this specific user
      console.log('\n4. Checking quiz attempts for current user...')
      const { data: userQuizAttempts, error: userQuizError } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('user_id', userAuth.user.id)
      
      if (userQuizError) {
        console.error('Error fetching user quiz attempts:', userQuizError)
      } else {
        console.log(`Found ${userQuizAttempts?.length || 0} quiz attempts for user`)
        if (userQuizAttempts && userQuizAttempts.length > 0) {
          let userTotalCorrect = 0
          userQuizAttempts.forEach(attempt => {
            userTotalCorrect += attempt.score || 0
          })
          console.log(`User's total correct answers: ${userTotalCorrect}`)
          console.log('User quiz attempts:', userQuizAttempts)
        }
      }
      
      console.log('\n5. Checking ranked quiz attempts for current user...')
      const { data: userRankedAttempts, error: userRankedError } = await supabase
        .from('ranked_quiz_attempts')
        .select('*')
        .eq('user_id', userAuth.user.id)
      
      if (userRankedError) {
        console.error('Error fetching user ranked attempts:', userRankedError)
      } else {
        console.log(`Found ${userRankedAttempts?.length || 0} ranked attempts for user`)
        if (userRankedAttempts && userRankedAttempts.length > 0) {
          let userRankedCorrect = 0
          userRankedAttempts.forEach(attempt => {
            userRankedCorrect += attempt.score || 0
          })
          console.log(`User's total ranked correct answers: ${userRankedCorrect}`)
        }
      }
      
    } else {
      console.log('No authenticated user found')
    }
    
  } catch (error) {
    console.error('Test failed:', error)
  }
}

testUserQuizData()
