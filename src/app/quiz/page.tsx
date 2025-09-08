'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/utils/supabaseClient'
import AnimatedBackground from '@/components/AnimatedBackground'
import QuizInterface from '@/components/QuizInterface'
import { ArrowLeft, Trophy, BookOpen, Calendar, Users, Clock } from 'lucide-react'

export default function QuizPage() {
  const [user, setUser] = useState<any>(null)
  const [selectedMode, setSelectedMode] = useState<'ranked' | 'practice' | null>(null)
  const [todaysAttempt, setTodaysAttempt] = useState<any>(null)
  const [userRank, setUserRank] = useState<number | null>(null)
  const [loadingAttempt, setLoadingAttempt] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check if this is guest mode from URL params
    const guestMode = searchParams.get('guest') === 'true'
    const mode = searchParams.get('mode') as 'ranked' | 'practice'
    
    // If guest mode is attempted, redirect to guest quiz page
    if (guestMode) {
      router.push('/guest-quiz')
      return
    }
    
    if (mode) setSelectedMode(mode)

    // Check authentication status
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        // If not logged in, redirect to login
        router.push('/login')
        return
      }
      
      setUser(user)
      await checkTodaysAttempt(user.id)
    }

    checkUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push('/login')
      } else if (session?.user) {
        setUser(session.user)
        checkTodaysAttempt(session.user.id)
      }
    })

    return () => subscription.unsubscribe()
  }, [router, searchParams])

  const checkTodaysAttemptOldMethod = async (userId: string) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Check ranked_quiz_attempts table first
      const { data: rankedAttempt } = await supabase
        .from('ranked_quiz_attempts')
        .select('*')
        .eq('user_id', userId)
        .eq('date_attempted', today)
        .single()

      if (rankedAttempt) {
        console.log('User already took today\'s ranked quiz:', rankedAttempt)
        setTodaysAttempt(rankedAttempt)
        return
      }

      // Fallback: check old quiz_attempts table
      const { data: oldAttempts } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('user_id', userId)
        .eq('date_attempted', today)
        .limit(1)

      if (oldAttempts && oldAttempts.length > 0) {
        console.log('User already took today\'s quiz (old table):', oldAttempts[0])
        setTodaysAttempt(oldAttempts[0])
      } else {
        console.log('No attempt found for today')
        setTodaysAttempt(null)
      }
    } catch (error) {
      console.error('Error checking today\'s attempt (old method):', error)
      setTodaysAttempt(null)
    }
  }

  const checkTodaysAttempt = async (userId: string) => {
    setLoadingAttempt(true)
    try {
      // Get the username (email)
      const username = user?.email || 'unknown'
      
      // Check if this username completed today's quiz
      const { data: hasCompleted, error: checkError } = await supabase
        .rpc('has_completed_daily_quiz', { user_name: username })

      console.log('Has completed daily quiz:', { hasCompleted, checkError, username })

      if (checkError) {
        console.error('Error checking daily completion:', checkError)
        setTodaysAttempt(null)
        return
      }

      if (hasCompleted) {
        // Get their completion record to show score
        const { data: completion } = await supabase
          .from('daily_quiz_completions')
          .select('*')
          .eq('username', username)
          .eq('quiz_date', new Date().toISOString().split('T')[0])
          .single()

        console.log('User completion:', completion)

        // Get their rank from leaderboard
        const { data: leaderboard } = await supabase
          .from('individual_leaderboard')
          .select('rank')
          .eq('username', username)
          .single()

        console.log('User rank:', leaderboard)

        if (completion) {
          setTodaysAttempt({
            id: completion.id.toString(),
            user_id: userId,
            score: completion.score,
            total_questions: 15, // Daily quiz always has 15 questions
            time_taken: 0, // We don't track time anymore
            created_at: completion.completed_at,
            date_attempted: completion.quiz_date,
            accuracy: Math.round((completion.score / 15) * 100) // Calculate accuracy
          })
          
          if (leaderboard) {
            setUserRank(leaderboard.rank)
          }
        }
      } else {
        // User hasn't completed today's quiz
        setTodaysAttempt(null)
      }
    } catch (error) {
      console.error('Error checking today\'s attempt:', error)
      setTodaysAttempt(null)
    } finally {
      setLoadingAttempt(false)
    }
  }

  const handleBack = () => {
    if (selectedMode) {
      setSelectedMode(null)
      router.push('/quiz') // Go back to mode selection
    } else {
      router.push('/login') // Go back to login
    }
  }

  const handleQuizComplete = () => {
    // After quiz completion, show some feedback and allow going back
    console.log('Quiz completed!')
    setSelectedMode(null) // Return to mode selection
    
    // Refresh today's attempt status if user completed ranked quiz
    if (user && selectedMode === 'ranked') {
      checkTodaysAttempt(user.id)
    }
  }

  const selectMode = (mode: 'ranked' | 'practice') => {
    setSelectedMode(mode)
    router.push(`/quiz?mode=${mode}`)
  }

  if (!selectedMode) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <AnimatedBackground />
        
        {/* Header */}
        <div className="relative z-20 p-6">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <button
              onClick={handleBack}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="font-cyber">Back</span>
            </button>
            
            <div className="text-center">
              <div className="text-2xl font-cyber font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                FTC QUIZ
              </div>
              {user && (
                <div className="text-xs text-gray-400 mt-1">
                  Welcome, {user.user_metadata?.username || user.user_metadata?.full_name || user.email}
                </div>
              )}
            </div>

            {user && (
              <button
                onClick={async () => {
                  await supabase.auth.signOut()
                  router.push('/login')
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm transition-colors"
              >
                Logout
              </button>
            )}
          </div>
        </div>

        {/* Mode Selection */}
        <div className="relative z-10 p-6">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-cyber font-bold text-center text-white mb-8">
              Choose Your Quiz Mode
            </h1>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Daily Ranked Quiz */}
              <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 hover:border-red-500/50 transition-all group">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-full mb-6 group-hover:bg-red-500/30 transition-colors">
                    <Trophy className="w-8 h-8 text-red-500" />
                  </div>
                  <h2 className="text-2xl font-cyber font-bold text-white mb-4">Daily Ranked Quiz</h2>
                <p className="text-gray-300 mb-6">
                  Test your knowledge with today's daily challenge
                </p>
                
                {!todaysAttempt && (
                  <div className="space-y-3 text-gray-300">
                    <div className="flex items-center justify-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>15 questions • Changes daily</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <Users className="w-4 h-4" />
                      <span>Affects leaderboard ranking</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <Trophy className="w-4 h-4" />
                      <span>Ranked by score, accuracy & time</span>
                    </div>
                  </div>
                )}                  {loadingAttempt ? (
                    <div className="mt-6 px-6 py-3 bg-gray-600 rounded-lg text-white">
                      Checking today's attempt...
                    </div>
                  ) : todaysAttempt ? (
                    <div className="mt-6 space-y-3">
                      <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-4">
                        <div className="text-green-400 font-semibold mb-2">✅ Completed Today!</div>
                        <div className="text-white text-lg font-bold">
                          Score: {todaysAttempt.score}/{todaysAttempt.total_questions}
                        </div>
                        <div className="text-gray-300 text-sm">
                          Accuracy: {todaysAttempt.accuracy}%
                        </div>
                        {userRank && (
                          <div className="text-yellow-400 text-sm mt-2">
                            🏆 Leaderboard Rank: #{userRank}
                          </div>
                        )}
                      </div>
                      <div className="text-gray-400 text-sm text-center">
                        Come back tomorrow for a new challenge!
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => selectMode('ranked')}
                      className="mt-6 px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-white font-semibold transition-colors w-full"
                    >
                      Start Daily Challenge
                    </button>
                  )}
                </div>
              </div>

              {/* Practice Quiz */}
              <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 hover:border-blue-500/50 transition-all group cursor-pointer"
                   onClick={() => selectMode('practice')}>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/20 rounded-full mb-6 group-hover:bg-blue-500/30 transition-colors">
                    <BookOpen className="w-8 h-8 text-blue-500" />
                  </div>
                  <h2 className="text-2xl font-cyber font-bold text-white mb-4">Practice Quiz</h2>
                  <div className="space-y-3 text-gray-300">
                    <div className="flex items-center justify-center space-x-2">
                      <BookOpen className="w-4 h-4" />
                      <span>50+ questions • Available anytime</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>No time pressure</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <Users className="w-4 h-4" />
                      <span>Doesn't affect leaderboard</span>
                    </div>
                  </div>
                  <button className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition-colors w-full">
                    Start Practice
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedBackground />
      
      {/* Header */}
      <div className="relative z-20 p-6">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <button
            onClick={handleBack}
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-cyber">Back</span>
          </button>
          
          <div className="text-center">
            <div className="text-2xl font-cyber font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
              {selectedMode === 'ranked' ? 'DAILY RANKED QUIZ' : 'PRACTICE QUIZ'}
            </div>
            {user && (
              <div className="text-xs text-gray-400 mt-1">
                Welcome, {user.user_metadata?.username || user.user_metadata?.full_name || user.email}
              </div>
            )}
          </div>

          {user && (
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                router.push('/login')
              }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm transition-colors"
            >
              Logout
            </button>
          )}
        </div>
      </div>

      {/* Quiz Interface */}
      <div className="relative z-10">
        <QuizInterface
          season="2025-2026"
          mode={selectedMode}
          onBack={handleBack}
          isGuest={false}
          onComplete={handleQuizComplete}
        />
      </div>
    </div>
  )
}
