'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabaseClient'

export default function QuizDebug() {
  const [user, setUser] = useState<any>(null)
  const [quizAttempts, setQuizAttempts] = useState<any[]>([])
  const [leaderboardViews, setLeaderboardViews] = useState<any[]>([])
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      console.log('Current user:', user)
      
      if (error) {
        setError(`Auth error: ${error.message}`)
        return
      }
      
      setUser(user)
      
      if (user) {
        await checkQuizAttempts(user.id)
        await checkLeaderboardViews()
      }
    } catch (err: any) {
      setError(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const checkQuizAttempts = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      console.log('Quiz attempts:', data)
      console.log('Quiz attempts error:', error)

      if (error) {
        setError(`Quiz attempts error: ${error.message}`)
      } else {
        setQuizAttempts(data || [])
      }
    } catch (err: any) {
      setError(`Quiz attempts fetch error: ${err.message}`)
    }
  }

  const checkLeaderboardViews = async () => {
    try {
      const { data, error } = await supabase
        .from('individual_leaderboard')
        .select('*')
        .limit(5)

      console.log('Individual leaderboard view:', data)
      console.log('Individual leaderboard error:', error)

      if (error) {
        setError(`Leaderboard view error: ${error.message}`)
      } else {
        setLeaderboardViews(data || [])
      }
    } catch (err: any) {
      setError(`Leaderboard fetch error: ${err.message}`)
    }
  }

  const testQuizSubmission = async () => {
    if (!user) {
      setError('No user logged in')
      return
    }

    try {
      const testAttempt = {
        user_id: user.id,
        season: 'Into The Deep',
        score: 2,
        total_questions: 3,
        questions_answered: [
          { question_id: '1', user_answer: 2, correct_answer: 2, is_correct: true },
          { question_id: '2', user_answer: 1, correct_answer: 0, is_correct: false },
          { question_id: '3', user_answer: 2, correct_answer: 2, is_correct: true }
        ],
        time_taken: 45,
        is_guest: false
      }

      console.log('Submitting test quiz attempt:', testAttempt)

      const { data, error } = await supabase
        .from('quiz_attempts')
        .insert(testAttempt)
        .select()

      console.log('Test submission result:', data)
      console.log('Test submission error:', error)

      if (error) {
        setError(`Test submission error: ${error.message}`)
      } else {
        setError('Test submission successful!')
        await checkQuizAttempts(user.id)
        // Trigger leaderboard refresh
        window.dispatchEvent(new CustomEvent('quizCompleted'))
      }
    } catch (err: any) {
      setError(`Test submission exception: ${err.message}`)
    }
  }

  if (loading) {
    return <div className="p-4 text-white">Loading debug info...</div>
  }

  return (
    <div className="p-6 bg-gray-900 text-white rounded-lg max-w-4xl">
      <h2 className="text-2xl font-bold mb-4">Quiz Debug Information</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Current User</h3>
          <pre className="bg-gray-800 p-3 rounded text-sm overflow-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Quiz Attempts ({quizAttempts.length})</h3>
          <pre className="bg-gray-800 p-3 rounded text-sm overflow-auto max-h-64">
            {JSON.stringify(quizAttempts, null, 2)}
          </pre>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Leaderboard View Sample</h3>
          <pre className="bg-gray-800 p-3 rounded text-sm overflow-auto max-h-64">
            {JSON.stringify(leaderboardViews, null, 2)}
          </pre>
        </div>

        <div>
          <button
            onClick={testQuizSubmission}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
          >
            Test Quiz Submission
          </button>
        </div>

        <div>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('quizCompleted'))}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white ml-2"
          >
            Trigger Leaderboard Refresh
          </button>
        </div>
      </div>
    </div>
  )
}
