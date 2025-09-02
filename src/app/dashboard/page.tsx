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
  LogOut
} from 'lucide-react'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentView, setCurrentView] = useState<'dashboard' | 'leaderboard'>('dashboard')
  const [userStats, setUserStats] = useState({
    bestScore: 0,
    quizzesCompleted: 0,
    teamRank: 0,
    streakDays: 0
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
      
      // Load user stats from localStorage (could be from database in future)
      const bestScore = localStorage.getItem(`bestScore_${data.user.id}_into-the-deep`) || '0'
      const quizzesCompleted = localStorage.getItem(`quizzesCompleted_${data.user.id}`) || '0'
      
      setUserStats({
        bestScore: parseInt(bestScore),
        quizzesCompleted: parseInt(quizzesCompleted),
        teamRank: Math.floor(Math.random() * 50) + 1, // TODO: Calculate from database
        streakDays: Math.floor(Math.random() * 10) + 1 // TODO: Calculate from database
      })
      
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
      description: 'See team rankings',
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
    },
    { 
      icon: Users, 
      label: 'Team Stats', 
      description: 'View team progress',
      action: () => {}, 
      color: 'from-green-500 to-teal-500',
      hoverColor: 'hover:from-green-600 hover:to-teal-600'
    }
  ]

  const statCards = [
    { 
      label: 'Best Score', 
      value: `${userStats.bestScore}/3`, 
      percentage: Math.round((userStats.bestScore / 3) * 100),
      icon: Trophy, 
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10'
    },
    { 
      label: 'Quizzes Completed', 
      value: userStats.quizzesCompleted.toString(), 
      icon: Brain, 
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    },
    { 
      label: 'Team Rank', 
      value: `#${userStats.teamRank}`, 
      icon: TrendingUp, 
      color: 'text-green-400',
      bgColor: 'bg-green-500/10'
    },
    { 
      label: 'Current Streak', 
      value: `${userStats.streakDays} days`, 
      icon: Calendar, 
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10'
    }
  ]

  return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedBackground />
      
      <div className="relative z-10 min-h-screen">
        {/* Header */}
        <motion.header
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="p-6"
        >
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-red-600 to-red-800 rounded-lg flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-cyber font-bold bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
                  Dashboard
                </h1>
                <p className="text-gray-400 text-sm">Welcome back, {user.user_metadata?.username || user.user_metadata?.full_name || user.email}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-gray-400">Team</div>
                <div className="text-white font-semibold">
                  {user.user_metadata?.team_number ? `#${user.user_metadata.team_number}` : 'No Team'}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.header>

        {/* Main Content */}
        <div className="px-6 pb-6">
          <div className="max-w-7xl mx-auto space-y-8">
            
            {/* Stats Grid */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                <Award className="w-6 h-6 mr-2 text-red-400" />
                Your Progress
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3 + index * 0.1, duration: 0.4 }}
                    className="bg-black/40 backdrop-blur-sm rounded-xl p-6 border border-gray-800/50 hover:border-red-500/30 transition-all group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                        <stat.icon className={`w-6 h-6 ${stat.color}`} />
                      </div>
                      {stat.percentage && (
                        <div className="text-sm text-gray-400">{stat.percentage}%</div>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                    <div className="text-sm text-gray-400">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                <Zap className="w-6 h-6 mr-2 text-red-400" />
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {quickActions.map((action, index) => (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.05, y: -5 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={action.action}
                    className={`bg-gradient-to-br ${action.color} ${action.hoverColor} rounded-xl p-6 text-left transition-all shadow-lg hover:shadow-xl group`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <action.icon className="w-8 h-8 text-white" />
                      <div className="w-2 h-2 bg-white/30 rounded-full group-hover:bg-white/50 transition-colors"></div>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{action.label}</h3>
                    <p className="text-sm text-white/80">{action.description}</p>
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Recent Activity */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              <RecentQuizzes limit={5} />
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  )
}
