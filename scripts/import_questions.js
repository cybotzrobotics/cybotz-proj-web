#!/usr/bin/env node

/**
 * Standalone Question Import Script
 * Imports questions directly to database without requiring auth
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// All the DECODE 2025-2026 questions
const questions = [
  {
    "section": "Section 9.2",
    "rule_name": "FIELD Dimensions",
    "question": "What are the exact dimensions of the DECODE playing field?",
    "options": [
      "120 in. by 120 in.",
      "144 in. by 144 in.",
      "156 in. by 156 in.",
      "132 in. by 132 in."
    ],
    "correct_answer": 1,
    "explanation": "The DECODE field is approximately 144 in. by 144 in. (365.75 cm by 365.75 cm) as specified in Section 9.2.",
    "difficulty": 2,
    "category": "Field Setup",
    "season": "2025-2026",
    "tags": ["field", "dimensions", "setup"],
    "source_page": "Section 9.2",
    "confidence": 10
  },
  {
    "section": "Section 9.9",
    "rule_name": "SCORING ELEMENTS",
    "question": "How many total ARTIFACTS are used in a DECODE match?",
    "options": [
      "30 (20 purple, 10 green)",
      "36 (24 purple, 12 green)",
      "40 (25 purple, 15 green)",
      "32 (22 purple, 10 green)"
    ],
    "correct_answer": 1,
    "explanation": "There are 36 total ARTIFACTS: 24 purple and 12 green as stated in Section 9.9.",
    "difficulty": 2,
    "category": "Scoring",
    "season": "2025-2026",
    "tags": ["artifacts", "scoring elements", "game pieces"],
    "source_page": "Section 9.9",
    "confidence": 10
  }
  // Add more questions here as needed
]

async function importQuestions() {
  console.log('🚀 Starting question import...')
  
  try {
    // Test database connection
    const { data: testData, error: testError } = await supabase
      .from('quiz_questions')
      .select('*')
      .limit(1)
    
    if (testError) {
      console.error('❌ Database connection failed:', testError.message)
      return
    }
    
    console.log('✅ Database connection successful')
    
    // Transform questions for database
    const questionsForDB = questions.map(q => ({
      season: q.season || '2025-2026',
      question: q.question,
      options: q.options,
      correct_answer: q.correct_answer,
      difficulty: q.difficulty?.toString() || 'medium',
      section: q.section,
      rule_name: q.rule_name || 'General Rule',
      explanation: q.explanation || 'No explanation provided',
      category: q.category || 'General',
      tags: q.tags || [],
      source_page: q.source_page || q.section,
      confidence: q.confidence || 10
    }))

    console.log(`📝 Importing ${questionsForDB.length} questions...`)
    
    // Insert questions
    const { data, error } = await supabase
      .from('quiz_questions')
      .insert(questionsForDB)
      .select()

    if (error) {
      console.error('❌ Question insertion error:', error.message)
    } else {
      console.log(`✅ Successfully imported ${data.length} questions!`)
      
      // Test query
      const { data: count } = await supabase
        .from('quiz_questions')
        .select('*', { count: 'exact', head: true })
      
      console.log(`📊 Total questions in database: ${count}`)
    }
    
  } catch (error) {
    console.error('❌ Import failed:', error.message)
  }
}

importQuestions()