'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { supabase } from '@/utils/supabaseClient'
import AnimatedBackground from '@/components/AnimatedBackground'
import Leaderboard from '@/components/Leaderboard'
import { 
  Brain, 
  Trophy, 
  Users, 
  Play, 
  LogOut,
  Target,
  Calendar,
  Award,
  Zap,
  CheckCircle,
  Flame
} from 'lucide-react'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentView, setCurrentView] = useState<'dashboard' | 'leaderboard'>('dashboard')
  const [userStats, setUserStats] = useState({
    questionsCorrect: 0,
    totalQuestionsAnswered: 0,
    streakDays: 0,
    currentRank: 0,
    teamRank: 0,
    eloRating: 1000,
    peakElo: 1000,
    eloTier: 'Novice'
  })
  const router = useRouter()

  useEffect(() => {
    getUser()
  }, [])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  const getUser = async () => {
    const { data, error } = await supabase.auth.getUser()
    
    if (!data?.user) {
      router.push('/login')
      return
    }

    setUser(data.user)

    // Load user stats from database
    try {
      // Get all ranked quiz attempts to calculate comprehensive stats
      const { data: rankedAttempts, error: rankedError } = await supabase
        .from('ranked_quiz_attempts')
        .select('score, total_questions, time_taken, created_at, accuracy')
        .eq('user_id', data.user.id)
        .order('created_at', { ascending: false })

      const combinedAttempts = rankedAttempts || []
      
      // Calculate stats
      let totalQuestionsAnswered = 0
      let totalCorrectAnswers = 0
      
      combinedAttempts.forEach(attempt => {
        totalQuestionsAnswered += attempt.total_questions || 0
        totalCorrectAnswers += attempt.score || 0
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

      // Get user's ELO and profile data
      let { data: userProfile } = await supabase
        .from('user_profiles')
        .select('elo_rating, peak_elo, team_number')
        .eq('user_id', data.user.id)
        .single()

      // If no profile exists, create one
      if (!userProfile) {
        console.log('No profile found, creating one...')
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: data.user.id,
            username: data.user.user_metadata?.username || data.user.email?.split('@')[0] || 'User',
            full_name: data.user.user_metadata?.full_name || data.user.email || 'Unknown User',
            team_number: data.user.user_metadata?.team_number || 12345, // Default test team
            elo_rating: 1000,
            peak_elo: 1000
          })
          .select('elo_rating, peak_elo, team_number')
          .single()
        
        if (createError) {
          console.error('Error creating profile:', createError)
          // Use default values if creation fails
          userProfile = { 
            elo_rating: 1000, 
            peak_elo: 1000, 
            team_number: data.user.user_metadata?.team_number || 12345 
          }
        } else {
          userProfile = newProfile
        }
      }

      // Calculate ELO tier
      const getEloTier = (elo: number) => {
        if (elo >= 2000) return 'Grandmaster'
        if (elo >= 1800) return 'Master'
        if (elo >= 1600) return 'Expert'
        if (elo >= 1400) return 'Advanced'
        if (elo >= 1200) return 'Intermediate'
        if (elo >= 1000) return 'Novice'
        return 'Beginner'
      }

      const currentElo = userProfile?.elo_rating || 1000
      const peakElo = userProfile?.peak_elo || 1000
      const eloTier = getEloTier(currentElo)

      // Get user's team rank from team leaderboard
      let teamRank = 0
      try {
        const teamNumber = userProfile?.team_number
        if (teamNumber) {
          const { data: teamRankData } = await supabase
            .from('team_leaderboard')
            .select('rank')
            .eq('team_number', teamNumber)
            .single()
          
          teamRank = teamRankData?.rank || 0
        }
      } catch (error) {
        console.log('Could not fetch team rank:', error)
      }

      setUserStats({
        questionsCorrect: totalCorrectAnswers,
        totalQuestionsAnswered,
        currentRank: userRankData?.rank || 0,
        teamRank,
        eloRating: currentElo,
        peakElo: peakElo,
        eloTier: eloTier,
        streakDays: recentAttempts.length
      })
      
    } catch (error) {
      console.error('Error loading user stats:', error)
      setUserStats({
        questionsCorrect: 0,
        totalQuestionsAnswered: 0,
        currentRank: 0,
        teamRank: 0,
        eloRating: 1000,
        peakElo: 1000,
        eloTier: 'Novice',
        streakDays: 0
      })
    }
    
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
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
  }
  
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

  return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedBackground />
      
      <div className="relative z-10 min-h-screen">
        {/* Header */}
        <motion.header
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="p-6"
        >
          <div className="max-w-7xl mx-auto">
            {/* Top Navigation */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <motion.div 
                  className="relative"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-red-500 via-red-600 to-red-700 rounded-2xl flex items-center justify-center shadow-2xl p-1">
                    <Image 
                      src="/cybotz.png" 
                      alt="Cybotz Logo" 
                      width={48} 
                      height={48} 
                      className="w-12 h-12"
                    />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                </motion.div>
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">
                    Welcome back, {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Warrior'}!
                  </h1>
                  <p className="text-gray-400">Ready to dominate today's quiz challenges?</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-lg transition-colors border border-red-500/30"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {/* Questions Correct */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-black/20 backdrop-blur-sm rounded-xl p-4 border border-white/10"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-yellow-400">
                      {userStats.questionsCorrect}
                    </div>
                    <div className="text-xs text-gray-300">Questions Correct</div>
                  </div>
                  <CheckCircle className="w-6 h-6 text-yellow-400" />
                </div>
              </motion.div>

              {/* ELO Rating */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="bg-black/20 backdrop-blur-sm rounded-xl p-4 border border-white/10"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-purple-400">{userStats.eloRating}</div>
                    <div className="text-xs text-gray-300">ELO Rating</div>
                  </div>
                  <Trophy className="w-6 h-6 text-purple-400" />
                </div>
              </motion.div>

              {/* Activity Streak */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-black/20 backdrop-blur-sm rounded-xl p-4 border border-white/10"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-green-400">{userStats.streakDays}</div>
                    <div className="text-xs text-gray-300">Day Streak</div>
                  </div>
                  <Flame className="w-6 h-6 text-green-400" />
                </div>
              </motion.div>

              {/* Team Rank */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="bg-black/20 backdrop-blur-sm rounded-xl p-4 border border-white/10"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-blue-400">#{userStats.teamRank || 'N/A'}</div>
                    <div className="text-xs text-gray-300">Team Rank</div>
                  </div>
                  <Users className="w-6 h-6 text-blue-400" />
                </div>
              </motion.div>
            </div>
          </div>
        </motion.header>

        {/* Main Content */}
        <div className="px-6 pb-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* ELO Card */}
              <motion.div
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="lg:col-span-1 bg-black/20 backdrop-blur-xl rounded-2xl p-6 border border-white/10"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">ELO Ranking</h3>
                  <Award className="w-6 h-6 text-purple-400" />
                </div>
                
                <div className="text-center py-6">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center">
                    <Trophy className="w-10 h-10 text-white" />
                  </div>
                  <div className="text-sm text-gray-400 mb-2">Current Tier</div>
                  <div className="text-purple-400 font-bold text-xl">{userStats.eloTier}</div>
                  <div className="text-sm text-gray-500 mt-1">{userStats.eloRating} ELO</div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Peak ELO</span>
                    <span className="text-white font-bold">{userStats.peakElo}</span>
                  </div>
                  <div className="h-2 bg-black/50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-purple-700 rounded-full"
                      style={{ 
                        width: `${Math.min(100, Math.max(10, ((userStats.eloRating - 900) / 1100) * 100))}%` 
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Beginner</span>
                    <span>Grandmaster</span>
                  </div>
                </div>
              </motion.div>

              {/* Quick Actions */}
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="lg:col-span-2 bg-black/20 backdrop-blur-xl rounded-2xl p-6 border border-white/10"
              >
                <h3 className="text-lg font-bold text-white mb-6">Quick Actions</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Start Quiz */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => router.push('/quiz')}
                    className="p-6 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-xl border border-red-500/30 text-left hover:from-red-500/30 hover:to-red-600/30 transition-all"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                        <Play className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="text-white font-bold">Start Quiz</h4>
                        <p className="text-gray-400 text-sm">Test your FTC knowledge</p>
                      </div>
                    </div>
                  </motion.button>

                  {/* View Leaderboard */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCurrentView('leaderboard')}
                    className="p-6 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl border border-yellow-500/30 text-left hover:from-yellow-500/30 hover:to-orange-500/30 transition-all"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="text-white font-bold">Leaderboard</h4>
                        <p className="text-gray-400 text-sm">See rankings</p>
                      </div>
                    </div>
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
