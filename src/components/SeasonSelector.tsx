'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Calendar } from 'lucide-react'

interface Season {
  name: string
  year: string
  color: string
  icon: string
  description: string
}

interface SeasonSelectorProps {
  seasons: Record<string, Season>
  selectedSeason: string
  onSeasonChange: (season: string) => void
}

export default function SeasonSelector({ seasons, selectedSeason, onSeasonChange }: SeasonSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const currentSeason = seasons[selectedSeason]

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 glass-morphism px-6 py-3 rounded-xl border border-white/20 hover:border-electric-blue/50 transition-all duration-300"
      >
        <div className="text-2xl">{currentSeason.icon}</div>
        <div className="text-left">
          <div className="font-cyber font-bold text-white">{currentSeason.name}</div>
          <div className="text-gray-400 text-sm">{currentSeason.year}</div>
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40"
            />
            
            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full mt-2 right-0 z-50 w-80 glass-morphism rounded-xl border border-white/20 overflow-hidden"
            >
              <div className="p-2">
                {Object.entries(seasons).map(([key, season]) => (
                  <motion.button
                    key={key}
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      onSeasonChange(key)
                      setIsOpen(false)
                    }}
                    className={`w-full flex items-center space-x-4 p-4 rounded-lg transition-all duration-300 ${
                      selectedSeason === key
                        ? 'bg-electric-blue/20 border border-electric-blue/50'
                        : 'hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="text-3xl">{season.icon}</div>
                    <div className="flex-1 text-left">
                      <div className="font-cyber font-bold text-white flex items-center space-x-2">
                        <span>{season.name}</span>
                        {selectedSeason === key && (
                          <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse" />
                        )}
                      </div>
                      <div className="text-gray-400 text-sm flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{season.year}</span>
                      </div>
                      <div className="text-gray-500 text-xs mt-1">{season.description}</div>
                    </div>
                  </motion.button>
                ))}
              </div>
              
              <div className="border-t border-white/10 p-4 bg-white/5">
                <div className="text-center text-gray-400 text-sm">
                  <div className="font-semibold mb-1">Season Status</div>
                  <div className="flex justify-center space-x-4 text-xs">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-neon-green rounded-full"></div>
                      <span>Active</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-ftc-orange rounded-full"></div>
                      <span>Preview</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
