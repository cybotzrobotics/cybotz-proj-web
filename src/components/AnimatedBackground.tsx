'use client'

import { useEffect, useState } from 'react'

// Client-side only matrix rain to avoid hydration issues
function MatrixRain() {
  return (
    <div className="absolute inset-0 overflow-hidden opacity-40">
      {Array.from({ length: 25 }).map((_, i) => (
        <div
          key={i}
          className="absolute text-red-500 font-mono text-sm animate-matrix"
          style={{
            left: `${(i * 4)}%`,
            animationDelay: `${i * 0.4}s`,
            animationDuration: `${12 + (i % 4)}s`,
          }}
        >
          {Array.from({ length: 12 }).map((_, j) => {
            const chars = ['0', '1', 'ア', 'イ', 'ウ', 'エ', 'オ', 'カ', 'キ', 'ク', 'ケ', 'コ', 'サ', 'シ', 'ス', 'セ', 'ソ', 'タ', 'チ', 'ツ', 'テ', 'ト']
            return (
              <div key={j} className="opacity-90 mb-3 text-red-400">
                {chars[(i + j * 2) % chars.length]}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

export default function AnimatedBackground() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="fixed inset-0 -z-10">
      {/* Black Background */}
      <div className="absolute inset-0 bg-black" />
      
      {/* Subtle maroon grid overlay */}
      <div className="absolute inset-0" style={{
        backgroundImage: `linear-gradient(rgba(139, 21, 56, 0.05) 1px, transparent 1px),
                         linear-gradient(90deg, rgba(139, 21, 56, 0.05) 1px, transparent 1px)`,
        backgroundSize: '50px 50px'
      }} />
      
      {/* Matrix Rain Effect - Only render on client */}
      {mounted && <MatrixRain />}

      {/* Animated maroon particles */}
      <div className="absolute inset-0">
        {Array.from({ length: 25 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-red-600/30 rounded-full animate-pulse"
            style={{
              left: `${Math.sin(i * 0.8) * 45 + 50}%`,
              top: `${Math.cos(i * 0.6) * 45 + 50}%`,
              animationDelay: `${i * 0.3}s`,
              animationDuration: `${4 + (i % 3)}s`,
            }}
          />
        ))}
      </div>

      {/* Ambient Glow Effects - Maroon theme */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-800/5 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-600/8 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-red-400/3 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '4s' }} />
    </div>
  )
}
