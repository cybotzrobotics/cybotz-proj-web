'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/utils/supabaseClient'
import { Trophy, User, Medal, Target } from 'lucide-react'

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

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-400" />
      case 2:
        return <Medal className="w-6 h-6 text-gray-300" />
      case 3:
        return <Medal className="w-6 h-6 text-amber-600" />
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-gray-400 font-bold">#{rank}</span>
    }
  }

  const getRankBorder = (rank: number) => {
    switch (rank) {
      case 1:
        return 'border-yellow-400/50 bg-yellow-400/5'
      case 2:
        return 'border-gray-300/50 bg-gray-300/5'
      case 3:
        return 'border-amber-600/50 bg-amber-600/5'
      default:
        return 'border-gray-600/30 bg-gray-800/20'
    }
  }

  const isCurrentUser = (userId: string) => {
    return currentUser?.id === userId
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-white text-lg">Loading Leaderboards...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Epic Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900"></div>
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/50 via-transparent to-red-900/50"></div>
      
      {/* Animated background elements */}
      <div className="absolute inset-0">
        {/* Floating orbs */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-gradient-to-r from-purple-400/20 to-blue-400/20 blur-xl"
            style={{
              width: `${100 + i * 50}px`,
              height: `${100 + i * 50}px`,
              left: `${10 + (i % 4) * 25}%`,
              top: `${10 + Math.floor(i / 4) * 30}%`,
            }}
            animate={{
              y: [-20, 20, -20],
              x: [-10, 10, -10],
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 6 + i,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
        
        {/* Geometric patterns */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-32 h-32 border border-yellow-400 rotate-45 rounded-lg"></div>
          <div className="absolute top-40 right-32 w-24 h-24 border border-purple-400 rotate-12 rounded-full"></div>
          <div className="absolute bottom-32 left-40 w-28 h-28 border border-blue-400 -rotate-45 rounded-lg"></div>
          <div className="absolute bottom-20 right-20 w-36 h-36 border border-red-400 rotate-30 rounded-full"></div>
        </div>
        
        {/* Starfield effect */}
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={`star-${i}`}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 2 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 5,
            }}
          />
        ))}
      </div>
      
      {/* Content overlay */}
      <div className="relative z-10 min-h-screen flex flex-col">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-grow flex flex-col items-center justify-center p-6"
        >
          <div className="w-full max-w-7xl mx-auto">
            {/* Header */}
            <motion.div
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center mb-16"
            >
              <div className="flex justify-between items-center mb-8">
                <motion.button
                  onClick={onBack}
                  whileHover={{ scale: 1.05, x: -5 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center space-x-3 text-gray-300 hover:text-white transition-colors bg-gray-800/50 backdrop-blur-sm px-6 py-3 rounded-full border border-gray-600/50"
                >
                  <Target className="w-5 h-5" />
                  <span className="font-medium">Back to Dashboard</span>
                </motion.button>

                <div className="flex-1 text-center">
                  <motion.h1 
                    className="text-6xl font-cyber font-bold bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent mb-4"
                    animate={{ 
                      backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] 
                    }}
                    transition={{ 
                      duration: 3, 
                      repeat: Infinity, 
                      ease: "linear" 
                    }}
                  >
                    🏆 LEADERBOARD 🏆
                  </motion.h1>
                  <motion.p 
                    className="text-xl text-gray-300 font-medium"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    Today's Top Performers
                  </motion.p>
                </div>

                <div className="w-32"></div> {/* Spacer for perfect centering */}
              </div>
            </motion.div>

            {/* Main Content - Perfectly Centered */}
            <div className="flex justify-center">
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="w-full max-w-5xl"
              >
          <h2 className="text-xl font-bold text-white mb-6 flex items-center">
            <User className="w-6 h-6 mr-2 text-red-400" />
            Rankings
          </h2>
          
          {individualData.length > 0 ? (
            <>
                {/* Daily Podium */}
                {individualData.slice(0, 3).length > 0 && (
                  <div className="mb-20 relative">
                    {/* Podium Arena Base */}
                    <div className="relative">
                      {/* Arena floor glow */}
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-96 h-8 bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent blur-xl"></div>
                      
                      {/* Podium Structure */}
                      <div className="flex items-end justify-center gap-16 relative z-10">
                        
                        {/* 2nd Place - Left Side */}
                        {individualData[1] && (
                          <motion.div
                            initial={{ y: 150, opacity: 0, rotateX: 45 }}
                            animate={{ y: 0, opacity: 1, rotateX: 0 }}
                            transition={{ delay: 0.6, type: "spring", stiffness: 100 }}
                            whileHover={{ y: -10, scale: 1.02 }}
                            className="relative group"
                          >
                            {/* Silver Spotlight */}
                            <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 w-32 h-32 bg-gradient-radial from-gray-300/20 to-transparent rounded-full blur-xl"></div>
                            
                            {/* Player Avatar */}
                            <div className="relative mb-6">
                              <div className="w-28 h-28 bg-gradient-to-br from-slate-100 via-gray-300 to-slate-600 rounded-full mx-auto relative shadow-2xl border-4 border-slate-200 group-hover:scale-110 transition-transform duration-500">
                                <div className="absolute inset-2 bg-gradient-to-tr from-slate-200 to-slate-400 rounded-full flex items-center justify-center">
                                  <span className="text-4xl font-bold text-slate-700">2</span>
                                </div>
                                <div className="absolute -top-3 -right-3 w-10 h-10 bg-gradient-to-br from-gray-200 to-gray-400 rounded-full flex items-center justify-center shadow-lg">
                                  🥈
                                </div>
                              </div>
                            </div>
                            
                            {/* Silver Podium */}
                            <div className="relative">
                              <div className="w-36 h-32 bg-gradient-to-t from-slate-700 via-slate-500 to-slate-300 rounded-t-3xl relative shadow-2xl border-t-4 border-slate-200 group-hover:scale-105 transition-transform duration-500">
                                <div className="absolute top-0 inset-x-0 h-4 bg-gradient-to-r from-transparent via-white/40 to-transparent rounded-t-3xl"></div>
                                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-white font-bold text-xl">SILVER</div>
                              </div>
                              {/* Podium reflection */}
                              <div className="absolute top-full left-0 right-0 h-16 bg-gradient-to-b from-slate-300/20 to-transparent rounded-b-3xl transform scale-y-[-1]"></div>
                            </div>
                            
                            {/* Player Name */}
                            <div className="text-center mt-6">
                              <div className="text-white font-bold text-lg mb-2">{individualData[1].username}</div>
                              {isCurrentUser(individualData[1].id) && (
                                <motion.div 
                                  initial={{ scale: 0, rotate: -10 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  className="inline-block bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg"
                                >
                                  🏆 YOU!
                                </motion.div>
                              )}
                            </div>
                          </motion.div>
                        )}

                        {/* 1st Place - Center Leader */}
                        {individualData[0] && (
                          <motion.div
                            initial={{ y: 200, opacity: 0, scale: 0.5 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4, type: "spring", stiffness: 80 }}
                            whileHover={{ y: -15, scale: 1.03 }}
                            className="relative group z-20"
                          >
                            {/* Leader Spotlight */}
                            <div className="absolute -top-32 left-1/2 transform -translate-x-1/2 w-48 h-48 bg-gradient-radial from-yellow-300/30 to-transparent rounded-full blur-2xl animate-pulse"></div>
                            
                            {/* Floating Crown */}
                            <motion.div
                              className="absolute -top-16 left-1/2 transform -translate-x-1/2 text-6xl z-30"
                              animate={{ 
                                y: [-5, 5, -5],
                                rotate: [-2, 2, -2] 
                              }}
                              transition={{ 
                                duration: 3, 
                                repeat: Infinity, 
                                ease: "easeInOut" 
                              }}
                            >
                              👑
                            </motion.div>
                            
                            {/* Player Avatar - LARGEST */}
                            <div className="relative mb-8">
                              <div className="w-40 h-40 bg-gradient-to-br from-yellow-200 via-yellow-400 to-yellow-700 rounded-full mx-auto relative shadow-2xl border-6 border-yellow-300 group-hover:scale-110 transition-transform duration-500">
                                {/* Inner leader circle */}
                                <div className="absolute inset-3 bg-gradient-to-tr from-yellow-300 to-yellow-500 rounded-full flex items-center justify-center">
                                  <span className="text-5xl font-bold text-yellow-900">1</span>
                                </div>
                                {/* Leader aura */}
                                <div className="absolute -inset-4 bg-gradient-to-r from-yellow-400/30 via-orange-400/30 to-yellow-400/30 rounded-full blur-lg animate-pulse"></div>
                                {/* Top Score badge */}
                                <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900 px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                                  #1 TODAY
                                </div>
                              </div>
                            </div>
                            
                            {/* Gold Podium - TALLEST */}
                            <div className="relative">
                              <div className="w-44 h-48 bg-gradient-to-t from-yellow-800 via-yellow-600 to-yellow-400 rounded-t-3xl relative shadow-2xl border-t-6 border-yellow-200 group-hover:scale-105 transition-transform duration-500">
                                {/* Podium shine effect */}
                                <div className="absolute top-0 inset-x-0 h-6 bg-gradient-to-r from-transparent via-yellow-100/60 to-transparent rounded-t-3xl"></div>
                                <motion.div
                                  className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-200/30 to-transparent rounded-t-3xl"
                                  animate={{ x: [-100, 200] }}
                                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                />
                                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white font-bold text-2xl">TOP SCORE</div>
                              </div>
                              {/* Podium reflection */}
                              <div className="absolute top-full left-0 right-0 h-24 bg-gradient-to-b from-yellow-400/25 to-transparent rounded-b-3xl transform scale-y-[-1]"></div>
                            </div>
                            
                            {/* Player Name */}
                            <div className="text-center mt-8">
                              <div className="text-white font-bold text-2xl mb-3">{individualData[0].username}</div>
                              {isCurrentUser(individualData[0].id) && (
                                <motion.div 
                                  initial={{ scale: 0, rotate: 10 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  className="inline-block bg-gradient-to-r from-red-500 via-red-600 to-red-500 text-white px-6 py-3 rounded-full text-lg font-bold shadow-2xl border-2 border-red-300"
                                >
                                  🏆 YOU'RE #1 TODAY! 🏆
                                </motion.div>
                              )}
                            </div>
                          </motion.div>
                        )}

                        {/* 3rd Place - Right Side */}
                        {individualData[2] && (
                          <motion.div
                            initial={{ y: 120, opacity: 0, rotateX: 45 }}
                            animate={{ y: 0, opacity: 1, rotateX: 0 }}
                            transition={{ delay: 0.8, type: "spring", stiffness: 120 }}
                            whileHover={{ y: -8, scale: 1.02 }}
                            className="relative group"
                          >
                            {/* Bronze Spotlight */}
                            <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 w-28 h-28 bg-gradient-radial from-amber-400/20 to-transparent rounded-full blur-lg"></div>
                            
                            {/* Player Avatar */}
                            <div className="relative mb-5">
                              <div className="w-24 h-24 bg-gradient-to-br from-amber-300 via-amber-500 to-amber-800 rounded-full mx-auto relative shadow-xl border-4 border-amber-400 group-hover:scale-110 transition-transform duration-500">
                                <div className="absolute inset-2 bg-gradient-to-tr from-amber-400 to-amber-600 rounded-full flex items-center justify-center">
                                  <span className="text-3xl font-bold text-amber-900">3</span>
                                </div>
                                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-amber-300 to-amber-500 rounded-full flex items-center justify-center shadow-md">
                                  🥉
                                </div>
                              </div>
                            </div>
                            
                            {/* Bronze Podium */}
                            <div className="relative">
                              <div className="w-32 h-24 bg-gradient-to-t from-amber-800 via-amber-600 to-amber-400 rounded-t-3xl relative shadow-xl border-t-4 border-amber-300 group-hover:scale-105 transition-transform duration-500">
                                <div className="absolute top-0 inset-x-0 h-3 bg-gradient-to-r from-transparent via-amber-200/50 to-transparent rounded-t-3xl"></div>
                                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white font-bold text-lg">BRONZE</div>
                              </div>
                              {/* Podium reflection */}
                              <div className="absolute top-full left-0 right-0 h-12 bg-gradient-to-b from-amber-400/20 to-transparent rounded-b-3xl transform scale-y-[-1]"></div>
                            </div>
                            
                            {/* Player Name */}
                            <div className="text-center mt-5">
                              <div className="text-white font-bold text-base mb-2">{individualData[2].username}</div>
                              {isCurrentUser(individualData[2].id) && (
                                <motion.div 
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="inline-block bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-lg"
                                >
                                  🏆 YOU!
                                </motion.div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              {/* Rest of the Rankings */}
              {individualData.length > 3 && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-gray-300 mb-3">Other Rankings</h3>
                  {individualData.slice(3).map((player, index) => (
                    <motion.div
                      key={player.id}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.6 + index * 0.03 }}
                      className={`p-3 rounded-lg border transition-all hover:scale-[1.01] ${
                        isCurrentUser(player.id) 
                          ? 'ring-2 ring-red-400/50 bg-red-400/10 border-red-400/50' 
                          : 'border-gray-600/30 bg-gray-800/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-sm">#{player.rank}</span>
                          </div>
                          <div className="text-white font-medium">
                            {player.username}
                            {isCurrentUser(player.id) && (
                              <span className="ml-2 text-xs bg-red-500 text-white px-2 py-1 rounded-full">YOU</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Current User Rank Display */}
              {currentUser && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="mt-6 p-4 bg-red-900/20 border border-red-400/50 rounded-lg"
                >
                  <div className="text-center">
                    {(() => {
                      const userRank = individualData.find(player => isCurrentUser(player.id))?.rank
                      if (userRank) {
                        return (
                          <div className="text-white">
                            <span className="text-red-400 font-bold">Your Current Rank: </span>
                            <span className="text-xl font-bold">#{userRank}</span>
                            {userRank <= 3 && <span className="ml-2">🎉</span>}
                          </div>
                        )
                      } else {
                        return (
                          <div className="text-gray-400">
                            Complete a quiz to see your ranking!
                          </div>
                        )
                      }
                    })()}
                  </div>
                </motion.div>
              )}
            </>
          ) : (
            <div className="text-center py-20">
              <User className="w-24 h-24 text-gray-500 mx-auto mb-6" />
              <p className="text-gray-300 text-2xl mb-4">No scores yet today</p>
              <p className="text-gray-500 text-lg">Be the first to complete a quiz and earn your ranking!</p>
            </div>
          )}
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
