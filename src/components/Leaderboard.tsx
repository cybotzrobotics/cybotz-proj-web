'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/utils/supabaseClient'
import { Trophy, Users, User, Medal, TrendingUp, Calendar, Target } from 'lucide-react'

interface IndividualLeaderboard {
  id: string
  username: string
  full_name: string
  team_number: number
  team_name: string
  best_score: number
  total_attempts: number
  average_score: number
  last_attempt: string
  rank: number
}

interface TeamLeaderboard {
  team_number: number
  team_name: string
  team_members: number
  best_team_score: number
  average_team_score: number
  total_team_points: number
  total_team_attempts: number
  last_team_activity: string
  rank: number
}

interface LeaderboardProps {
  onBack: () => void
}

export default function Leaderboard({ onBack }: LeaderboardProps) {
  const [activeTab, setActiveTab] = useState<'individual' | 'team'>('individual')
  const [individualData, setIndividualData] = useState<IndividualLeaderboard[]>([])
  const [teamData, setTeamData] = useState<TeamLeaderboard[]>([])
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

      // Fetch team leaderboard
      const { data: teamData, error: teamError } = await supabase
        .from('team_leaderboard')
        .select('*')
        .limit(50)

      console.log('Team leaderboard data:', teamData)
      console.log('Team leaderboard error:', teamError)

      if (teamError) throw teamError
      setTeamData(teamData || [])

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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen p-6"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex justify-between items-center mb-8"
        >
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
          >
            <Target className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>

          <div className="text-center">
            <h1 className="text-3xl font-cyber font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
              🏆 Leaderboards
            </h1>
            <p className="text-gray-400 mt-2">Compete with the best FTC teams and students</p>
          </div>

          <div className="w-20"></div> {/* Spacer for centering */}
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center mb-8"
        >
          <div className="bg-black/40 backdrop-blur-sm rounded-xl p-2 border border-gray-800/50">
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('individual')}
                className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center space-x-2 ${
                  activeTab === 'individual'
                    ? 'bg-red-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <User className="w-5 h-5" />
                <span>Individual</span>
              </button>
              <button
                onClick={() => setActiveTab('team')}
                className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center space-x-2 ${
                  activeTab === 'team'
                    ? 'bg-red-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <Users className="w-5 h-5" />
                <span>Team</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Leaderboard Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'individual' && (
            <motion.div
              key="individual"
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 50, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-xl font-bold text-white mb-6 flex items-center">
                <User className="w-6 h-6 mr-2 text-red-400" />
                Individual Rankings
              </h2>
              
              <div className="space-y-3">
                {individualData.map((player, index) => (
                  <motion.div
                    key={player.id}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-4 rounded-xl border transition-all hover:scale-[1.02] ${
                      getRankBorder(player.rank)
                    } ${
                      isCurrentUser(player.id) ? 'ring-2 ring-red-400/50 bg-red-400/10' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          {getRankIcon(player.rank)}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-bold text-white">
                              {player.username}
                              {isCurrentUser(player.id) && (
                                <span className="ml-2 text-xs bg-red-500 text-white px-2 py-1 rounded-full">YOU</span>
                              )}
                            </h3>
                            {player.team_number && (
                              <span className="text-sm text-gray-400">
                                Team #{player.team_number}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-400">
                            {player.full_name || 'Anonymous Player'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">
                          {player.best_score}/3
                        </div>
                        <div className="text-sm text-gray-400">
                          {player.total_attempts} attempts • Avg: {player.average_score}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
                
                {individualData.length === 0 && (
                  <div className="text-center py-12">
                    <User className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg">No individual scores yet</p>
                    <p className="text-gray-500">Be the first to complete a quiz!</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'team' && (
            <motion.div
              key="team"
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -50, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-xl font-bold text-white mb-6 flex items-center">
                <Users className="w-6 h-6 mr-2 text-red-400" />
                Team Rankings
              </h2>
              
              <div className="space-y-3">
                {teamData.map((team, index) => (
                  <motion.div
                    key={team.team_number}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-4 rounded-xl border transition-all hover:scale-[1.02] ${
                      getRankBorder(team.rank)
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          {getRankIcon(team.rank)}
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-lg">
                            Team #{team.team_number}
                          </h3>
                          <p className="text-sm text-gray-400">
                            {team.team_name || 'Unknown Team Name'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {team.team_members} member{team.team_members !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">
                          {team.best_team_score}/3
                        </div>
                        <div className="text-sm text-gray-400">
                          Best Score
                        </div>
                        <div className="text-xs text-gray-500">
                          Avg: {team.average_team_score} • {team.total_team_attempts} total attempts
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
                
                {teamData.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg">No team scores yet</p>
                    <p className="text-gray-500">Teams will appear here once members complete quizzes!</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
