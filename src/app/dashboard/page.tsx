'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/utils/supabaseClient'
import AnimatedBackground from '@/components/AnimatedBackground'
import SeasonSelector from '@/components/SeasonSelector'
import Leaderboard from '@/components/Leaderboard'
import RecentQuizzes from '@/components/RecentQuizzes'
import { 
  Brain, 
  Trophy, 
  Users, 
  Play, 
  Settings, 
  BookOpen, 
  Zap, 
  TrendingUp,
  Calendar,
  Award,
  Clock,
  LogOut,
  Target,
  Star,
  Timer,
  BarChart3,
  Shield,
  Flame,
  Rocket,
  CheckCircle,
  ArrowRight
} from 'lucide-react'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentView, setCurrentView] = useState<'dashboard' | 'leaderboard'>('dashboard')
  const [userStats, setUserStats] = useState({
    bestAccuracy: 0,
    totalQuestionsAnswered: 0,
    quizzesCompleted: 0,
    currentRank: 0,
    streakDays: 0,
    averageResponseTime: 0,
    improvementTrend: 0
  })
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser()
      
      if (!data?.user) {
        router.push('/login')
        return
      }
      
      setUser(data.user)
      
      // Load user stats from database
      try {
        // Get all quiz attempts to calculate comprehensive stats
        const { data: allAttempts, error: attemptsError } = await supabase
          .from('quiz_attempts')
          .select('score, total_questions, time_taken, created_at')
          .eq('user_id', data.user.id)
          .eq('is_guest', false)
          .order('created_at', { ascending: false })

        // Also check ranked_quiz_attempts table
        const { data: rankedAttempts, error: rankedError } = await supabase
          .from('ranked_quiz_attempts')
          .select('score, total_questions, time_taken, created_at, accuracy')
          .eq('user_id', data.user.id)
          .order('created_at', { ascending: false })

        // Combine both attempt types
        const combinedAttempts = [...(allAttempts || []), ...(rankedAttempts || [])]
        
        // Calculate stats
        let totalQuestionsAnswered = 0
        let bestAccuracy = 0
        let totalTime = 0
        let validTimeEntries = 0
        
        combinedAttempts.forEach(attempt => {
          totalQuestionsAnswered += attempt.total_questions || 0
          const accuracy = (attempt as any).accuracy || (attempt.total_questions > 0 ? (attempt.score / attempt.total_questions) * 100 : 0)
          if (accuracy > bestAccuracy) {
            bestAccuracy = accuracy
          }
          if (attempt.time_taken && attempt.time_taken > 0) {
            totalTime += attempt.time_taken
            validTimeEntries++
          }
        })

        // Calculate streak (simplified - count recent attempts)
        const now = new Date()
        const recentAttempts = combinedAttempts.filter(attempt => {
          const attemptDate = new Date(attempt.created_at)
          const daysDiff = Math.floor((now.getTime() - attemptDate.getTime()) / (1000 * 60 * 60 * 24))
          return daysDiff <= 7 // Last 7 days
        })

        // Get user's rank from leaderboard
        const { data: userRankData } = await supabase
          .from('individual_leaderboard')
          .select('rank')
          .or(`user_id.eq.${data.user.id},username.eq.${data.user.user_metadata?.username || data.user.email}`)
          .single()

        // Calculate improvement trend (compare first half vs second half of attempts)
        let improvementTrend = 0
        if (combinedAttempts.length >= 4) {
          const midPoint = Math.floor(combinedAttempts.length / 2)
          const recentHalf = combinedAttempts.slice(0, midPoint)
          const olderHalf = combinedAttempts.slice(midPoint)
          
          const recentAvg = recentHalf.reduce((sum, a) => sum + (a.score / a.total_questions * 100), 0) / recentHalf.length
          const olderAvg = olderHalf.reduce((sum, a) => sum + (a.score / a.total_questions * 100), 0) / olderHalf.length
          
          improvementTrend = Math.round(recentAvg - olderAvg)
        }

        setUserStats({
          bestAccuracy: Math.round(bestAccuracy),
          totalQuestionsAnswered,
          quizzesCompleted: combinedAttempts.length,
          currentRank: userRankData?.rank || 0,
          streakDays: recentAttempts.length,
          averageResponseTime: validTimeEntries > 0 ? Math.round(totalTime / validTimeEntries) : 0,
          improvementTrend
        })
      } catch (error) {
        console.error('Error loading user stats:', error)
        // Fallback values
        setUserStats({
          bestAccuracy: 0,
          totalQuestionsAnswered: 0,
          quizzesCompleted: 0,
          currentRank: 0,
          streakDays: 0,
          averageResponseTime: 0,
          improvementTrend: 0
        })
      }
      
      setLoading(false)
    }
    
    getUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  if (loading) return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedBackground />
      <div className="relative z-10 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white text-lg">Loading Dashboard...</div>
        </div>
      </div>
    </div>
  )
  
  if (!user) return null

  // Show leaderboard view
  if (currentView === 'leaderboard') {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <AnimatedBackground />
        <div className="relative z-10">
          <Leaderboard onBack={() => setCurrentView('dashboard')} />
        </div>
      </div>
    )
  }

  const quickActions = [
    { 
      icon: Play, 
      label: 'Start Quiz', 
      description: 'Test your FTC knowledge',
      action: () => router.push('/quiz'), 
      color: 'from-red-500 to-red-600',
      hoverColor: 'hover:from-red-600 hover:to-red-700'
    },
    { 
      icon: Trophy, 
      label: 'Leaderboard', 
      description: 'See individual rankings',
      action: () => setCurrentView('leaderboard'), 
      color: 'from-yellow-500 to-orange-500',
      hoverColor: 'hover:from-yellow-600 hover:to-orange-600'
    },
    { 
      icon: BookOpen, 
      label: 'Study Mode', 
      description: 'Review game manual',
      action: () => {}, 
      color: 'from-blue-500 to-purple-500',
      hoverColor: 'hover:from-blue-600 hover:to-purple-600'
    }
  ]

  const statCards = [
    { 
      label: 'Questions Answered', 
      value: userStats.totalQuestionsAnswered.toString(), 
      icon: Target, 
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    },
    { 
      label: 'Quizzes Completed', 
      value: userStats.quizzesCompleted.toString(), 
      icon: Brain, 
      color: 'text-green-400',
      bgColor: 'bg-green-500/10'
    },
    { 
      label: 'Activity Streak', 
      value: `${userStats.streakDays} ${userStats.streakDays === 1 ? 'day' : 'days'}`, 
      icon: Calendar, 
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10'
    }
  ]

  return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedBackground />
      
      <div className="relative z-10 min-h-screen">
        {/* Modern Header with Glass Effect */}
        <motion.header
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="p-6 backdrop-blur-xl bg-black/20 border-b border-white/10"
        >
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-4">
                <motion.div 
                  className="relative"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-red-500 via-red-600 to-red-700 rounded-2xl flex items-center justify-center shadow-2xl">
                    <Brain className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                </motion.div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                    Mission Control
                  </h1>
                  <p className="text-gray-400 text-sm flex items-center mt-1">
                    <Rocket className="w-4 h-4 mr-2" />
                    Welcome back, {user.user_metadata?.username || user.user_metadata?.full_name || user.email}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-6">
                <div className="text-right">
                  <div className="text-sm text-gray-400 flex items-center justify-end">
                    <Shield className="w-4 h-4 mr-1" />
                    Team Status
                  </div>
                  <div className="text-white font-bold text-lg">
                    {user.user_metadata?.team_number ? `FTC #${user.user_metadata.team_number}` : 'Independent'}
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLogout}
                  className="p-3 bg-red-600/20 hover:bg-red-600/30 backdrop-blur-sm rounded-xl text-red-400 hover:text-red-300 transition-all border border-red-600/30"
                  title="Sign Out"
                >
                  <LogOut className="w-5 h-5" />
                </motion.button>
              </div>
            </div>

            {/* Quick Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-sm rounded-xl p-4 border border-yellow-500/30"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-yellow-400">
                      {userStats.bestAccuracy}%
                    </div>
                    <div className="text-xs text-yellow-300/80">Best Accuracy</div>
                  </div>
                  <Trophy className="w-6 h-6 text-yellow-400" />
                </div>
              </motion.div>

              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm rounded-xl p-4 border border-blue-500/30"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-blue-400">{userStats.quizzesCompleted}</div>
                    <div className="text-xs text-blue-300/80">Completed</div>
                  </div>
                  <CheckCircle className="w-6 h-6 text-blue-400" />
                </div>
              </motion.div>

              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-xl p-4 border border-green-500/30"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-green-400">{userStats.streakDays}</div>
                    <div className="text-xs text-green-300/80">Day Streak</div>
                  </div>
                  <Flame className="w-6 h-6 text-green-400" />
                </div>
              </motion.div>

              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="bg-gradient-to-r from-red-500/20 to-pink-500/20 backdrop-blur-sm rounded-xl p-4 border border-red-500/30"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-red-400">#{userStats.currentRank || 'N/A'}</div>
                    <div className="text-xs text-red-300/80">Current Rank</div>
                  </div>
                  <Star className="w-6 h-6 text-red-400" />
                </div>
              </motion.div>
            </div>
          </div>
        </motion.header>

        {/* Main Dashboard Grid */}
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-12 gap-6">
              
              {/* Left Column - Main Actions */}
              <div className="col-span-12 lg:col-span-8 space-y-6">
                
                {/* Quiz Launch Pad */}
                <motion.div
                  initial={{ x: -100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.8 }}
                  className="bg-black/30 backdrop-blur-xl rounded-2xl p-8 border border-white/10"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-2">Quiz Launch Pad</h2>
                      <p className="text-gray-400">Choose your challenge and test your FTC knowledge</p>
                    </div>
                    <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center">
                      <Rocket className="w-8 h-8 text-white" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <motion.button
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => router.push('/quiz?mode=ranked')}
                      className="group bg-gradient-to-br from-red-600 via-red-700 to-red-800 rounded-xl p-6 text-left transition-all shadow-xl hover:shadow-2xl relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-red-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                          <Timer className="w-8 h-8 text-white" />
                          <div className="px-3 py-1 bg-red-500/30 rounded-full text-xs text-red-200 border border-red-400/30">
                            DAILY
                          </div>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Ranked Quiz</h3>
                        <p className="text-sm text-red-100/80 mb-4">Timed daily challenge with leaderboard points</p>
                        <div className="flex items-center text-red-200 text-sm">
                          <span>Start Challenge</span>
                          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => router.push('/quiz?mode=practice')}
                      className="group bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 rounded-xl p-6 text-left transition-all shadow-xl hover:shadow-2xl relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                          <BookOpen className="w-8 h-8 text-white" />
                          <div className="px-3 py-1 bg-blue-500/30 rounded-full text-xs text-blue-200 border border-blue-400/30">
                            PRACTICE
                          </div>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Practice Mode</h3>
                        <p className="text-sm text-blue-100/80 mb-4">Unlimited practice with detailed explanations</p>
                        <div className="flex items-center text-blue-200 text-sm">
                          <span>Start Practice</span>
                          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </motion.button>
                  </div>
                </motion.div>

                {/* Performance Analytics */}
                <motion.div
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.8, duration: 0.8 }}
                  className="bg-black/30 backdrop-blur-xl rounded-2xl p-8 border border-white/10"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-2">Performance Analytics</h2>
                      <p className="text-gray-400">Track your progress and identify areas for improvement</p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-purple-400" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 rounded-xl p-4 border border-purple-500/30">
                      <div className="flex items-center justify-between mb-3">
                        <Target className="w-6 h-6 text-purple-400" />
                        <span className="text-xs text-purple-300 bg-purple-500/20 px-2 py-1 rounded-full">ACCURACY</span>
                      </div>
                      <div className="text-2xl font-bold text-white mb-1">
                        {userStats.bestAccuracy}%
                      </div>
                      <div className="text-sm text-purple-300">Best Accuracy</div>
                    </div>

                    <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 rounded-xl p-4 border border-green-500/30">
                      <div className="flex items-center justify-between mb-3">
                        <Clock className="w-6 h-6 text-green-400" />
                        <span className="text-xs text-green-300 bg-green-500/20 px-2 py-1 rounded-full">SPEED</span>
                      </div>
                      <div className="text-2xl font-bold text-white mb-1">{userStats.averageResponseTime || 0}s</div>
                      <div className="text-sm text-green-300">Avg Response</div>
                    </div>

                    <div className="bg-gradient-to-br from-orange-600/20 to-orange-800/20 rounded-xl p-4 border border-orange-500/30">
                      <div className="flex items-center justify-between mb-3">
                        <TrendingUp className="w-6 h-6 text-orange-400" />
                        <span className="text-xs text-orange-300 bg-orange-500/20 px-2 py-1 rounded-full">TREND</span>
                      </div>
                      <div className="text-2xl font-bold text-white mb-1">
                        {userStats.improvementTrend > 0 ? '+' : ''}{userStats.improvementTrend}%
                      </div>
                      <div className="text-sm text-orange-300">Improvement</div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Right Column - Secondary Info */}
              <div className="col-span-12 lg:col-span-4 space-y-6">
                
                {/* Daily Challenge Status */}
                <motion.div
                  initial={{ x: 100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.7, duration: 0.8 }}
                  className="bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-white/10"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">Today's Challenge</h3>
                    <Calendar className="w-6 h-6 text-red-400" />
                  </div>
                  
                  <div className="text-center py-6">
                    <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center">
                      <Zap className="w-10 h-10 text-white" />
                    </div>
                    <div className="text-sm text-gray-400 mb-2">Status</div>
                    <div className="text-green-400 font-bold">Ready to Start</div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => router.push('/quiz?mode=ranked')}
                    className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white font-bold py-3 rounded-xl hover:from-red-700 hover:to-red-800 transition-all"
                  >
                    Take Today's Quiz
                  </motion.button>
                </motion.div>

                {/* Leaderboard Preview */}
                <motion.div
                  initial={{ x: 100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.9, duration: 0.8 }}
                  className="bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-white/10"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">Leaderboard</h3>
                    <Trophy className="w-6 h-6 text-yellow-400" />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                          <span className="text-black font-bold text-sm">1</span>
                        </div>
                        <span className="text-white font-medium">Top Scorer</span>
                      </div>
                      <span className="text-yellow-400 font-bold">98%</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-500/10 rounded-lg border border-gray-500/20">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                          <span className="text-black font-bold text-sm">2</span>
                        </div>
                        <span className="text-white font-medium">Runner Up</span>
                      </div>
                      <span className="text-gray-400 font-bold">95%</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-orange-600/10 rounded-lg border border-orange-600/20">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">3</span>
                        </div>
                        <span className="text-white font-medium">Third Place</span>
                      </div>
                      <span className="text-orange-400 font-bold">92%</span>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setCurrentView('leaderboard')}
                    className="w-full mt-4 bg-yellow-600/20 border border-yellow-500/30 text-yellow-400 font-bold py-3 rounded-xl hover:bg-yellow-600/30 transition-all"
                  >
                    View Full Rankings
                  </motion.button>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
