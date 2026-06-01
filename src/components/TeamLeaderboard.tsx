'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
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
import CookieFooter from "@/components/CookieFooter";

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

const getTeamEloTier = (avgElo: number) => {
  if (avgElo >= 1800) return { name: 'Elite', color: 'from-yellow-400 to-yellow-600', icon: Crown }
  if (avgElo >= 1600) return { name: 'Championship', color: 'from-purple-400 to-purple-600', icon: Award }
  if (avgElo >= 1400) return { name: 'Advanced', color: 'from-blue-400 to-blue-600', icon: Star }
  if (avgElo >= 1200) return { name: 'Competitive', color: 'from-green-400 to-green-600', icon: Zap }
  if (avgElo >= 1000) return { name: 'Developing', color: 'from-orange-400 to-orange-600', icon: TrendingUp }
  return { name: 'Rookie', color: 'from-gray-400 to-gray-600', icon: Target }
}

const fetchTeamInfo = async (teamNumber: number) => {
  try {
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
  } catch {
    console.log(`Team ${teamNumber} not found in cache, using fallback`)
  }

  return {
    team_name: `Team ${teamNumber}`,
    team_location: 'Unknown Location'
  }
}

const fadeUp = (delay = 0) => ({
  initial: { y: 24, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  transition: { duration: 0.35, delay, ease: [0.25, 0.46, 0.45, 0.94] as any },
})

const rowVariants = {
  hidden: { x: -32, opacity: 0 },
  visible: (i: number) => ({
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.3,
      delay: Math.min(i * 0.04, 0.5),
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
}

export default function TeamLeaderboard({ onBack }: TeamLeaderboardProps) {
  const [teamData, setTeamData] = useState<TeamLeaderboard[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingTeamInfo, setLoadingTeamInfo] = useState(false)
  const [displayedCount, setDisplayedCount] = useState(20)
  const [hasMoreData, setHasMoreData] = useState(false)

  useEffect(() => {
    fetchTeamLeaderboardData()
  }, [])

  const fetchTeamLeaderboardData = async (loadMore = false) => {
    if (loadMore) {
      const newDisplayedCount = Math.min(displayedCount + 20, teamData.length)
      setDisplayedCount(newDisplayedCount)
      setHasMoreData(newDisplayedCount < teamData.length)
      return
    }

    setLoading(true)

    try {
      const { data: teamLeaderboardData, error: teamError } = await supabase
        .from('team_leaderboard')
        .select('*')

      console.log('Team leaderboard data:', teamLeaderboardData)
      console.log('Team leaderboard error:', teamError)

      if (teamError) throw teamError

      if (!teamLeaderboardData || teamLeaderboardData.length === 0) {
        console.log('No team leaderboard data, trying to create from profiles...')

        const { data: profilesData, error: profilesError } = await supabase
          .from('user_profiles')
          .select('team_number, elo_rating, peak_elo, username')
          .not('team_number', 'is', null)

        if (profilesData && profilesData.length > 0) {
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

          const manualTeamData = Array.from(teamStats.values()).map((stats: any, index: number) => ({
            rank: index + 1,
            team_number: stats.team_number,
            team_size: stats.team_size,
            avg_elo: Math.round(stats.total_elo / stats.team_size),
            max_elo: stats.max_elo,
            min_elo: stats.min_elo === 9999 ? 0 : stats.min_elo,
            total_peak_elo: stats.total_peak_elo,
            active_members: stats.active_members
          }))

          manualTeamData.sort((a, b) => b.avg_elo - a.avg_elo)
          manualTeamData.forEach((team, index) => { team.rank = index + 1 })

          console.log('Manual team data created:', manualTeamData)

          setTeamData(manualTeamData)
          setDisplayedCount(Math.min(20, manualTeamData.length))
          setHasMoreData(manualTeamData.length > 20)

          fetchTeamInfoForAll(manualTeamData)
        } else {
          setTeamData([])
          setDisplayedCount(0)
          setHasMoreData(false)
        }
      } else {
        console.log('Using team_leaderboard view data')

        setTeamData(teamLeaderboardData)
        setDisplayedCount(Math.min(20, teamLeaderboardData.length))
        setHasMoreData(teamLeaderboardData.length > 20)
        fetchTeamInfoForAll(teamLeaderboardData)
      }

    } catch (error) {
      console.error('Error fetching team leaderboard data:', error)
      setTeamData([])
    } finally {
      setLoading(false)
    }
  }

  const fetchTeamInfoForAll = async (teams: TeamLeaderboard[]) => {
    setLoadingTeamInfo(true)

    const updatedTeams = await Promise.all(
      teams.map(async (team) => {
        const teamInfo = await fetchTeamInfo(team.team_number)
        return { ...team, team_name: teamInfo.team_name, team_location: teamInfo.team_location }
      })
    )

    setTeamData(updatedTeams)
    setLoadingTeamInfo(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-red-950 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-8 w-24 h-24 mx-auto">
            <div className="w-24 h-24 border-4 border-red-600/20 rounded-full absolute inset-0" />
            <div className="w-24 h-24 border-4 border-red-500 border-t-transparent rounded-full animate-spin absolute inset-0" />
            <div className="w-16 h-16 border-2 border-red-700 border-b-transparent rounded-full animate-[spin_0.7s_linear_infinite_reverse] absolute inset-4" />
          </div>
          <motion.div
            className="space-y-3"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
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
    <div className="min-h-screen bg-gradient-to-br from-black via-red-950 to-black relative overflow-hidden">
      {/* Subtle CSS-only grid — no JS animation, zero CPU cost */}
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(220,38,38,0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(220,38,38,0.4) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* 4 ambient orbs — opacity only, long duration = smooth & cheap */}
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${
              i % 2 === 0 ? 'rgba(220,38,38,0.25)' : 'rgba(153,27,27,0.25)'
            } 0%, transparent 70%)`,
            width: `${160 + i * 80}px`,
            height: `${160 + i * 80}px`,
            left: `${10 + (i % 2) * 55}%`,
            top: `${15 + Math.floor(i / 2) * 45}%`,
          }}
          animate={{ opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 7 + i * 2, repeat: Infinity, ease: "easeInOut", delay: i * 1.2 }}
        />
      ))}

      {/* Main Content */}
      <div className="relative z-10">
        {/* Header */}
        <motion.div
          {...fadeUp(0)}
          className="p-8"
        >
          <div className="max-w-7xl mx-auto">
            {/* Navigation */}
            <div className="flex items-center justify-between mb-12">
              <motion.button
                onClick={onBack}
                whileHover={{ scale: 1.04, x: -4 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="group flex items-center space-x-3 bg-black/40 backdrop-blur-lg border border-red-600/30 hover:border-red-500/50 px-6 py-3 rounded-2xl transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-red-400 group-hover:text-red-300" />
                <span className="text-red-300 group-hover:text-white font-medium">Back to Individual</span>
              </motion.button>

              <div className="flex items-center space-x-4">
                <div className="bg-gradient-to-r from-red-600 to-red-700 p-3 rounded-full">
                  <Users className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>

            {/* Title */}
            <motion.div
              {...fadeUp(0.1)}
              className="text-center mb-16"
            >
              <h1 className="text-7xl font-black mb-6 bg-gradient-to-r from-red-400 via-red-500 to-red-600 bg-clip-text text-transparent">
                TEAM RANKINGS
              </h1>
              <p className="text-xl text-red-300/80 font-medium tracking-wide">
                Where Teams Rise • Ranked by Average ELO
              </p>
            </motion.div>
          </div>
        </motion.div>

        {/* Leaderboard Content */}
        <div className="px-8 pb-8">
          <div className="max-w-7xl mx-auto">
            {teamData.length > 0 ? (
              <div className="space-y-8">
                {/* Top 3 */}
                {teamData.slice(0, 3).length > 0 && (
                  <motion.div {...fadeUp(0.15)} className="mb-12">
                    <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
                      🏆 ELITE TEAMS 🏆
                    </h2>

                    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                      {teamData.slice(0, 3).map((team, index) => {
                        const rank = index + 1
                        const tier = getTeamEloTier(team.avg_elo)
                        return (
                          <motion.div
                            key={team.team_number}
                            initial={{ y: 40, opacity: 0, scale: 0.95 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            transition={{
                              duration: 0.4,
                              delay: 0.2 + index * 0.08,
                              ease: [0.25, 0.46, 0.45, 0.94],
                            }}
                            whileHover={{ y: -8, scale: 1.02 }}
                            style={{ willChange: 'transform' }}
                            className={`relative group ${
                              rank === 1 ? 'md:order-2 md:scale-105' :
                              rank === 2 ? 'md:order-1' : 'md:order-3'
                            }`}
                          >
                            <div className={`relative p-8 rounded-3xl border-2 backdrop-blur-xl overflow-hidden h-full flex flex-col items-center justify-center ${
                              rank === 1
                                ? 'border-red-500/70 bg-gradient-to-br from-red-900/60 to-red-950/60'
                                : rank === 2
                                ? 'border-red-600/50 bg-gradient-to-br from-red-900/40 to-black/40'
                                : 'border-red-700/50 bg-gradient-to-br from-red-950/40 to-black/30'
                            }`}>

                              {/* Crown / rank badge */}
                              <div className={` ${
                                rank === 1 ? 'w-16 h-16' : 'w-12 h-12'
                              } ${
                                rank === 1
                                  ? 'bg-gradient-to-br from-red-400 to-red-600'
                                  : rank === 2
                                  ? 'bg-gradient-to-br from-red-500 to-red-700'
                                  : 'bg-gradient-to-br from-red-600 to-red-800'
                              } rounded-full flex items-center justify-center border-4 border-black shadow-2xl`}>
                                {rank === 1 ? (
                                  <Crown className="w-8 h-8 text-white" />
                                ) : (
                                  <span className="text-white font-black text-xl">#{rank}</span>
                                )}
                              </div>

                              {/* Team Info */}
                              <div className="text-center mb-6 pt-6">
                                <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full mb-4 ${
                                  rank === 1
                                    ? 'bg-red-500/30 border border-red-400/50'
                                    : 'bg-red-600/20 border border-red-500/30'
                                }`}>
                                  <span className="text-red-200 font-bold text-sm tracking-wider">
                                    {tier.name.toUpperCase()}
                                  </span>
                                </div>

                                <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-red-300 transition-colors">
                                  {loadingTeamInfo ? `Team ${team.team_number}` : (team.team_name || `Team ${team.team_number}`)}
                                </h3>
                                <p className="text-red-300/70 text-sm">
                                  #{team.team_number} • {loadingTeamInfo ? 'Loading...' : team.team_location}
                                </p>
                              </div>

                              {/* Stats */}
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

                              {/* ELO progress bar */}
                              <div className="mt-6">
                                <div className="h-3 bg-black rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, (team.avg_elo / 2000) * 100)}%` }}
                                    transition={{ delay: 0.4 + index * 0.08, duration: 0.9, ease: "easeOut" }}
                                    className={`h-full rounded-full bg-gradient-to-r ${tier.color}`}
                                  />
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  </motion.div>
                )}

                {/* Other Teams */}
                {teamData.length > 3 && (
                  <motion.div {...fadeUp(0.25)}>
                    <h2 className="text-2xl font-bold text-center mb-6 text-red-300">
                      🛡️ TEAM RANKINGS 🛡️
                    </h2>

                    <div className="grid gap-4 max-w-4xl mx-auto">
                      {teamData.slice(3, displayedCount).map((team, index) => {
                        const tier = getTeamEloTier(team.avg_elo)
                        return (
                          <motion.div
                            key={team.team_number}
                            custom={index}
                            variants={rowVariants}
                            initial="hidden"
                            animate="visible"
                            whileHover={{ x: 8, scale: 1.01 }}
                            style={{ willChange: 'transform' }}
                            className="group flex items-center p-6 rounded-2xl border backdrop-blur-lg transition-colors border-red-800/30 bg-gradient-to-r from-red-950/20 to-black/20 hover:border-red-600/50"
                          >
                            {/* Rank Badge */}
                            <div className="shrink-0 w-16 h-16 bg-gradient-to-br from-red-600 to-red-800 rounded-2xl flex items-center justify-center mr-6 group-hover:scale-105 transition-transform">
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

                                {/*<ChevronRight className="w-6 h-6 text-red-500 group-hover:text-red-300 group-hover:translate-x-1 transition-all" />*/}
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}

                      {hasMoreData && (
                        <motion.button
                          {...fadeUp(0.3)}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => fetchTeamLeaderboardData(true)}
                          className="w-full mt-6 p-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold rounded-xl border border-red-500/30 transition-colors"
                        >
                          <div className="flex items-center justify-center space-x-2">
                            <span>Load More Teams</span>
                            <span className="text-red-200">({teamData.length - displayedCount} remaining)</span>
                          </div>
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            ) : (
              <motion.div {...fadeUp(0.15)} className="text-center py-20">
                <motion.div
                  animate={{ scale: [1, 1.06, 1], opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
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
        <CookieFooter />
      </div>
    </div>
  )
}
