'use client'
import RegisterTeam from '@/components/RegisterTeam'
import AnimatedBackground from '@/components/AnimatedBackground'

export default function TeamPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedBackground />
      <div className="relative z-10 min-h-screen flex items-center justify-center">
        <RegisterTeam />
      </div>
    </div>
  )
}
