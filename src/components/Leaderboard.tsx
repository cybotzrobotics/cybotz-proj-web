'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/utils/supabaseClient'
import { Trophy, User, Medal, Target, ArrowLeft, Star, Crown, Zap, TrendingUp, ChevronRight, Award, Flame, Shield } from 'lucide-react'

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
      // Fetch individual leaderboard
      const { data: individualData, error: individualError } = await supabase
        .from('individual_leaderboard')
        .select('*')
        .limit(50)

      console.log('Individual leaderboard data:', individualData)
      console.log('Individual leaderboard error:', individualError)

      if (individualError) throw individualError
      setIndividualData(individualData || [])

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
      <div className="min-h-screen bg-gradient-to-br from-black via-red-950 to-black flex items-center justify-center">
        <div className="text-center">
          <motion.div 
            className="relative mb-8"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <div className="w-24 h-24 border-4 border-red-600/20 rounded-full"></div>
            <div className="absolute inset-0 w-24 h-24 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-4 w-16 h-16 border-2 border-maroon-400 border-b-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse' }}></div>
          </motion.div>
          <motion.div 
            className="space-y-3"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <h2 className="text-2xl font-bold bg-gradient-to-r from-red-400 via-red-500 to-red-600 bg-clip-text text-transparent">
              Initializing Battle Arena
            </h2>
            <p className="text-red-300/70">Gathering elite warriors...</p>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-red-950 to-maroon-950 relative overflow-hidden">
      {/* Cyberpunk Grid Background */}
      <div className="absolute inset-0">
        {/* Matrix-style grid */}
        <div className="absolute inset-0 opacity-10">
          <div 
            className="w-full h-full"
            style={{
              backgroundImage: `
                linear-gradient(rgba(220, 38, 38, 0.3) 1px, transparent 1px),
                linear-gradient(90deg, rgba(220, 38, 38, 0.3) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px'
            }}
          />
        </div>

        {/* Animated energy orbs */}
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              background: `radial-gradient(circle, ${
                i % 3 === 0 ? 'rgba(220, 38, 38, 0.4)' : 
                i % 3 === 1 ? 'rgba(153, 27, 27, 0.4)' : 
                'rgba(69, 10, 10, 0.4)'
              } 0%, transparent 70%)`,
              width: `${80 + i * 20}px`,
              height: `${80 + i * 20}px`,
              left: `${5 + (i % 4) * 25}%`,
              top: `${10 + Math.floor(i / 4) * 30}%`,
            }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.3, 0.7, 0.3],
              x: [-20, 20, -20],
              y: [-15, 15, -15],
            }}
            transition={{
              duration: 8 + i * 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* Glowing particles */}
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute w-1 h-1 bg-red-400 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
            }}
            transition={{
              duration: 2 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 5,
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        {/* Header Section */}
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="p-8"
        >
          <div className="max-w-7xl mx-auto">
            {/* Navigation */}
            <div className="flex items-center justify-between mb-12">
              <motion.button
                onClick={onBack}
                whileHover={{ scale: 1.05, x: -5 }}
                whileTap={{ scale: 0.95 }}
                className="group flex items-center space-x-3 bg-black/40 backdrop-blur-lg border border-red-600/30 hover:border-red-500/50 px-6 py-3 rounded-2xl transition-all duration-300"
              >
                <ArrowLeft className="w-5 h-5 text-red-400 group-hover:text-red-300" />
                <span className="text-red-300 group-hover:text-white font-medium">Battle Command</span>
              </motion.button>

              <div className="flex items-center space-x-4">
                <motion.div
                  animate={{ 
                    boxShadow: [
                      "0 0 20px rgba(220, 38, 38, 0.3)",
                      "0 0 40px rgba(220, 38, 38, 0.6)",
                      "0 0 20px rgba(220, 38, 38, 0.3)",
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="bg-gradient-to-r from-red-600 to-red-700 p-3 rounded-full"
                >
                  <Trophy className="w-8 h-8 text-white" />
                </motion.div>
              </div>
            </div>

            {/* Epic Title */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-center mb-16"
            >
              <motion.h1
                className="text-7xl font-black mb-6 relative"
                style={{
                  background: 'linear-gradient(45deg, #dc2626, #991b1b, #7f1d1d, #dc2626)',
                  backgroundSize: '300% 300%',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                ELITE RANKINGS
                <motion.div
                  className="absolute -top-4 -right-4 w-8 h-8 bg-red-500 rounded-full"
                  animate={{ 
                    scale: [1, 1.5, 1],
                    opacity: [1, 0.5, 1] 
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.h1>
              
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-xl text-red-300/80 font-medium tracking-wide"
              >
                Where Legends Are Forged • Where Victory Is Earned
              </motion.p>
            </motion.div>
          </div>
        </motion.div>
        {/* Leaderboard Content */}
        <div className="px-8 pb-8">
          <div className="max-w-7xl mx-auto">
            {individualData.length > 0 ? (
              <div className="space-y-8">
                {/* Elite Tier - Top 3 */}
                {individualData.slice(0, 3).length > 0 && (
                  <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="mb-12"
                  >
                    <motion.h2 
                      className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent"
                      animate={{ opacity: [0.7, 1, 0.7] }}
                      transition={{ duration: 3, repeat: Infinity }}
                    >
                      ⚔️ ELITE TIER ⚔️
                    </motion.h2>
                    
                    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                      {individualData.slice(0, 3).map((player, index) => {
                        const rank = index + 1;
                        return (
                          <motion.div
                            key={player.id}
                            initial={{ y: 100, opacity: 0, scale: 0.8 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            transition={{ delay: 1 + index * 0.2 }}
                            whileHover={{ y: -10, scale: 1.03 }}
                            className={`relative group ${
                              rank === 1 ? 'md:order-2 transform md:scale-110' : 
                              rank === 2 ? 'md:order-1' : 'md:order-3'
                            }`}
                          >
                            {/* Warrior Card */}
                            <div className={`relative p-8 rounded-3xl border-2 backdrop-blur-xl overflow-hidden ${
                              rank === 1 
                                ? 'border-red-500/70 bg-gradient-to-br from-red-900/60 to-red-950/60' 
                                : rank === 2 
                                ? 'border-red-600/50 bg-gradient-to-br from-red-900/40 to-black/40'
                                : 'border-red-700/50 bg-gradient-to-br from-red-950/40 to-black/30'
                            }`}>
                              
                              {/* Rank Crown/Badge */}
                              <motion.div 
                                className={`absolute -top-6 left-1/2 transform -translate-x-1/2 ${
                                  rank === 1 ? 'w-16 h-16' : 'w-12 h-12'
                                } ${
                                  rank === 1 
                                    ? 'bg-gradient-to-br from-red-400 to-red-600' 
                                    : rank === 2 
                                    ? 'bg-gradient-to-br from-red-500 to-red-700'
                                    : 'bg-gradient-to-br from-red-600 to-red-800'
                                } rounded-full flex items-center justify-center border-4 border-black shadow-2xl`}
                                animate={rank === 1 ? {
                                  boxShadow: [
                                    "0 0 30px rgba(220, 38, 38, 0.6)",
                                    "0 0 50px rgba(220, 38, 38, 0.9)",
                                    "0 0 30px rgba(220, 38, 38, 0.6)",
                                  ]
                                } : {}}
                                transition={{ duration: 2, repeat: Infinity }}
                              >
                                {rank === 1 ? (
                                  <Crown className="w-8 h-8 text-white" />
                                ) : (
                                  <span className="text-white font-black text-xl">#{rank}</span>
                                )}
                              </motion.div>

                              {/* Elite Status Indicator */}
                              <div className="text-center mb-6 pt-6">
                                <motion.div
                                  animate={{ rotate: [0, 5, 0, -5, 0] }}
                                  transition={{ duration: 4, repeat: Infinity }}
                                  className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full ${
                                    rank === 1 
                                      ? 'bg-red-500/30 border border-red-400/50' 
                                      : 'bg-red-600/20 border border-red-500/30'
                                  }`}
                                >
                                  {rank === 1 && <Flame className="w-4 h-4 text-red-300" />}
                                  <span className="text-red-200 font-bold text-sm tracking-wider">
                                    {rank === 1 ? 'LEGEND' : rank === 2 ? 'MASTER' : 'ELITE'}
                                  </span>
                                  {rank === 1 && <Flame className="w-4 h-4 text-red-300" />}
                                </motion.div>
                              </div>

                              {/* Player Info */}
                              <div className="text-center mb-6">
                                <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-red-300 transition-colors">
                                  {player.username}
                                </h3>
                                {isCurrentUser(player.id) && (
                                  <motion.div 
                                    initial={{ scale: 0, y: 10 }}
                                    animate={{ scale: 1, y: 0 }}
                                    className="inline-flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-full text-sm font-bold"
                                  >
                                    <Star className="w-4 h-4" />
                                    <span>YOUR WARRIOR</span>
                                    <Star className="w-4 h-4" />
                                  </motion.div>
                                )}
                              </div>

                              {/* Battle Stats */}
                              <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-red-300/80 font-medium">Accuracy</span>
                                  <span className="text-white font-bold text-lg">{player.best_accuracy}%</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-red-300/80 font-medium">Battles</span>
                                  <span className="text-white font-bold">{player.attempts}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-red-300/80 font-medium">Response Time</span>
                                  <span className="text-white font-bold">{player.best_time}s</span>
                                </div>
                              </div>

                              {/* Power Level Bar */}
                              <div className="mt-6">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-red-300/80 text-sm font-medium">Power Level</span>
                                  <span className="text-red-300 text-sm font-bold">{player.best_accuracy}%</span>
                                </div>
                                <div className="h-3 bg-black/50 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${player.best_accuracy}%` }}
                                    transition={{ delay: 1.5 + index * 0.2, duration: 1.5 }}
                                    className={`h-full rounded-full ${
                                      rank === 1 
                                        ? 'bg-gradient-to-r from-red-400 to-red-600' 
                                        : 'bg-gradient-to-r from-red-500 to-red-700'
                                    }`}
                                  />
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* Warrior Ranks - Rest of the players */}
                {individualData.length > 3 && (
                  <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1.5 }}
                  >
                    <motion.h2 
                      className="text-2xl font-bold text-center mb-6 text-red-300"
                      animate={{ opacity: [0.7, 1, 0.7] }}
                      transition={{ duration: 3, repeat: Infinity }}
                    >
                      ⚔️ WARRIOR RANKS ⚔️
                    </motion.h2>
                    
                    <div className="grid gap-4 max-w-4xl mx-auto">
                      {individualData.slice(3).map((player, index) => (
                        <motion.div
                          key={player.id}
                          initial={{ x: -50, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 1.8 + index * 0.1 }}
                          whileHover={{ x: 10, scale: 1.02 }}
                          className={`group flex items-center p-6 rounded-2xl border backdrop-blur-lg transition-all duration-300 ${
                            isCurrentUser(player.id) 
                              ? 'border-red-500/70 bg-gradient-to-r from-red-900/50 to-red-950/50' 
                              : 'border-red-800/30 bg-gradient-to-r from-red-950/20 to-black/20 hover:border-red-600/50'
                          }`}
                        >
                          {/* Rank Badge */}
                          <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-red-600 to-red-800 rounded-2xl flex items-center justify-center mr-6 group-hover:scale-110 transition-transform">
                            <span className="text-white font-black text-xl">#{player.rank}</span>
                          </div>

                          {/* Player Info */}
                          <div className="flex-grow">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="text-xl font-bold text-white group-hover:text-red-300 transition-colors">
                                  {player.username}
                                  {isCurrentUser(player.id) && (
                                    <span className="ml-3 inline-flex items-center bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                                      <Shield className="w-3 h-3 mr-1" />
                                      YOU
                                    </span>
                                  )}
                                </h3>
                                <div className="flex items-center space-x-4 text-red-300/70 text-sm mt-1">
                                  <span>Accuracy: {player.best_accuracy}%</span>
                                  <span>•</span>
                                  <span>Battles: {player.attempts}</span>
                                  <span>•</span>
                                  <span>Speed: {player.best_time}s</span>
                                </div>
                              </div>
                              
                              <ChevronRight className="w-6 h-6 text-red-500 group-hover:text-red-300 group-hover:translate-x-2 transition-all" />
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Player's Current Status */}
                {currentUser && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 2 }}
                    className="mt-12 p-8 bg-gradient-to-r from-red-900/40 to-black/40 backdrop-blur-lg rounded-3xl border border-red-600/30 max-w-2xl mx-auto"
                  >
                    <div className="text-center">
                      {(() => {
                        const userRank = individualData.find(player => isCurrentUser(player.id))?.rank
                        if (userRank) {
                          return (
                            <div>
                              <h3 className="text-2xl font-bold text-red-300 mb-4">Your Battle Status</h3>
                              <div className="flex items-center justify-center space-x-4">
                                <Award className="w-8 h-8 text-red-400" />
                                <div>
                                  <div className="text-4xl font-black text-white">Rank #{userRank}</div>
                                  <div className="text-red-300/80">
                                    {userRank <= 3 ? 'Elite Tier Warrior!' : 'Battle-Hardened Fighter'}
                                  </div>
                                </div>
                                <Award className="w-8 h-8 text-red-400" />
                              </div>
                            </div>
                          )
                        } else {
                          return (
                            <div>
                              <Zap className="w-16 h-16 text-red-500 mx-auto mb-4" />
                              <h3 className="text-xl font-bold text-red-300 mb-2">Ready for Battle</h3>
                              <p className="text-red-300/70">Complete your first quiz to join the warrior ranks!</p>
                            </div>
                          )
                        }
                      })()}
                    </div>
                  </motion.div>
                )}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="text-center py-20"
              >
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                    opacity: [0.7, 1, 0.7] 
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <Trophy className="w-24 h-24 text-red-600 mx-auto mb-8" />
                </motion.div>
                <h2 className="text-4xl font-bold text-red-300 mb-4">The Arena Awaits</h2>
                <p className="text-red-300/70 text-xl mb-8 max-w-md mx-auto">
                  No warriors have entered the battle yet. Be the first to claim your throne!
                </p>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="inline-flex items-center space-x-2 bg-gradient-to-r from-red-600 to-red-700 text-white px-8 py-4 rounded-2xl font-bold text-lg"
                >
                  <Zap className="w-6 h-6" />
                  <span>Enter the Arena</span>
                </motion.div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
