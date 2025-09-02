'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to login page immediately
    router.push('/login')
  }, [router])

  // Show a loading state while redirecting
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="text-red-500 text-2xl font-bold mb-4">FTC Quiz</div>
        <div className="text-gray-400">Redirecting to login...</div>
      </div>
    </div>
  )
}
