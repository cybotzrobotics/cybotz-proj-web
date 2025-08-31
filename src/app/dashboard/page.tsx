'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabaseClient'
import AnimatedBackground from '@/components/AnimatedBackground'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser()
      setUser(data?.user || null)
      setLoading(false)
    }
    getUser()
  }, [])

  if (loading) return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedBackground />
      <div className="relative z-10 text-white text-center mt-20">Loading...</div>
    </div>
  )
  
  if (!user) {
    if (typeof window !== 'undefined') window.location.href = '/login'
    return (
      <div className="min-h-screen relative overflow-hidden">
        <AnimatedBackground />
        <div className="relative z-10 text-white text-center mt-20">Redirecting to login...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedBackground />
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center">
        <div className="bg-black/80 rounded-xl p-8 shadow-lg border border-red-800 max-w-lg w-full">
          <h2 className="text-3xl font-bold text-red-500 mb-4">Team Dashboard</h2>
          <div className="text-white mb-2">Welcome, <span className="text-red-400 font-semibold">{user.email}</span></div>
          {/* Placeholder for team info, stats, leaderboard, etc. */}
          <div className="mt-4 text-gray-300">Team and leaderboard features coming soon.</div>
          <button
            className="mt-6 w-full py-2 bg-red-600 hover:bg-red-700 rounded text-white font-bold"
            onClick={async () => {
              await supabase.auth.signOut()
              window.location.href = '/login'
            }}
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  )
}
