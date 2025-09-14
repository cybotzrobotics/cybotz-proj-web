'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/utils/supabaseClient'
import { ArrowLeft, Zap, Users, Trophy, BookOpen } from 'lucide-react'
import AnimatedBackground from '@/components/AnimatedBackground'
import LoginTeam from '@/components/LoginTeam'

export default function LoginPage() {
  const [user, setUser] = useState<any>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [explosions, setExplosions] = useState<Array<{ id: number; x: number; y: number; timestamp: number }>>([])
  const router = useRouter()

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        router.push('/dashboard')
      }
    }

    checkUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        router.push('/dashboard')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  // Track mouse position for cursor glow effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    const handleClick = (e: MouseEvent) => {
      // Check if click is over a form element or interactive element
      const target = e.target as HTMLElement
      const isFormArea = target.closest('form') || 
                        target.closest('input') || 
                        target.closest('button') || 
                        target.closest('textarea') || 
                        target.closest('select') ||
                        target.closest('[role="button"]') ||
                        target.closest('a')
      
      // Don't create explosion if clicking on form elements
      if (isFormArea) return
      
      // Create explosion at click position
      const newExplosion = {
        id: Date.now(),
        x: e.clientX,
        y: e.clientY,
        timestamp: Date.now()
      }
      
      setExplosions(prev => [...prev, newExplosion])
      
      // Remove explosion after animation completes
      setTimeout(() => {
        setExplosions(prev => prev.filter(exp => exp.id !== newExplosion.id))
      }, 1500)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('click', handleClick)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('click', handleClick)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden">
      <AnimatedBackground />
      
      {/* Cursor Glow Effect */}
      <motion.div
        className="fixed pointer-events-none z-50"
        animate={{
          x: mousePosition.x - 25,
          y: mousePosition.y - 25,
        }}
        transition={{
          type: "spring",
          damping: 25,
          stiffness: 400,
          mass: 0.5
        }}
      >
        <div className="w-12 h-12 bg-gradient-to-r from-red-600/50 to-amber-600/50 rounded-full blur-xl" />
      </motion.div>
      
      {/* Secondary subtle glow */}
      <motion.div
        className="fixed pointer-events-none z-40"
        animate={{
          x: mousePosition.x - 15,
          y: mousePosition.y - 15,
        }}
        transition={{
          type: "spring",
          damping: 15,
          stiffness: 300,
          mass: 0.3
        }}
      >
        <div className="w-8 h-8 bg-gradient-to-r from-red-500/70 to-amber-500/70 rounded-full blur-lg" />
      </motion.div>
      
      {/* Immediate tracking core */}
      <motion.div
        className="fixed pointer-events-none z-45"
        animate={{
          x: mousePosition.x - 8,
          y: mousePosition.y - 8,
        }}
        transition={{
          type: "spring",
          damping: 8,
          stiffness: 600,
          mass: 0.1
        }}
      >
        <div className="w-4 h-4 bg-gradient-to-r from-red-400/80 to-amber-400/80 rounded-full blur-md" />
      </motion.div>
      
      {/* Click Explosions */}
      <AnimatePresence>
        {explosions.map((explosion) => (
          <div key={explosion.id} className="fixed pointer-events-none z-50">
            {/* Main particle burst - more particles! */}
            {Array.from({ length: 20 }).map((_, index) => (
              <motion.div
                key={`main-${index}`}
                className="absolute w-3 h-3 rounded-full"
                style={{
                  left: explosion.x - 6,
                  top: explosion.y - 6,
                  background: `linear-gradient(45deg, 
                    ${index % 3 === 0 ? '#ff4444' : index % 3 === 1 ? '#ff8800' : '#ffff00'}, 
                    ${index % 3 === 0 ? '#ff8800' : index % 3 === 1 ? '#ffff00' : '#ff4444'})`,
                }}
                initial={{
                  scale: 0,
                  x: 0,
                  y: 0,
                  opacity: 1,
                  rotate: 0,
                }}
                animate={{
                  scale: [0, 1.5, 0.8, 0],
                  x: Math.cos((index * 18) * Math.PI / 180) * (60 + Math.random() * 50),
                  y: Math.sin((index * 18) * Math.PI / 180) * (60 + Math.random() * 50) - Math.random() * 20,
                  opacity: [1, 1, 0.7, 0],
                  rotate: Math.random() * 360,
                }}
                exit={{
                  opacity: 0,
                  scale: 0,
                }}
                transition={{
                  duration: 1.2,
                  ease: [0.25, 0.46, 0.45, 0.94],
                  delay: index * 0.01,
                }}
              />
            ))}

            {/* Secondary smaller sparkles */}
            {Array.from({ length: 15 }).map((_, index) => (
              <motion.div
                key={`sparkle-${index}`}
                className="absolute w-1 h-1 bg-white rounded-full"
                style={{
                  left: explosion.x - 2,
                  top: explosion.y - 2,
                  boxShadow: '0 0 4px #fff, 0 0 8px #fff',
                }}
                initial={{
                  scale: 0,
                  x: 0,
                  y: 0,
                  opacity: 1,
                }}
                animate={{
                  scale: [0, 2, 1, 0],
                  x: (Math.random() - 0.5) * 120,
                  y: (Math.random() - 0.5) * 120 - Math.random() * 30,
                  opacity: [1, 1, 0.5, 0],
                }}
                exit={{
                  opacity: 0,
                  scale: 0,
                }}
                transition={{
                  duration: 1.5,
                  ease: "easeOut",
                  delay: 0.1 + index * 0.02,
                }}
              />
            ))}

            {/* Fiery trails */}
            {Array.from({ length: 8 }).map((_, index) => (
              <motion.div
                key={`trail-${index}`}
                className="absolute w-6 h-1 rounded-full"
                style={{
                  left: explosion.x - 12,
                  top: explosion.y - 2,
                  background: `linear-gradient(90deg, #ff4444, #ff8800, transparent)`,
                }}
                initial={{
                  scale: 0,
                  x: 0,
                  y: 0,
                  opacity: 1,
                  rotate: index * 45,
                }}
                animate={{
                  scale: [0, 2, 0],
                  x: Math.cos((index * 45) * Math.PI / 180) * 80,
                  y: Math.sin((index * 45) * Math.PI / 180) * 80,
                  opacity: [1, 0.8, 0],
                  rotate: index * 45 + 180,
                }}
                exit={{
                  opacity: 0,
                  scale: 0,
                }}
                transition={{
                  duration: 0.8,
                  ease: "easeOut",
                  delay: 0.05,
                }}
              />
            ))}
            
            {/* Multiple center burst effects with different sizes */}
            <motion.div
              className="absolute w-12 h-12 bg-gradient-to-r from-red-400/80 to-orange-400/80 rounded-full blur-lg"
              style={{
                left: explosion.x - 24,
                top: explosion.y - 24,
              }}
              initial={{
                scale: 0,
                opacity: 1,
              }}
              animate={{
                scale: [0, 4, 1.5, 0],
                opacity: [1, 0.8, 0.3, 0],
              }}
              exit={{
                opacity: 0,
                scale: 0,
              }}
              transition={{
                duration: 1.0,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            />

            {/* Secondary burst */}
            <motion.div
              className="absolute w-8 h-8 bg-gradient-to-r from-yellow-400/90 to-red-400/90 rounded-full blur-md"
              style={{
                left: explosion.x - 16,
                top: explosion.y - 16,
              }}
              initial={{
                scale: 0,
                opacity: 1,
              }}
              animate={{
                scale: [0, 3, 0],
                opacity: [1, 0.9, 0],
              }}
              exit={{
                opacity: 0,
                scale: 0,
              }}
              transition={{
                duration: 0.7,
                ease: "easeOut",
                delay: 0.1,
              }}
            />
            
            {/* Multiple expanding rings */}
            <motion.div
              className="absolute w-20 h-20 border-2 border-red-500/60 rounded-full"
              style={{
                left: explosion.x - 40,
                top: explosion.y - 40,
              }}
              initial={{
                scale: 0,
                opacity: 1,
              }}
              animate={{
                scale: [0, 3],
                opacity: [1, 0],
              }}
              exit={{
                opacity: 0,
                scale: 0,
              }}
              transition={{
                duration: 1.2,
                ease: "easeOut",
              }}
            />

            <motion.div
              className="absolute w-16 h-16 border border-orange-400/40 rounded-full"
              style={{
                left: explosion.x - 32,
                top: explosion.y - 32,
              }}
              initial={{
                scale: 0,
                opacity: 1,
              }}
              animate={{
                scale: [0, 2.5],
                opacity: [1, 0],
              }}
              exit={{
                opacity: 0,
                scale: 0,
              }}
              transition={{
                duration: 1.0,
                ease: "easeOut",
                delay: 0.1,
              }}
            />

            <motion.div
              className="absolute w-12 h-12 border border-yellow-400/30 rounded-full"
              style={{
                left: explosion.x - 24,
                top: explosion.y - 24,
              }}
              initial={{
                scale: 0,
                opacity: 1,
              }}
              animate={{
                scale: [0, 2],
                opacity: [1, 0],
              }}
              exit={{
                opacity: 0,
                scale: 0,
              }}
              transition={{
                duration: 0.8,
                ease: "easeOut",
                delay: 0.2,
              }}
            />

            {/* Screen shake effect */}
            <motion.div
              className="fixed inset-0 pointer-events-none"
              initial={{
                x: 0,
                y: 0,
              }}
              animate={{
                x: [0, 2, -2, 1, -1, 0],
                y: [0, 1, -1, 2, -2, 0],
              }}
              transition={{
                duration: 0.3,
                ease: "easeOut",
              }}
            />
          </div>
        ))}
      </AnimatePresence>
      
      {/* Header */}
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-20 p-6"
      >
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/')}
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-cyber">Back to Home</span>
          </motion.button>
          
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="text-2xl font-cyber font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent"
          >
            FTC QUIZ
          </motion.div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="relative z-10 flex items-start justify-center px-6 pt-8 pb-12">
        <div className="max-w-6xl w-full grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Side - Welcome Content */}
          <motion.div 
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left space-y-6"
          >
            <div className="space-y-3">
              <motion.h1 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-4xl lg:text-5xl font-cyber font-black"
              >
                <span className="bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent">
                  Welcome
                </span>
                <br />
                <span className="text-white">Back</span>
              </motion.h1>
              
              <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-lg text-gray-300 max-w-md mx-auto lg:mx-0"
              >
                Continue your FTC journey and master the game rules with your team
              </motion.p>
            </div>

            {/* Feature Highlights */}
            <motion.div 
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto lg:mx-0"
            >
              <div className="bg-black/40 backdrop-blur-sm rounded-xl p-3 border border-red-800/30">
                <Zap className="w-6 h-6 text-yellow-500 mb-1" />
                <h3 className="font-semibold text-white text-sm mb-1">AI-Powered</h3>
                <p className="text-xs text-gray-400">Smart questions tailored to your skill level</p>
              </div>
              
              <div className="bg-black/40 backdrop-blur-sm rounded-xl p-3 border border-red-800/30">
                <Users className="w-6 h-6 text-blue-500 mb-1" />
                <h3 className="font-semibold text-white text-sm mb-1">Team Based</h3>
                <p className="text-xs text-gray-400">Compete with your FTC team members</p>
              </div>
              
              <div className="bg-black/40 backdrop-blur-sm rounded-xl p-3 border border-red-800/30">
                <Trophy className="w-6 h-6 text-green-500 mb-1" />
                <h3 className="font-semibold text-white text-sm mb-1">Leaderboards</h3>
                <p className="text-xs text-gray-400">Track your progress and rankings</p>
              </div>
              
              <div className="bg-black/40 backdrop-blur-sm rounded-xl p-3 border border-red-800/30">
                <BookOpen className="w-6 h-6 text-purple-500 mb-1" />
                <h3 className="font-semibold text-white text-sm mb-1">Learn Rules</h3>
                <p className="text-xs text-gray-400">Master the latest FTC game manual</p>
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div 
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex justify-center lg:justify-start space-x-6 text-center"
            >
              <div>
                <div className="text-2xl font-cyber font-bold text-red-500">550+</div>
                <div className="text-xs text-gray-400">Questions</div>
              </div>
              <div>
                <div className="text-2xl font-cyber font-bold text-orange-500">50+</div>
                <div className="text-xs text-gray-400">Teams</div>
              </div>
              <div>
                <div className="text-2xl font-cyber font-bold text-yellow-500">1000+</div>
                <div className="text-xs text-gray-400">Quiz Sessions</div>
              </div>
            </motion.div>

            {/* Guest Quiz Button - Moved up for better visibility */}
            <motion.div 
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.0 }}
              className="max-w-md mx-auto lg:mx-0"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/guest-quiz')}
                className="w-full py-4 bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 rounded-xl text-white font-semibold transition-all border border-gray-600/50 hover:border-gray-500 flex items-center justify-center space-x-3 shadow-lg"
              >
                <Zap className="w-6 h-6 text-yellow-400" />
                <span className="text-lg">Try 5 Sample Questions</span>
              </motion.button>
              
              <p className="text-xs text-gray-500 text-center mt-2">
                No registration required • Preview our question collection
              </p>
            </motion.div>
          </motion.div>

          <motion.div 
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex justify-center lg:justify-end"
          >
            <div className="w-full max-w-md">
              <LoginTeam />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Background Decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ 
            rotate: [0, 360],
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            duration: 20, 
            repeat: Infinity, 
            ease: "linear" 
          }}
          className="absolute top-1/4 -left-20 w-40 h-40 bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-full blur-xl"
        />
        <motion.div 
          animate={{ 
            rotate: [360, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ 
            duration: 25, 
            repeat: Infinity, 
            ease: "linear" 
          }}
          className="absolute bottom-1/4 -right-20 w-60 h-60 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-xl"
        />
      </div>

      {/* Developer Branding Footer */}
      <motion.footer 
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.0, duration: 0.6 }}
        className="absolute bottom-8 left-0 right-0 z-20"
      >
        <div className="flex items-center justify-center">
          <div className="flex items-center space-x-3 text-gray-400 text-sm">
            <motion.span 
              whileHover={{ color: "#ef4444" }}
              className="transition-colors duration-200"
            >
              Powered by Cybotz
            </motion.span>
            <span className="text-gray-600">•</span>
            <motion.span 
              whileHover={{ color: "#3b82f6" }}
              className="transition-colors duration-200"
            >
              Developed by Aarya Raut
            </motion.span>
          </div>
        </div>
      </motion.footer>
    </div>
  )
}
