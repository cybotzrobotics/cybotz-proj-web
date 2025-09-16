const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://ideberpblterkkntilgj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkZWJlcnBibHRlcmtrbnRpbGdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NTYyOTMsImV4cCI6MjA3MjIzMjI5M30.5S_jcOBF_4a7owUMDY-iQ2jMvCOK7thoyNqzpu-dWsM'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testQuestionReviews() {
  try {
    console.log('🧪 Testing question_reviews table...')
    
    // Test query
    const { data, error } = await supabase
      .from('question_reviews')
      .select('*')
      .order('submitted_at', { ascending: false })
    
    if (error) {
      console.error('❌ Error querying question_reviews:', error)
    } else {
      console.log('✅ Successfully queried question_reviews table')
      console.log(`📊 Found ${data.length} review records`)
      if (data.length > 0) {
        console.log('📝 Sample record:', data[0])
      }
    }
    
    // Test getting last 5 questions from quiz_questions
    console.log('\n🔍 Testing guest quiz query (last 5 questions)...')
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('id, question, options, correct_answer, explanation, category, difficulty')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (questionsError) {
      console.error('❌ Error querying quiz_questions:', questionsError)
    } else {
      console.log('✅ Successfully retrieved last 5 questions')
      console.log(`📊 Questions retrieved: ${questions.length}`)
      questions.forEach((q, index) => {
        console.log(`${index + 1}. ${q.question.substring(0, 60)}...`)
      })
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testQuestionReviews()