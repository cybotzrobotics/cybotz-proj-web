'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/utils/supabaseClient'
import AnimatedBackground from '@/components/AnimatedBackground'
import QuizInterface from '@/components/QuizInterface'
import { ArrowLeft } from 'lucide-react'

export default function QuizPage() {
  const [user, setUser] = useState<any>(null)
  const [isGuest, setIsGuest] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check if this is guest mode from URL params
    const guestMode = searchParams.get('guest') === 'true'
    setIsGuest(guestMode)

    // Check authentication status
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user && !guestMode) {
        // If not logged in and not guest mode, redirect to login
        router.push('/login')
        return
      }
      
      setUser(user)
    }

    checkUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' && !guestMode) {
        router.push('/login')
      } else if (session?.user) {
        setUser(session.user)
      }
    })

    return () => subscription.unsubscribe()
  }, [router, searchParams])

  const handleBack = () => {
    if (isGuest || !user) {
      router.push('/login')
    } else {
      router.push('/login') // Since we removed dashboard, go back to login
    }
  }

  const handleQuizComplete = () => {
    // After quiz completion, show some feedback and allow going back
    console.log('Quiz completed!')
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedBackground />
      
      {/* Header */}
      <div className="relative z-20 p-6">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <button
            onClick={handleBack}
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-cyber">Back</span>
          </button>
          
          <div className="text-center">
            <div className="text-2xl font-cyber font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
              FTC QUIZ
            </div>
            {isGuest && (
              <div className="text-xs text-gray-400 mt-1">Guest Mode</div>
            )}
            {user && (
              <div className="text-xs text-gray-400 mt-1">
                Welcome, {user.user_metadata?.username || user.user_metadata?.full_name || user.email}
              </div>
            )}
          </div>

          {!isGuest && user && (
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                router.push('/login')
              }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm transition-colors"
            >
              Logout
            </button>
          )}
        </div>
      </div>

      {/* Quiz Interface */}
      <div className="relative z-10">
        <QuizInterface
          season="into-the-deep" // Default season, could be made configurable
          onBack={handleBack}
          isGuest={isGuest}
          onComplete={handleQuizComplete}
        />
      </div>
    </div>
  )
}
