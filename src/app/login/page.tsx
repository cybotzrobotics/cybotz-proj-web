'use client'
import LoginTeam from '@/components/LoginTeam'
import AnimatedBackground from '@/components/AnimatedBackground'

export default function LoginPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedBackground />
      <div className="relative z-10 min-h-screen flex items-center justify-center">
        <LoginTeam />
      </div>
    </div>
  )
}
