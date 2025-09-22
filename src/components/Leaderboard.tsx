'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/utils/supabaseClient'
import { Trophy, User, Medal, ArrowLeft, Star, Crown } from 'lucide-react'

interface IndividualLeaderboard {
  id: string
  username: string
  full_name: string
  team_number: number
  team_name: string
  best_score: number
  best_accuracy: number
  best_time: number
  attempts: number
  last_attempt: string
  rank: number
  elo_rating: number
  peak_elo: number
}

interface LeaderboardProps {
  onBack: () => void
}

export default function Leaderboard({ onBack }: LeaderboardProps) {
  const [individualData, setIndividualData] = useState<IndividualLeaderboard[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    getCurrentUser()
    fetchLeaderboardData()

    // Listen for quiz completion events to refresh leaderboard
    const handleQuizCompleted = () => {
      console.log('Quiz completed, refreshing leaderboard...')
      fetchLeaderboardData()
    }

    window.addEventListener('quizCompleted', handleQuizCompleted)
    
    return () => {
      window.removeEventListener('quizCompleted', handleQuizCompleted)
    }
  }, [])

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)
  }

  const fetchLeaderboardData = async () => {
    console.log('Fetching leaderboard data...')
    setLoading(true)
    
    try {
      // Get all user profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, username, full_name, team_number, team_name, elo_rating, peak_elo')

      if (profilesError) throw profilesError

      console.log('User profiles:', profiles)

      // Build leaderboard data
      const leaderboardData: IndividualLeaderboard[] = []

      for (const profile of profiles) {
        // Get quiz stats for this user
        const { data: quizAttempts, error: quizError } = await supabase
          .from('ranked_quiz_attempts')
          .select('score, accuracy, time_taken, created_at')
          .eq('user_id', profile.user_id)
          .eq('is_guest', false)

        if (quizError) {
          console.error('Error fetching quiz attempts for', profile.username, quizError)
          continue
        }

        console.log(`Quiz attempts for ${profile.username}:`, quizAttempts)

        // Calculate stats
        const attempts = quizAttempts.length
        const bestScore = attempts > 0 ? Math.max(...quizAttempts.map(q => q.score)) : 0
        const bestAccuracy = attempts > 0 ? Math.max(...quizAttempts.map(q => q.accuracy)) : 0
        const validTimes = quizAttempts.filter(q => q.time_taken != null).map(q => q.time_taken)
        const bestTime = validTimes.length > 0 ? Math.min(...validTimes) : 0
        const lastAttempt = attempts > 0 ? quizAttempts[quizAttempts.length - 1].created_at : null

        // Only include users who have made at least one attempt
        if (attempts > 0) {
          leaderboardData.push({
            id: profile.user_id,
            username: profile.username,
            full_name: profile.full_name,
            team_number: profile.team_number,
            team_name: profile.team_name,
            best_score: bestScore,
            best_accuracy: bestAccuracy,
            best_time: bestTime,
            attempts: attempts,
            last_attempt: lastAttempt,
            rank: 0, // Will be set after sorting
            elo_rating: profile.elo_rating,
            peak_elo: profile.peak_elo
          })
        }
      }

      // Sort by ELO rating (descending), then by peak ELO (descending), then by best score (descending)
      leaderboardData.sort((a, b) => {
        // Get ELO ratings from the profiles
        const userA = profiles.find(p => p.user_id === a.id)
        const userB = profiles.find(p => p.user_id === b.id)
        
        const eloA = userA?.elo_rating || 1000
        const eloB = userB?.elo_rating || 1000
        const peakEloA = userA?.peak_elo || 1000
        const peakEloB = userB?.peak_elo || 1000
        
        if (eloA !== eloB) return eloB - eloA
        if (peakEloA !== peakEloB) return peakEloB - peakEloA
        return b.best_score - a.best_score
      })

      // Assign ranks
      leaderboardData.forEach((player, index) => {
        player.rank = index + 1
      })

      console.log('Final leaderboard data:', leaderboardData)
      setIndividualData(leaderboardData)

    } catch (error) {
      console.error('Error fetching leaderboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const isCurrentUser = (userId: string) => {
    return currentUser?.id === userId
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-red-900 to-black">
        <div className="text-center">
          <motion.div 
            className="w-20 h-20 border-4 border-red-400 border-t-transparent rounded-full mx-auto mb-6"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <motion.div 
            className="text-white text-xl font-medium"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Loading Champions...
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-gray-900 via-red-900 to-black">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        {/* Floating geometric shapes */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              left: `${15 + (i % 3) * 30}%`,
              top: `${20 + Math.floor(i / 3) * 40}%`,
            }}
            animate={{
              rotate: [0, 360],
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: 8 + i * 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <div className={`w-16 h-16 border-2 rounded-lg ${
              i % 2 === 0 ? 'border-red-400/20' : 'border-orange-400/20'
            }`} />
          </motion.div>
        ))}
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="grid grid-cols-12 gap-8 h-full">
            {[...Array(144)].map((_, i) => (
              <div key={i} className="border border-white/10" />
            ))}
          </div>
        </div>
      </div>

      {/* Content Overlay */}
      <div className="relative z-10 min-h-screen flex flex-col">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-grow flex flex-col p-6"
        >
          {/* Header */}
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-between mb-8"
          >
            <motion.button
              onClick={onBack}
              whileHover={{ scale: 1.05, x: -5 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center space-x-3 text-gray-300 hover:text-white transition-all bg-gray-800/80 backdrop-blur-sm px-6 py-3 rounded-full border border-gray-600/50 hover:border-red-400/50"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Dashboard</span>
            </motion.button>

            <motion.div
              className="flex-1 text-center"
              animate={{
                textShadow: [
                  "0 0 10px rgba(239, 68, 68, 0.5)",
                  "0 0 20px rgba(239, 68, 68, 0.8)",
                  "0 0 10px rgba(239, 68, 68, 0.5)",
                ],
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <h1 className="text-5xl font-bold bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent mb-2">
                ELO LEADERBOARD
              </h1>
              <p className="text-gray-300 text-lg font-medium">
                Ranked by Skill Rating
              </p>
            </motion.div>

            <div className="w-32" /> {/* Spacer */}
          </motion.div>

          {/* Main Leaderboard Content */}
          <div className="flex-grow flex items-center justify-center">
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="w-full max-w-4xl"
            >
              {individualData.length > 0 ? (
                <div className="grid gap-6">
                  {/* Top 3 Showcase */}
                  {individualData.slice(0, 3).length > 0 && (
                    <div className="mb-8">
                      <div className="grid md:grid-cols-3 gap-6">
                        {individualData.slice(0, 3).map((player, index) => (
                          <motion.div
                            key={player.id}
                            initial={{ y: 100, opacity: 0, scale: 0.8 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            transition={{ delay: 0.6 + index * 0.2 }}
                            whileHover={{ y: -10, scale: 1.05 }}
                            className={`relative p-6 rounded-2xl border-2 backdrop-blur-sm overflow-hidden ${
                              index === 0 
                                ? 'border-yellow-400/50 bg-gradient-to-br from-yellow-400/10 to-orange-400/10' 
                                : index === 1 
                                ? 'border-slate-300/50 bg-gradient-to-br from-slate-300/10 to-slate-500/10'
                                : 'border-amber-600/50 bg-gradient-to-br from-amber-600/10 to-amber-800/10'
                            }`}
                          >
                            {/* Rank indicator */}
                            <div className={`absolute -top-3 -right-3 w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold border-4 ${
                              index === 0 
                                ? 'bg-gradient-to-br from-yellow-300 to-yellow-500 border-yellow-200 text-yellow-900' 
                                : index === 1 
                                ? 'bg-gradient-to-br from-slate-200 to-slate-400 border-slate-100 text-slate-800'
                                : 'bg-gradient-to-br from-amber-400 to-amber-600 border-amber-300 text-amber-900'
                            }`}>
                              {index === 0 ? <Crown className="w-6 h-6" /> : index + 1}
                            </div>

                            {/* Animated background effect */}
                            <motion.div
                              className={`absolute inset-0 opacity-20 ${
                                index === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-400' 
                                : index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500'
                                : 'bg-gradient-to-br from-amber-400 to-amber-600'
                              }`}
                              animate={{
                                scale: [1, 1.1, 1],
                                opacity: [0.1, 0.3, 0.1],
                              }}
                              transition={{ duration: 4, repeat: Infinity }}
                            />

                            <div className="relative z-10 text-center">
                              <div className="text-white font-bold text-xl mb-2">
                                {player.username}
                              </div>
                              <div className="text-slate-300 text-sm mb-2">
                                Team {player.team_number}
                              </div>
                              
                              {/* ELO Rating - Most Prominent */}
                              <div className={`text-3xl font-bold mb-4 ${
                                index === 0 ? 'text-yellow-300' 
                                : index === 1 ? 'text-slate-200'
                                : 'text-amber-300'
                              }`}>
                                {player.elo_rating} ELO
                              </div>
                              
                              <div className="grid grid-cols-1 gap-4 text-sm">
                                <div className="bg-black/20 rounded-lg p-2">
                                  <div className="text-slate-400">Peak ELO</div>
                                  <div className="text-white font-bold">{player.peak_elo}</div>
                                </div>
                              </div>

                              {isCurrentUser(player.id) && (
                                <motion.div 
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="mt-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-2 rounded-full text-sm font-bold"
                                >
                                  ⭐ YOU ⭐
                                </motion.div>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rest of Rankings */}
                  {individualData.length > 3 && (
                    <div className="space-y-3">
                      <h3 className="text-xl font-bold text-gray-300 mb-4 flex items-center">
                        <Star className="w-5 h-5 mr-2 text-red-400" />
                        Other Champions
                      </h3>
                      {individualData.slice(3).map((player, index) => (
                        <motion.div
                          key={player.id}
                          initial={{ x: -100, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.8 + index * 0.05 }}
                          whileHover={{ scale: 1.02, x: 10 }}
                          className={`p-4 rounded-xl border backdrop-blur-sm transition-all ${
                            isCurrentUser(player.id) 
                              ? 'border-red-400/50 bg-red-400/10' 
                              : 'border-gray-600/30 bg-gray-800/20 hover:border-gray-500/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-800 rounded-full flex items-center justify-center border-2 border-gray-500">
                                <span className="text-white font-bold">#{player.rank}</span>
                              </div>
                              <div>
                                <div className="text-white font-bold flex items-center">
                                  {player.username}
                                  {isCurrentUser(player.id) && (
                                    <span className="ml-2 text-xs bg-red-500 text-white px-2 py-1 rounded-full">YOU</span>
                                  )}
                                </div>
                                <div className="text-gray-400 text-sm">Team {player.team_number}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-white font-bold text-lg">{player.elo_rating} ELO</div>
                              <div className="text-gray-400 text-sm">Peak: {player.peak_elo}</div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* Current User Rank */}
                  {currentUser && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1 }}
                      className="mt-8 p-6 bg-gradient-to-r from-slate-800/80 to-slate-900/80 border border-cyan-400/30 rounded-xl backdrop-blur-sm"
                    >
                      <div className="text-center">
                        {(() => {
                          const userRank = individualData.find(player => isCurrentUser(player.id))?.rank
                          if (userRank) {
                            return (
                              <div className="text-white">
                                <span className="text-cyan-400 font-bold text-lg">Your Current Rank: </span>
                                <span className="text-2xl font-bold">#{userRank}</span>
                                {userRank <= 3 && <span className="ml-2 text-2xl">🎉</span>}
                              </div>
                            )
                          } else {
                            return (
                              <div className="text-slate-400 text-lg">
                                Complete a quiz to join the leaderboard!
                              </div>
                            )
                          }
                        })()}
                      </div>
                    </motion.div>
                  )}
                </div>
              ) : (
                <div className="text-center py-20">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Trophy className="w-32 h-32 text-slate-500 mx-auto mb-6" />
                  </motion.div>
                  <h2 className="text-white text-3xl font-bold mb-4">No Champions Yet</h2>
                  <p className="text-slate-400 text-xl">Be the first to conquer the quiz and claim your throne!</p>
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
