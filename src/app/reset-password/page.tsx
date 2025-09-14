'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/utils/supabaseClient'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle } from 'lucide-react'
import AnimatedBackground from '@/components/AnimatedBackground'

function ResetPasswordContent() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isValidSession, setIsValidSession] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check if user came from a valid reset link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setIsValidSession(true)
      } else {
        // Try to get session from URL hash (Supabase auth callback)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        
        if (accessToken && refreshToken) {
          setIsValidSession(true)
        } else {
          setError('Invalid or expired reset link. Please request a new password reset.')
        }
      }
    }
    
    checkSession()
  }, [])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }
    
    setLoading(true)
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })
      
      if (error) throw error
      
      setSuccess(true)
      
      // Redirect to login after a short delay
      setTimeout(() => {
        router.push('/login')
      }, 3000)
      
    } catch (err: any) {
      setError(err.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  if (!isValidSession && !error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <AnimatedBackground />
        <div className="bg-black/90 rounded-xl p-8 shadow-2xl border border-red-800/50 backdrop-blur-sm">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-4"></div>
            <p className="text-gray-300">Verifying reset link...</p>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <AnimatedBackground />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-black/90 rounded-xl p-8 shadow-2xl border border-green-800/50 backdrop-blur-sm max-w-md w-full mx-4"
        >
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-500 mb-4">Password Reset Successful!</h2>
            <p className="text-gray-300 mb-4">
              Your password has been successfully updated. You will be redirected to the login page in a few seconds.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="w-full py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-lg text-white font-bold transition-all transform hover:scale-105"
            >
              Go to Login
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <AnimatedBackground />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-black/90 rounded-xl p-8 shadow-2xl border border-red-800/50 backdrop-blur-sm max-w-md w-full mx-4"
      >
        <div className="text-center mb-8">
          <Lock className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-500 mb-2">Reset Your Password</h2>
          <p className="text-gray-300 text-sm">Enter your new password below</p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-red-900/50 border border-red-700 rounded-lg mb-4 flex items-center"
          >
            <AlertCircle className="w-5 h-5 text-red-400 mr-2 flex-shrink-0" />
            <div className="text-red-400 text-sm">{error}</div>
          </motion.div>
        )}

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-gray-300 mb-2">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter new password"
                className="w-full p-3 pr-12 rounded-lg bg-black/70 border border-red-700/50 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Confirm new password"
                className="w-full p-3 pr-12 rounded-lg bg-black/70 border border-red-700/50 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="text-xs text-gray-400">
            Password must be at least 6 characters long
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-lg text-white font-bold transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? 'Updating Password...' : 'Update Password'}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="text-red-400 hover:text-red-300 text-sm underline transition-colors"
            >
              Back to Login
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
