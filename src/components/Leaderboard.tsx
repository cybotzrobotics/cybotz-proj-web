'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/utils/supabaseClient'
import { Trophy, User, Medal, Target, ArrowLeft, Sparkles, Star, Crown } from 'lucide-react'

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

interface Ball {
  id: number
  x: number
  y: number
  velocityX: number
  velocityY: number
  power: number
  trail: { x: number; y: number }[]
}

interface Particle {
  id: number
  x: number
  y: number
  velocityX: number
  velocityY: number
  life: number
  color: string
}

export default function Leaderboard({ onBack }: LeaderboardProps) {
  const [individualData, setIndividualData] = useState<IndividualLeaderboard[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  
  // Mini-game state
  const [balls, setBalls] = useState<Ball[]>([])
  const [score, setScore] = useState(0)
  const [particles, setParticles] = useState<Particle[]>([])
  const [gameContainer, setGameContainer] = useState<DOMRect | null>(null)
  const gameRef = useRef<HTMLDivElement>(null)
  const ballIdRef = useRef(0)
  const particleIdRef = useRef(0)
  const animationFrameRef = useRef<number>()
  
  // Game constants
  const BALL_SIZE = 20 // 5 inches diameter scaled down
  const TARGET_SIZE = 80
  const GRAVITY = 0.3
  const FRICTION = 0.99

  useEffect(() => {
    getCurrentUser()
    fetchLeaderboardData()
    
    // Initialize game container
    if (gameRef.current) {
      setGameContainer(gameRef.current.getBoundingClientRect())
    }

    // Listen for quiz completion events to refresh leaderboard
    const handleQuizCompleted = () => {
      console.log('Quiz completed, refreshing leaderboard...')
      fetchLeaderboardData()
    }

    window.addEventListener('quizCompleted', handleQuizCompleted)
    
    // Start game animation loop
    const gameLoop = () => {
      updateBalls()
      updateParticles()
      animationFrameRef.current = requestAnimationFrame(gameLoop)
    }
    gameLoop()
    
    return () => {
      window.removeEventListener('quizCompleted', handleQuizCompleted)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  useEffect(() => {
    // Update game container on resize
    const handleResize = () => {
      if (gameRef.current) {
        setGameContainer(gameRef.current.getBoundingClientRect())
      }
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
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
            rank: 0 // Will be set after sorting
          })
        }
      }

      // Sort by best score (descending), then by best accuracy (descending), then by best time (ascending)
      leaderboardData.sort((a, b) => {
        if (a.best_score !== b.best_score) return b.best_score - a.best_score
        if (a.best_accuracy !== b.best_accuracy) return b.best_accuracy - a.best_accuracy
        return a.best_time - b.best_time
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

  // Mini-game functions
  const updateBalls = () => {
    setBalls(prevBalls => {
      return prevBalls.map(ball => {
        const newBall = { ...ball }
        
        // Apply gravity and friction
        newBall.velocityY += GRAVITY
        newBall.velocityX *= FRICTION
        newBall.velocityY *= FRICTION
        
        // Update position
        newBall.x += newBall.velocityX
        newBall.y += newBall.velocityY
        
        // Update trail
        newBall.trail = [...newBall.trail, { x: newBall.x, y: newBall.y }].slice(-8)
        
        // Bounce off walls
        if (gameContainer) {
          if (newBall.x <= BALL_SIZE/2) {
            newBall.x = BALL_SIZE/2
            newBall.velocityX *= -0.7
          }
          if (newBall.x >= gameContainer.width - BALL_SIZE/2) {
            newBall.x = gameContainer.width - BALL_SIZE/2
            newBall.velocityX *= -0.7
          }
          if (newBall.y <= BALL_SIZE/2) {
            newBall.y = BALL_SIZE/2
            newBall.velocityY *= -0.7
          }
          if (newBall.y >= gameContainer.height - BALL_SIZE/2) {
            newBall.y = gameContainer.height - BALL_SIZE/2
            newBall.velocityY *= -0.7
          }
        }
        
        return newBall
      }).filter(ball => {
        // Remove balls that are too slow or out of bounds
        const speed = Math.sqrt(ball.velocityX ** 2 + ball.velocityY ** 2)
        return speed > 0.1 && gameContainer && 
               ball.x >= -100 && ball.x <= gameContainer.width + 100 &&
               ball.y >= -100 && ball.y <= gameContainer.height + 100
      })
    })
  }

  const updateParticles = () => {
    setParticles(prevParticles => {
      return prevParticles.map(particle => ({
        ...particle,
        x: particle.x + particle.velocityX,
        y: particle.y + particle.velocityY,
        velocityY: particle.velocityY + 0.1,
        life: particle.life - 1
      })).filter(particle => particle.life > 0)
    })
  }

  const createParticles = (x: number, y: number, color: string) => {
    const newParticles = Array.from({ length: 8 }, () => ({
      id: particleIdRef.current++,
      x,
      y,
      velocityX: (Math.random() - 0.5) * 10,
      velocityY: (Math.random() - 0.5) * 10,
      life: 30,
      color
    }))
    setParticles(prev => [...prev, ...newParticles])
  }

  const shootBall = (event: React.MouseEvent) => {
    if (!gameContainer) return
    
    const rect = gameRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const clickX = event.clientX - rect.left
    const clickY = event.clientY - rect.top
    
    // Calculate power based on distance from launcher (bottom-left corner)
    const launcherX = 50
    const launcherY = gameContainer.height - 50
    
    const deltaX = clickX - launcherX
    const deltaY = clickY - launcherY
    const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2)
    const power = Math.min(distance / 10, 20)
    
    // Normalize direction and apply power
    const direction = Math.sqrt(deltaX ** 2 + deltaY ** 2)
    const velocityX = (deltaX / direction) * power
    const velocityY = (deltaY / direction) * power
    
    const newBall: Ball = {
      id: ballIdRef.current++,
      x: launcherX,
      y: launcherY,
      velocityX,
      velocityY,
      power,
      trail: []
    }
    
    setBalls(prev => [...prev, newBall])
    createParticles(launcherX, launcherY, '#ff6b6b')
  }

  const checkTargetHit = (ball: Ball) => {
    if (!gameContainer) return false
    
    const targetX = gameContainer.width - 100
    const targetY = gameContainer.height - 100
    
    const distance = Math.sqrt((ball.x - targetX) ** 2 + (ball.y - targetY) ** 2)
    
    if (distance < TARGET_SIZE / 2) {
      setScore(prev => prev + 1)
      createParticles(targetX, targetY, '#4ade80')
      return true
    }
    return false
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
      {/* Interactive Game Background */}
      <div 
        ref={gameRef}
        className="absolute inset-0 cursor-crosshair"
        onClick={shootBall}
      >
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

        {/* Mini-game Elements */}
        {/* Pickleball Launcher (bottom-left corner) */}
        <motion.div
          className="absolute bottom-4 left-4 w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-full shadow-lg border-2 border-orange-300"
          whileHover={{ scale: 1.1 }}
          animate={{
            boxShadow: [
              "0 0 10px rgba(251, 146, 60, 0.5)",
              "0 0 20px rgba(251, 146, 60, 0.8)",
              "0 0 10px rgba(251, 146, 60, 0.5)",
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="absolute inset-2 bg-gradient-to-br from-yellow-300 to-orange-400 rounded-full flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-orange-800" />
          </div>
        </motion.div>

        {/* Target (bottom-right corner) */}
        <motion.div
          className="absolute bottom-4 right-24 w-20 h-20 rounded-full border-4 border-green-400 bg-green-400/10"
          animate={{
            borderColor: ["#4ade80", "#22c55e", "#4ade80"],
            scale: [1, 1.05, 1],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="absolute inset-2 rounded-full border-2 border-green-500 bg-green-500/20">
            <div className="absolute inset-2 rounded-full border-2 border-green-600 bg-green-600/30 flex items-center justify-center">
              <Target className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </motion.div>

        {/* Score Display */}
        <motion.div
          className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-lg border border-red-400/30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-red-400 font-bold text-lg">
            Score: {score}
          </div>
        </motion.div>

        {/* Flying Balls */}
        {balls.map(ball => (
          <motion.div key={ball.id}>
            {/* Ball trail */}
            {ball.trail.map((point, index) => (
              <div
                key={index}
                className="absolute w-2 h-2 bg-orange-400 rounded-full"
                style={{
                  left: point.x - 1,
                  top: point.y - 1,
                  opacity: index / ball.trail.length * 0.6,
                }}
              />
            ))}
            {/* Main ball */}
            <div
              className="absolute w-5 h-5 bg-gradient-to-br from-yellow-300 to-orange-500 rounded-full shadow-lg border border-orange-300"
              style={{
                left: ball.x - BALL_SIZE/2,
                top: ball.y - BALL_SIZE/2,
              }}
            />
          </motion.div>
        ))}

        {/* Particles */}
        {particles.map(particle => (
          <div
            key={particle.id}
            className="absolute w-1 h-1 rounded-full"
            style={{
              left: particle.x,
              top: particle.y,
              backgroundColor: particle.color,
              opacity: particle.life / 30,
            }}
          />
        ))}
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
                LEADERBOARD
              </h1>
              <p className="text-gray-300 text-lg font-medium">
                Hall of Champions
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
                              <div className="text-slate-300 text-sm mb-4">
                                Team {player.team_number}
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="bg-black/20 rounded-lg p-2">
                                  <div className="text-slate-400">Best Score</div>
                                  <div className="text-white font-bold">{player.best_score}%</div>
                                </div>
                                <div className="bg-black/20 rounded-lg p-2">
                                  <div className="text-slate-400">Attempts</div>
                                  <div className="text-white font-bold">{player.attempts}</div>
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
                              <div className="text-white font-bold">{player.best_score}%</div>
                              <div className="text-gray-400 text-sm">{player.attempts} attempts</div>
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
