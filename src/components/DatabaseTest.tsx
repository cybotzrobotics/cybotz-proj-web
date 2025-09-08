'use client'

import { useState } from 'react'
import { supabase } from '@/utils/supabaseClient'

export default function DatabaseTest() {
  const [results, setResults] = useState<string>('')

  const testDatabase = async () => {
    let output = 'Database Test Results:\n\n'
    
    try {
      // Test question_reviews table first
      output += `Testing question_reviews table:\n`
      try {
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('question_reviews')
          .select('*')
          .limit(1)
        
        output += `  Error: ${reviewsError ? JSON.stringify(reviewsError) : 'None'}\n`
        output += `  Data: ${reviewsData ? JSON.stringify(reviewsData, null, 2) : 'None'}\n`
        
        if (reviewsError) {
          if (reviewsError.code === 'PGRST116' || reviewsError.message.includes('does not exist')) {
            output += `  ❌ Table does not exist - please run database migration\n\n`
          } else {
            output += `  ❌ Other error accessing table\n\n`
          }
        } else {
          output += `  ✅ Table exists and accessible\n\n`
        }
      } catch (err) {
        output += `  Exception: ${err}\n\n`
      }

      // Test quiz_questions table structure by trying different column names
      const possibleColumns = [
        '*',
        'id, question, options, correct_answer, explanation, category, difficulty',
        'id, question_text, options, correct_answer, explanation, category, difficulty',
        'id, text, choices, answer, description',
        'id'
      ]

      output += `Testing quiz_questions table with different column combinations:\n\n`
      
      for (const columns of possibleColumns) {
        try {
          const { data, error } = await supabase
            .from('quiz_questions')
            .select(columns)
            .limit(1)
          
          output += `Columns "${columns}":\n`
          output += `  Error: ${error ? JSON.stringify(error) : 'None'}\n`
          output += `  Data: ${data ? JSON.stringify(data, null, 2) : 'None'}\n\n`
          
          if (!error && data) {
            output += `✅ SUCCESS! Working column set: ${columns}\n\n`
            break
          }
        } catch (err) {
          output += `  Exception: ${err}\n\n`
        }
      }

      // Test ranked_quiz_attempts table (formerly quiz_attempts)
      const { data: attempts, error: aError } = await supabase
        .from('ranked_quiz_attempts')
        .select('*')
        .limit(5)
      
      output += `Ranked Quiz Attempts Table:\n`
      output += `Error: ${aError ? JSON.stringify(aError) : 'None'}\n`
      output += `Data: ${attempts ? JSON.stringify(attempts, null, 2) : 'None'}\n\n`

      // Also test practice_quiz_attempts table
      const { data: practiceAttempts, error: pError } = await supabase
        .from('practice_quiz_attempts')
        .select('*')
        .limit(5)
      
      output += `Practice Quiz Attempts Table:\n`
      output += `Error: ${pError ? JSON.stringify(pError) : 'None'}\n`
      output += `Data: ${practiceAttempts ? JSON.stringify(practiceAttempts, null, 2) : 'None'}\n\n`

      // Test individual_leaderboard view
      const { data: individual, error: iError } = await supabase
        .from('individual_leaderboard')
        .select('*')
        .limit(5)
      
      output += `Individual Leaderboard View:\n`
      output += `Error: ${iError ? JSON.stringify(iError) : 'None'}\n`
      output += `Data: ${individual ? JSON.stringify(individual, null, 2) : 'None'}\n\n`

      // Test team_leaderboard view
      const { data: team, error: tError } = await supabase
        .from('team_leaderboard')
        .select('*')
        .limit(5)
      
      output += `Team Leaderboard View:\n`
      output += `Error: ${tError ? JSON.stringify(tError) : 'None'}\n`
      output += `Data: ${team ? JSON.stringify(team, null, 2) : 'None'}\n\n`

    } catch (error) {
      output += `Test failed with error: ${JSON.stringify(error)}\n`
    }
    
    setResults(output)
  }

  const seedSampleQuestions = async () => {
    // Use the correct schema (question instead of question_text)
    const sampleQuestions = [
      {
        season: 'DECODE',
        question: 'How many points does a robot score for placing a Sample in the High Basket during Autonomous?',
        options: ['6 points', '8 points', '10 points', '12 points'],
        correct_answer: 2,
        explanation: 'According to the DECODE game manual, robots score 10 points for each Sample placed in the High Basket during the Autonomous period.',
        category: 'Scoring',
        difficulty: 'medium'
      },
      {
        season: 'DECODE',
        question: 'What is the maximum height a robot can extend during the match?',
        options: ['42 inches', '48 inches', '54 inches', '60 inches'],
        correct_answer: 0,
        explanation: 'The maximum robot height extension is 42 inches as specified in the robot design constraints section.',
        category: 'Robot Design',
        difficulty: 'easy'
      },
      {
        season: 'DECODE',
        question: 'During which period can robots score Specimen points in the High Chamber?',
        options: ['Autonomous only', 'TeleOp only', 'Both Autonomous and TeleOp', 'Neither period'],
        correct_answer: 2,
        explanation: 'Specimens can be scored in the High Chamber during both Autonomous and TeleOp periods, with different point values.',
        category: 'Game Rules',
        difficulty: 'hard'
      }
    ]

    try {
      const { data, error } = await supabase
        .from('quiz_questions')
        .insert(sampleQuestions)
        .select()

      let output = 'Sample Questions Seeding Results:\n\n'
      output += `Error: ${error ? JSON.stringify(error) : 'None'}\n`
      output += `Data: ${data ? JSON.stringify(data, null, 2) : 'None'}\n`
      
      setResults(output)
    } catch (error) {
      setResults(`Seeding failed: ${JSON.stringify(error)}`)
    }
  }

  return (
    <div className="p-6 bg-black text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Database Test & Debug Tool</h1>
      
      <div className="space-y-4 mb-6">
        <button
          onClick={testDatabase}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
        >
          Test Database Tables
        </button>
        
        <button
          onClick={seedSampleQuestions}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded ml-4"
        >
          Seed Sample Questions
        </button>
      </div>

      <div className="bg-gray-900 p-4 rounded-lg">
        <h3 className="font-bold mb-2">Results:</h3>
        <pre className="whitespace-pre-wrap text-sm text-gray-300">
          {results || 'Click a button to test the database...'}
        </pre>
      </div>
    </div>
  )
}
