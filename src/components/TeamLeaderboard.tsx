'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/utils/supabaseClient'
import { 
  Trophy, 
  Users, 
  Medal, 
  ArrowLeft, 
  Star, 
  Crown, 
  Zap, 
  TrendingUp, 
  ChevronRight, 
  Award, 
  Shield,
  Target
} from 'lucide-react'

interface TeamLeaderboard {
  rank: number
  team_number: number
  team_size: number
  avg_elo: number
  max_elo: number
  min_elo: number
  total_peak_elo: number
  active_members: number
  team_name?: string
  team_location?: string
}

interface TeamLeaderboardProps {
  onBack: () => void
}

// ELO tier system for teams
const getTeamEloTier = (avgElo: number) => {
  if (avgElo >= 1800) return { name: 'Elite', color: 'from-yellow-400 to-yellow-600', icon: Crown }
  if (avgElo >= 1600) return { name: 'Championship', color: 'from-purple-400 to-purple-600', icon: Award }
  if (avgElo >= 1400) return { name: 'Advanced', color: 'from-blue-400 to-blue-600', icon: Star }
  if (avgElo >= 1200) return { name: 'Competitive', color: 'from-green-400 to-green-600', icon: Zap }
  if (avgElo >= 1000) return { name: 'Developing', color: 'from-orange-400 to-orange-600', icon: TrendingUp }
  return { name: 'Rookie', color: 'from-gray-400 to-gray-600', icon: Target }
}

// Fetch team data from cached database
const fetchTeamInfo = async (teamNumber: number) => {
  try {
    // First try to get from cached database
    const { data, error } = await supabase
      .rpc('get_team_info', { team_num: teamNumber })
    
    if (data && data.length > 0 && !error) {
      const team = data[0]
      return {
        team_name: team.team_name_short || team.team_name || `Team ${teamNumber}`,
        team_location: team.city && team.state_prov 
          ? `${team.city}, ${team.state_prov}` 
          : team.country || 'Unknown Location'
      }
    }
  } catch (error) {
    console.log(`Team ${teamNumber} not found in cache, using fallback`)
  }
  
  // Fallback for teams not in cache
  return {
    team_name: `Team ${teamNumber}`,
    team_location: 'Unknown Location'
  }
}

