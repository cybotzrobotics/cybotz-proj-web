'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Clock, Trophy, Target, Calendar } from 'lucide-react'
import { supabase } from '@/utils/supabaseClient'

interface QuizAttempt {
  id: string
  season: string
  score: number
  total_questions: number
  time_taken: number
  created_at: string
}

interface RecentQuizzesProps {
  limit?: number
}

export default function RecentQuizzes({ limit = 5 }: RecentQuizzesProps) {
  const [recentQuizzes, setRecentQuizzes] = useState<QuizAttempt[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    loadUserAndQuizzes()

    // Listen for quiz completion events to refresh recent quizzes
    const handleQuizCompleted = () => {
      console.log('Quiz completed, refreshing recent quizzes...')
      loadUserAndQuizzes()
    }

    window.addEventListener('quizCompleted', handleQuizCompleted)
    
    return () => {
      window.removeEventListener('quizCompleted', handleQuizCompleted)
    }
  }, [])

  const loadUserAndQuizzes = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        // Fetch recent quiz attempts
        const { data, error } = await supabase
          .from('quiz_attempts')
          .select('id, season, score, total_questions, time_taken, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (error) throw error
        setRecentQuizzes(data || [])
      }
    } catch (error) {
      console.error('Error loading recent quizzes:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getScoreColor = (score: number, total: number) => {
    const percentage = (score / total) * 100
    if (percentage >= 90) return 'text-neon-green'
    if (percentage >= 70) return 'text-ftc-orange'
    return 'text-ftc-red'
  }

  if (loading) {
    return (
      <div className="glass-panel p-6">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-5 h-5 text-ftc-orange" />
          <h3 className="text-lg font-semibold text-white">Recent Quizzes</h3>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-16 bg-white/10 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="glass-panel p-6">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-5 h-5 text-ftc-orange" />
          <h3 className="text-lg font-semibold text-white">Recent Quizzes</h3>
        </div>
        <p className="text-gray-400 text-center py-8">Please log in to see your quiz history</p>
      </div>
    )
  }

  if (recentQuizzes.length === 0) {
    return (
      <div className="glass-panel p-6">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-5 h-5 text-ftc-orange" />
          <h3 className="text-lg font-semibold text-white">Recent Quizzes</h3>
        </div>
        <div className="text-center py-8">
          <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-400 mb-2">No quizzes completed yet</p>
          <p className="text-gray-500 text-sm">Take your first quiz to see your progress here!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-panel p-6">
      <div className="flex items-center gap-3 mb-4">
        <Clock className="w-5 h-5 text-ftc-orange" />
        <h3 className="text-lg font-semibold text-white">Recent Quizzes</h3>
      </div>
      
      <div className="space-y-3">
        {recentQuizzes.map((quiz, index) => (
          <motion.div
            key={quiz.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white font-medium">{quiz.season}</span>
                <Trophy className="w-4 h-4 text-ftc-orange" />
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(quiz.created_at)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTime(quiz.time_taken)}
                </span>
              </div>
            </div>
            
            <div className="text-right">
              <div className={`text-lg font-bold ${getScoreColor(quiz.score, quiz.total_questions)}`}>
                {quiz.score}/{quiz.total_questions}
              </div>
              <div className="text-sm text-gray-400">
                {Math.round((quiz.score / quiz.total_questions) * 100)}%
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
