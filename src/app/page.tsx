'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Zap, Trophy, Play, Settings, Users, BookOpen } from 'lucide-react'
import AnimatedBackground from '@/components/AnimatedBackground'
import QuizInterface from '@/components/QuizInterface'
import SeasonSelector from '@/components/SeasonSelector'

const seasons = {
  'into-the-deep': {
    name: 'Into The Deep',
    year: '2024-25',
    color: 'from-blue-500 to-cyan-400',
    icon: '🌊',
    description: 'Navigate the depths of robotics challenges'
  },
  'decode': {
    name: 'Decode',
    year: '2025-26',
    color: 'from-purple-500 to-pink-400',
    icon: '🔐',
    description: 'Unlock the secrets of advanced robotics'
  }
}

export default function HomePage() {
  const [currentView, setCurrentView] = useState<'home' | 'quiz' | 'settings'>('home')
  const [selectedSeason, setSelectedSeason] = useState('into-the-deep')
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  const menuItems = [
    { icon: Play, label: 'Start Quiz', action: () => setCurrentView('quiz'), color: 'text-red-400' },
    { icon: Trophy, label: 'Leaderboard', action: () => {}, color: 'text-red-500' },
    { icon: Users, label: 'Team Mode', action: () => window.location.href = '/team', color: 'text-red-600' },
    { icon: BookOpen, label: 'Study Mode', action: () => {}, color: 'text-red-300' },
    { icon: Settings, label: 'Settings', action: () => setCurrentView('settings'), color: 'text-gray-400' },
  ]

  return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedBackground />
      
      <div className="relative z-10">
        <AnimatePresence mode="wait">
          {currentView === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="min-h-screen flex flex-col"
            >
              {/* Header */}
              <motion.header
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.8 }}
                className="p-6"
              >
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-r from-red-600 to-red-800 rounded-lg flex items-center justify-center animate-glow">
                        <Brain className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div>
                      <h1 className="text-2xl font-cyber font-bold bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
                        CyBotz Quiz Master
                      </h1>
                      <p className="text-gray-400 text-sm">FTC Game Manual Mastery</p>
                    </div>
                  </div>
                  
                  <SeasonSelector
                    seasons={seasons}
                    selectedSeason={selectedSeason}
                    onSeasonChange={setSelectedSeason}
                  />
                </div>
              </motion.header>

              {/* Hero Section */}
              <motion.main
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="flex-1 flex items-center justify-center p-6"
              >
                <div className="max-w-4xl mx-auto text-center">
                  <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.8 }}
                    className="mb-8"
                  >
                    <h2 className="text-6xl md:text-8xl font-cyber font-black mb-6">
                      <span className="bg-gradient-to-r from-red-400 via-red-500 to-red-600 bg-clip-text text-transparent animate-pulse-slow">
                        MASTER
                      </span>
                      <br />
                      <span className="text-white">THE RULES</span>
                    </h2>
                    <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
                      Train your mind with AI-powered questions from the{' '}
                      <span className="text-red-400 font-semibold">
                        {seasons[selectedSeason as keyof typeof seasons].name}
                      </span>{' '}
                      game manual. Become the ultimate FTC strategist.
                    </p>
                  </motion.div>

                  {/* Stats Cards */}
                  <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.8, duration: 0.8 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
                  >
                    {[
                      { label: 'Questions Generated', value: '1,247', icon: Brain },
                      { label: 'Teams Training', value: '156', icon: Users },
                      { label: 'Success Rate', value: '94%', icon: Trophy },
                    ].map((stat, index) => (
                      <motion.div
                        key={index}
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 1 + index * 0.1, duration: 0.6 }}
                        className="ftc-card hover:border-red-500/50 hover:shadow-red-500/20 group"
                      >
                        <stat.icon className="w-8 h-8 text-red-400 mb-3 mx-auto group-hover:animate-bounce" />
                        <div className="text-3xl font-cyber font-bold text-white mb-1">{stat.value}</div>
                        <div className="text-gray-400 text-sm">{stat.label}</div>
                      </motion.div>
                    ))}
                  </motion.div>

                  {/* Action Buttons */}
                  <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1.2, duration: 0.8 }}
                    className="grid grid-cols-2 md:grid-cols-5 gap-4 max-w-4xl mx-auto"
                  >
                    {menuItems.map((item, index) => (
                      <motion.button
                        key={index}
                        whileHover={{ scale: 1.05, y: -5 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={item.action}
                        className="ftc-card flex flex-col items-center space-y-3 p-6 hover:bg-gradient-to-br hover:from-white/10 hover:to-red-600/5 group"
                      >
                        <item.icon className={`w-8 h-8 ${item.color} group-hover:animate-pulse`} />
                        <span className="font-semibold text-white group-hover:text-red-400 transition-colors">
                          {item.label}
                        </span>
                      </motion.button>
                    ))}
                  </motion.div>
                </div>
              </motion.main>
            </motion.div>
          )}

          {currentView === 'quiz' && (
            <QuizInterface
              season={selectedSeason}
              onBack={() => setCurrentView('home')}
            />
          )}

          {currentView === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="min-h-screen flex items-center justify-center p-6"
            >
              <div className="ftc-card max-w-2xl w-full">
                <h2 className="text-3xl font-cyber font-bold mb-6 text-electric-blue">Settings</h2>
                <div className="space-y-4">
                  <p className="text-gray-400">Settings panel coming soon...</p>
                  <button
                    onClick={() => setCurrentView('home')}
                    className="cyber-button"
                  >
                    Back to Home
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
