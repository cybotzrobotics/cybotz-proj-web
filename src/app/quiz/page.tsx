'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/utils/supabaseClient'
import AnimatedBackground from '@/components/AnimatedBackground'
import QuizInterface from '@/components/QuizInterface'
import { ArrowLeft, Trophy, BookOpen, Calendar, Users, Clock } from 'lucide-react'

export default function QuizPage() {
  const [user, setUser] = useState<any>(null)
  const [isGuest, setIsGuest] = useState(false)
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
    setIsGuest(guestMode)
    if (mode) setSelectedMode(mode)

    // Check authentication status
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user && !guestMode) {
        // If not logged in and not guest mode, redirect to login
        router.push('/login')
        return
      }
      
      setUser(user)
      
      if (user) {
        await checkTodaysAttempt(user.id)
      } else {
        setLoadingAttempt(false)
      }
    }

    checkUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' && !guestMode) {
        router.push('/login')
      } else if (session?.user) {
        setUser(session.user)
        checkTodaysAttempt(session.user.id)
      }
    })

    return () => subscription.unsubscribe()
  }, [router, searchParams])

  const checkTodaysAttempt = async (userId: string) => {
    setLoadingAttempt(true)
    try {
      // Check if user has already taken today's ranked quiz
      const today = new Date().toISOString().split('T')[0]
      console.log('Checking for attempts on:', today)
      
      // First try the new ranked_quiz_attempts table
      const { data: rankedAttempt, error: rankedError } = await supabase
        .from('ranked_quiz_attempts')
        .select('*')
        .eq('user_id', userId)
        .eq('date_attempted', today)
        .single()

      let attempt = rankedAttempt

      // If ranked table doesn't exist or no attempt found, check old table
      if (rankedError && rankedError.code === '42P01') {
        console.log('ranked_quiz_attempts table does not exist, checking quiz_attempts')
      }
      
      if (!attempt) {
        // Fallback: check quiz_attempts table for today's attempts
        const { data: oldAttempts, error: oldError } = await supabase
          .from('quiz_attempts')
          .select('*')
          .eq('user_id', userId)
          .gte('created_at', today + 'T00:00:00')
          .lt('created_at', today + 'T23:59:59')
          .order('created_at', { ascending: false })
          .limit(1)

        if (!oldError && oldAttempts && oldAttempts.length > 0) {
          attempt = oldAttempts[0]
          // Add date_attempted field if missing
          attempt.date_attempted = today
        }
      }

      if (attempt) {
        console.log('Found today\'s attempt:', attempt)
        setTodaysAttempt(attempt)
        
        // Get user's current rank from leaderboard
        const { data: leaderboard, error: rankError } = await supabase
          .from('individual_leaderboard')
          .select('rank, username')
          .eq('username', user?.user_metadata?.username || user?.email)
          .single()

        if (!rankError && leaderboard) {
          setUserRank(leaderboard.rank)
        }
      } else {
        console.log('No attempt found for today')
        setTodaysAttempt(null)
      }
    } catch (error) {
      console.error('Error checking today\'s attempt:', error)
    } finally {
      setLoadingAttempt(false)
    }
  }

  const handleBack = () => {
    if (selectedMode) {
      setSelectedMode(null)
      router.push('/quiz') // Go back to mode selection
    } else if (isGuest || !user) {
      router.push('/login')
    } else {
      router.push('/login') // Since we removed dashboard, go back to login
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
    router.push(`/quiz?mode=${mode}${isGuest ? '&guest=true' : ''}`)
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
              {isGuest && (
                <div className="text-xs text-gray-400 mt-1">Guest Mode</div>
              )}
              {user && (
                <div className="text-xs text-gray-400 mt-1">
                  Welcome, {user.user_metadata?.username || user.user_metadata?.full_name || user.email}
                </div>
              )}
            </div>

            {!isGuest && user && (
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
                  
                  {loadingAttempt ? (
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
                          Accuracy: {todaysAttempt.accuracy || Math.round((todaysAttempt.score / todaysAttempt.total_questions) * 100)}% • Time: {Math.floor(todaysAttempt.time_taken / 60)}:{String(todaysAttempt.time_taken % 60).padStart(2, '0')}
                        </div>
                        {userRank && (
                          <div className="text-yellow-400 text-sm mt-2">
                            🏆 Leaderboard Rank: #{userRank}
                          </div>
                        )}
                      </div>
                      <div className="text-gray-400 text-sm">
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
            {isGuest && (
              <div className="text-xs text-gray-400 mt-1">Guest Mode</div>
            )}
            {user && (
              <div className="text-xs text-gray-400 mt-1">
                Welcome, {user.user_metadata?.username || user.user_metadata?.full_name || user.email}
              </div>
            )}
          </div>

          {!isGuest && user && (
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
          season="2024-2025"
          mode={selectedMode}
          onBack={handleBack}
          isGuest={isGuest}
          onComplete={handleQuizComplete}
        />
      </div>
    </div>
  )
}