export default function TeamLeaderboard({ onBack }: TeamLeaderboardProps) {
  const [teamData, setTeamData] = useState<TeamLeaderboard[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadingTeamInfo, setLoadingTeamInfo] = useState(false)
  const [displayedCount, setDisplayedCount] = useState(20)
  const [hasMoreData, setHasMoreData] = useState(false)

  useEffect(() => {
    fetchTeamLeaderboardData()
  }, [])

  const fetchTeamLeaderboardData = async (loadMore = false) => {
    console.log('Fetching team leaderboard data...', loadMore ? 'loading more' : 'initial load')
    if (!loadMore) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }
    
    try {
      // Fetch team leaderboard - removing the limit to get all teams for proper ranking
      const { data: teamLeaderboardData, error: teamError } = await supabase
        .from('team_leaderboard')
        .select('*')

      console.log('Team leaderboard data:', teamLeaderboardData)
      console.log('Team leaderboard error:', teamError)

      if (teamError) throw teamError
      
      // If no team leaderboard data, try to create from profiles
      if (!teamLeaderboardData || teamLeaderboardData.length === 0) {
        console.log('No team leaderboard data, trying to create from profiles...')
        
        const { data: profilesData, error: profilesError } = await supabase
          .from('user_profiles')
          .select('team_number, elo_rating, peak_elo, username')
          .not('team_number', 'is', null)
          
        if (profilesData && profilesData.length > 0) {
          // Group by team
          const teamStats = new Map()
          
          profilesData.forEach((profile: any) => {
            const teamNumber = profile.team_number
            if (!teamStats.has(teamNumber)) {
              teamStats.set(teamNumber, {
                team_number: teamNumber,
                team_size: 0,
                total_elo: 0,
                max_elo: 0,
                min_elo: 9999,
                total_peak_elo: 0,
                active_members: 0
              })
            }
            
            const stats = teamStats.get(teamNumber)
            stats.team_size++
            stats.total_elo += profile.elo_rating || 1000
            stats.max_elo = Math.max(stats.max_elo, profile.elo_rating || 1000)
            stats.min_elo = Math.min(stats.min_elo, profile.elo_rating || 1000)
            stats.total_peak_elo += profile.peak_elo || 1000
            stats.active_members++
          })
          
          // Convert to array and calculate averages
          const manualTeamData = Array.from(teamStats.values()).map((stats: any, index: number) => ({
            rank: index + 1, // Temporary rank, will be recalculated after sorting
            team_number: stats.team_number,
            team_size: stats.team_size,
            avg_elo: Math.round(stats.total_elo / stats.team_size),
            max_elo: stats.max_elo,
            min_elo: stats.min_elo === 9999 ? 0 : stats.min_elo,
            total_peak_elo: stats.total_peak_elo,
            active_members: stats.active_members
          }))
          
          // Sort by avg_elo and reassign ranks
          manualTeamData.sort((a, b) => b.avg_elo - a.avg_elo)
          manualTeamData.forEach((team, index) => {
            team.rank = index + 1
          })
          
          console.log('Manual team data created:', manualTeamData)
          
          if (!loadMore) {
            setTeamData(manualTeamData)
            setDisplayedCount(Math.min(20, manualTeamData.length))
            setHasMoreData(manualTeamData.length > 20)
          } else {
            const newDisplayedCount = Math.min(displayedCount + 20, manualTeamData.length)
            setDisplayedCount(newDisplayedCount)
            setHasMoreData(newDisplayedCount < manualTeamData.length)
          }
          
          // Fetch team info from FTC Scout API
          fetchTeamInfoForAll(!loadMore ? manualTeamData : teamData)
        } else {
          setTeamData([])
          setDisplayedCount(0)
          setHasMoreData(false)
        }
      } else {
        console.log('Using team_leaderboard view data')
        
        if (!loadMore) {
          setTeamData(teamLeaderboardData)
          setDisplayedCount(Math.min(20, teamLeaderboardData.length))
          setHasMoreData(teamLeaderboardData.length > 20)
          // Fetch team info from FTC Scout API
          fetchTeamInfoForAll(teamLeaderboardData)
        } else {
          const newDisplayedCount = Math.min(displayedCount + 20, teamLeaderboardData.length)
          setDisplayedCount(newDisplayedCount)
          setHasMoreData(newDisplayedCount < teamLeaderboardData.length)
        }
      }

    } catch (error) {
      console.error('Error fetching team leaderboard data:', error)
      setTeamData([])
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const fetchTeamInfoForAll = async (teams: TeamLeaderboard[]) => {
    setLoadingTeamInfo(true)
    
    const updatedTeams = await Promise.all(
      teams.map(async (team) => {
        const teamInfo = await fetchTeamInfo(team.team_number)
        return {
          ...team,
          team_name: teamInfo.team_name,
          team_location: teamInfo.team_location
        }
      })
    )
    
    setTeamData(updatedTeams)
    setLoadingTeamInfo(false)
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
              Loading Team Rankings
            </h2>
            <p className="text-red-300/70">Gathering team data...</p>
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
                <span className="text-red-300 group-hover:text-white font-medium">Back to Individual</span>
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
                  <Users className="w-8 h-8 text-white" />
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
                TEAM RANKINGS
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
                Where Teams Rise • Ranked by Average ELO
              </motion.p>
            </motion.div>
          </div>
        </motion.div>

        {/* Team Leaderboard Content */}
        <div className="px-8 pb-8">
          <div className="max-w-7xl mx-auto">
            {teamData.length > 0 ? (
              <div className="space-y-8">
                {/* Elite Teams - Top 3 */}
                {teamData.slice(0, 3).length > 0 && (
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
                      🏆 ELITE TEAMS 🏆
                    </motion.h2>
                    
                    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                      {teamData.slice(0, 3).map((team, index) => {
                        const rank = index + 1;
                        const tier = getTeamEloTier(team.avg_elo);
                        return (
                          <motion.div
                            key={team.team_number}
                            initial={{ y: 100, opacity: 0, scale: 0.8 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            transition={{ delay: 1 + index * 0.2 }}
                            whileHover={{ y: -10, scale: 1.03 }}
                            className={`relative group ${
                              rank === 1 ? 'md:order-2 transform md:scale-110' : 
                              rank === 2 ? 'md:order-1' : 'md:order-3'
                            }`}
                          >
                            {/* Team Card */}
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

                              {/* Team Info */}
                              <div className="text-center mb-6 pt-6">
                                <motion.div
                                  animate={{ rotate: [0, 5, 0, -5, 0] }}
                                  transition={{ duration: 4, repeat: Infinity }}
                                  className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full ${
                                    rank === 1 
                                      ? 'bg-red-500/30 border border-red-400/50' 
                                      : 'bg-red-600/20 border border-red-500/30'
                                  } mb-4`}
                                >
                                  <span className="text-red-200 font-bold text-sm tracking-wider">
                                    {tier.name.toUpperCase()}
                                  </span>
                                </motion.div>
                                
                                <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-red-300 transition-colors">
                                  {loadingTeamInfo ? `Team ${team.team_number}` : (team.team_name || `Team ${team.team_number}`)}
                                </h3>
                                <p className="text-red-300/70 text-sm">
                                  #{team.team_number} • {loadingTeamInfo ? 'Loading...' : team.team_location}
                                </p>
                              </div>

                              {/* Team Stats */}
                              <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-red-300/80 font-medium">Avg ELO</span>
                                  <span className="text-white font-bold text-lg">{team.avg_elo}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-red-300/80 font-medium">Team Size</span>
                                  <span className="text-white font-bold">{team.team_size} members</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-red-300/80 font-medium">Top Player</span>
                                  <span className="text-white font-bold">{team.max_elo} ELO</span>
                                </div>
                              </div>

                              {/* ELO Tier Progress */}
                              <div className="mt-6">
                                <div className="h-3 bg-black/50 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, (team.avg_elo / 2000) * 100)}%` }}
                                    transition={{ delay: 1.5 + index * 0.2, duration: 1.5 }}
                                    className={`h-full rounded-full bg-gradient-to-r ${tier.color}`}
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

                {/* Other Teams */}
                {teamData.length > 3 && (
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
                      🛡️ TEAM RANKINGS 🛡️
                    </motion.h2>
                    
                    <div className="grid gap-4 max-w-4xl mx-auto">
                      {teamData.slice(3, displayedCount).map((team, index) => {
                        const tier = getTeamEloTier(team.avg_elo);
                        return (
                          <motion.div
                            key={team.team_number}
                            initial={{ x: -50, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 1.8 + index * 0.1 }}
                            whileHover={{ x: 10, scale: 1.02 }}
                            className="group flex items-center p-6 rounded-2xl border backdrop-blur-lg transition-all duration-300 border-red-800/30 bg-gradient-to-r from-red-950/20 to-black/20 hover:border-red-600/50"
                          >
                            {/* Rank Badge */}
                            <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-red-600 to-red-800 rounded-2xl flex items-center justify-center mr-6 group-hover:scale-110 transition-transform">
                              <span className="text-white font-black text-xl">#{team.rank}</span>
                            </div>

                            {/* Team Info */}
                            <div className="flex-grow">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="flex items-center space-x-3">
                                    <h3 className="text-xl font-bold text-white group-hover:text-red-300 transition-colors">
                                      {loadingTeamInfo ? `Team ${team.team_number}` : (team.team_name || `Team ${team.team_number}`)}
                                    </h3>
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${tier.color} text-white`}>
                                      {tier.name}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-4 text-red-300/70 text-sm mt-1">
                                    <span>#{team.team_number}</span>
                                    <span>•</span>
                                    <span>Avg ELO: {team.avg_elo}</span>
                                    <span>•</span>
                                    <span>{team.team_size} members</span>
                                    <span>•</span>
                                    <span>{loadingTeamInfo ? 'Loading...' : team.team_location}</span>
                                  </div>
                                </div>
                                
                                <ChevronRight className="w-6 h-6 text-red-500 group-hover:text-red-300 group-hover:translate-x-2 transition-all" />
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                      
                      {/* Load More Button */}
                      {hasMoreData && (
                        <motion.button
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 2.2 }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => fetchTeamLeaderboardData(true)}
                          disabled={loadingMore}
                          className="w-full mt-6 p-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold rounded-xl border border-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loadingMore ? (
                            <div className="flex items-center justify-center space-x-2">
                              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                              <span>Loading More Teams...</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center space-x-2">
                              <span>Load More Teams</span>
                              <span className="text-red-200">({teamData.length - displayedCount} remaining)</span>
                            </div>
                          )}
                        </motion.button>
                      )}
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
                  <Users className="w-24 h-24 text-red-600 mx-auto mb-8" />
                </motion.div>
                <h2 className="text-4xl font-bold text-red-300 mb-4">No Teams Found</h2>
                <p className="text-red-300/70 text-xl mb-8 max-w-md mx-auto">
                  Teams will appear here once users join with team affiliations.
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
