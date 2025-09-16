const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = 'https://ideberpblterkkntilgj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkZWJlcnBibHRlcmtrbnRpbGdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NTYyOTMsImV4cCI6MjA3MjIzMjI5M30.5S_jcOBF_4a7owUMDY-iQ2jMvCOK7thoyNqzpu-dWsM'

const supabase = createClient(supabaseUrl, supabaseKey)

async function createQuestionReviewsTable() {
  try {
    console.log('🔍 Checking if question_reviews table exists...')
    
    // First check if table exists
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'question_reviews')
    
    if (tablesError) {
      console.log('⚠️ Could not query table information, proceeding with creation...')
    } else if (tables && tables.length > 0) {
      console.log('✅ question_reviews table already exists!')
      return
    }
    
    console.log('📝 Creating question_reviews table...')
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '../database/database_question_reviews.sql')
    const sqlContent = fs.readFileSync(sqlPath, 'utf8')
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent })
    
    if (error) {
      console.error('❌ Error creating table:', error)
      // Try alternative method - execute queries one by one
      console.log('🔄 Trying alternative method...')
      
      const queries = sqlContent
        .split(';')
        .map(q => q.trim())
        .filter(q => q.length > 0 && !q.startsWith('--'))
      
      for (const query of queries) {
        try {
          const { error: queryError } = await supabase.rpc('exec_sql', { sql: query })
          if (queryError) {
            console.log('⚠️ Query error (may be expected):', queryError.message)
          }
        } catch (e) {
          console.log('⚠️ Query execution error (may be expected):', e.message)
        }
      }
    }
    
    // Test if table was created by trying to query it
    const { data: testData, error: testError } = await supabase
      .from('question_reviews')
      .select('id')
      .limit(1)
    
    if (testError) {
      console.error('❌ Table creation failed:', testError)
    } else {
      console.log('✅ question_reviews table created successfully!')
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

createQuestionReviewsTable()