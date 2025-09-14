'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Clock, CheckCircle, XCircle, RotateCcw, Zap, Trophy, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import AnimatedBackground from '@/components/AnimatedBackground'

interface Question {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
  category: string
  difficulty: string
}

// Fixed set of 5 guest questions
const guestQuestions: Question[] = [
  {
    id: 'guest-1',
    question: 'What does FTC stand for?',
    options: ['FIRST Tech Challenge', 'FIRST Technical Competition', 'FIRST Technology Challenge', 'FIRST Team Challenge'],
    correctAnswer: 0,
    explanation: 'FTC stands for FIRST Tech Challenge, a robotics competition for students in grades 7-12.',
    category: 'General',
    difficulty: 'easy'
  },
  {
    id: 'guest-2',
    question: 'What is the maximum weight limit for an FTC robot in the 2025-2026 season?',
    options: ['42 lbs', '120 lbs', '150 lbs', '125 lbs'],
    correctAnswer: 0,
    explanation: 'The maximum weight limit for an FTC robot is 42 pounds (19.05 kg) including all parts that remain on the robot during a match.',
    category: 'Robot Rules',
    difficulty: 'medium'
  },
  {
    id: 'guest-3',
    question: 'What is the size of the DECODE playing field?',
    options: ['12ft x 12ft', '8ft x 8ft', '144in x 144in', '120in x 120in'],
    correctAnswer: 2,
    explanation: 'The DECODE field is approximately 144 inches by 144 inches (365.75 cm by 365.75 cm).',
    category: 'Field Setup',
    difficulty: 'medium'
  },
  {
    id: 'guest-4',
    question: 'How long is each match in FTC?',
    options: ['2 minutes', '2 minutes 30 seconds', '3 minutes', '2 minutes 15 seconds'],
    correctAnswer: 1,
    explanation: 'Each FTC match consists of a 30-second Autonomous period followed by a 2-minute Driver-Controlled period, totaling 2 minutes and 30 seconds.',
    category: 'Match Structure',
    difficulty: 'easy'
  },
  {
    id: 'guest-5',
    question: 'What is the maximum number of motors allowed on an FTC robot?',
    options: ['6 motors', '8 motors', '10 motors', '12 motors'],
    correctAnswer: 1,
    explanation: 'FTC robots are allowed a maximum of 8 motors total, which can be any combination of different motor types.',
    category: 'Robot Rules',
    difficulty: 'medium'
  }
]

export default function GuestQuizPage() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(30)
  const [isTimerActive, setIsTimerActive] = useState(true)
  const [quizComplete, setQuizComplete] = useState(false)
  const [answers, setAnswers] = useState<(number | null)[]>(new Array(5).fill(null))
  
  const router = useRouter()
  const currentQuestion = guestQuestions[currentQuestionIndex]

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (isTimerActive && timeLeft > 0 && !showExplanation) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft - 1)
      }, 1000)
    } else if (timeLeft === 0 && !showExplanation) {
      handleAnswer(null) // Auto-submit when time is up
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [timeLeft, isTimerActive, showExplanation])

  const handleAnswer = (answerIndex: number | null) => {
    setSelectedAnswer(answerIndex)
    setShowExplanation(true)
    setIsTimerActive(false)
    
    // Update answers array
    const newAnswers = [...answers]
    newAnswers[currentQuestionIndex] = answerIndex
    setAnswers(newAnswers)
    
    // Update score
    if (answerIndex === currentQuestion.correctAnswer) {
      setScore(score + 1)
    }
  }

  const nextQuestion = () => {
    if (currentQuestionIndex < guestQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setSelectedAnswer(null)
      setShowExplanation(false)
      setTimeLeft(30)
      setIsTimerActive(true)
    } else {
      setQuizComplete(true)
    }
  }

  const resetQuiz = () => {
    setCurrentQuestionIndex(0)
    setSelectedAnswer(null)
    setShowExplanation(false)
    setScore(0)
    setTimeLeft(30)
    setIsTimerActive(true)
    setQuizComplete(false)
    setAnswers(new Array(5).fill(null))
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400'
      case 'medium': return 'text-yellow-400'
      case 'hard': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  if (quizComplete) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <AnimatedBackground />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="min-h-screen flex items-center justify-center p-6 relative z-10"
        >
          <div className="bg-black/40 backdrop-blur-xl border border-gray-700/50 rounded-3xl max-w-2xl w-full text-center p-8">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="text-6xl mb-6">🏆</div>
              <h2 className="text-4xl font-bold mb-4 text-white">
                Sample Quiz Complete!
              </h2>
              
              <div className="mb-4 p-4 bg-yellow-900/30 border border-yellow-600 rounded-lg">
                <p className="text-yellow-400 text-sm">
                  🎯 Guest Mode: You completed 5 sample questions from our collection of 550+
                </p>
              </div>
              
              <div className="text-6xl font-bold mb-4">
                <span className="bg-gradient-to-r from-green-400 to-orange-400 bg-clip-text text-transparent">
                  {score}/5
                </span>
              </div>
              
              <div className="text-2xl text-gray-300 mb-8">
                {Math.round((score / 5) * 100)}% Correct
              </div>
              
              {/* Guest Conversion Prompt */}
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mb-8 p-6 bg-gradient-to-br from-red-900/40 to-orange-900/40 border border-red-500/50 rounded-xl backdrop-blur-sm"
              >
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-red-300 mb-4 flex items-center justify-center">
                    <Zap className="w-7 h-7 mr-2" />
                    Ready for More Challenges?
                  </h3>
                  <p className="text-gray-200 mb-6">
                    You just completed <span className="font-bold text-red-300">5 sample questions</span> from our massive collection! 
                    Sign up now to access:
                  </p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center">
                      <div className="text-3xl font-black text-red-400">550+</div>
                      <div className="text-sm text-gray-400">Questions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-black text-orange-400">Daily</div>
                      <div className="text-sm text-gray-400">Challenges</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-black text-yellow-400">Live</div>
                      <div className="text-sm text-gray-400">Leaderboards</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-black text-green-400">Team</div>
                      <div className="text-sm text-gray-400">Competition</div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => router.push('/login')}
                    className="w-full max-w-md mx-auto px-8 py-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 rounded-xl text-white font-bold text-lg transition-all transform hover:scale-105 flex items-center justify-center space-x-3"
                  >
                    <Trophy className="w-6 h-6" />
                    <span>Join the Competition</span>
                    <Trophy className="w-6 h-6" />
                  </button>
                  
                  <p className="text-sm text-gray-400 mt-4">
                    Free to join • Compete with 50+ teams • Track your progress
                  </p>
                </div>
              </motion.div>
              
              <div className="flex flex-wrap gap-4 justify-center">
                <button
                  onClick={resetQuiz}
                  className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-semibold transition-colors"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>Try Again</span>
                </button>
                
                <button
                  onClick={() => router.push('/login')}
                  className="flex items-center space-x-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-semibold transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Back to Login</span>
                </button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedBackground />
      
      <div className="min-h-screen p-6 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => router.push('/login')}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Login</span>
            </button>
            
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white mb-2">Guest Quiz Preview</h1>
              <div className="flex items-center space-x-4 text-sm text-gray-400">
                <span>Question {currentQuestionIndex + 1} of 5</span>
                <span>•</span>
                <span className={getDifficultyColor(currentQuestion?.difficulty || 'medium')}>
                  {currentQuestion?.difficulty?.toUpperCase()}
                </span>
                <span>•</span>
                <span>{currentQuestion?.category}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                timeLeft <= 10 ? 'bg-red-900/50 text-red-400' : 'bg-gray-800 text-gray-300'
              }`}>
                <Clock className="w-4 h-4" />
                <span className="font-mono">{timeLeft}s</span>
              </div>
              
              <div className="text-gray-300 text-sm">
                Score: {score}/{currentQuestionIndex + (showExplanation ? 1 : 0)}
              </div>
            </div>
          </div>

          {/* Guest Mode Notice */}
          <div className="mb-6 p-4 bg-yellow-900/30 border border-yellow-600 rounded-lg">
            <p className="text-yellow-400 text-sm text-center">
              🎯 Guest Preview: Trying 5 sample questions • Sign up for 550+ questions and leaderboards
            </p>
          </div>

          {/* Question Card */}
          <div className="relative">
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="bg-black/40 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 mb-8"
            >
              <h2 className="text-2xl font-semibold text-white mb-8 leading-relaxed">
                {currentQuestion?.question}
              </h2>
              
              <div className="grid gap-4">
                {currentQuestion?.options.map((option, index) => (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => !showExplanation && handleAnswer(index)}
                    disabled={showExplanation}
                    className={`p-4 rounded-xl text-left transition-all border-2 ${
                      showExplanation
                        ? index === currentQuestion.correctAnswer
                          ? 'bg-green-900/50 border-green-500 text-green-300'
                          : index === selectedAnswer && index !== currentQuestion.correctAnswer
                          ? 'bg-red-900/50 border-red-500 text-red-300'
                          : 'bg-gray-800/50 border-gray-600 text-gray-300'
                        : selectedAnswer === index
                        ? 'bg-blue-900/50 border-blue-500 text-blue-300'
                        : 'bg-gray-800/30 border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="flex-shrink-0 w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-sm font-semibold">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="font-medium">{option}</span>
                      {showExplanation && index === currentQuestion.correctAnswer && (
                        <CheckCircle className="w-5 h-5 text-green-400 ml-auto" />
                      )}
                      {showExplanation && index === selectedAnswer && index !== currentQuestion.correctAnswer && (
                        <XCircle className="w-5 h-5 text-red-400 ml-auto" />
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>

            {/* Explanation Overlay */}
            <AnimatePresence>
              {showExplanation && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8"
                >
                  <div className="max-w-2xl w-full">
                    {/* Explanation Box */}
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      className="p-6 bg-blue-900/90 border border-blue-500/50 rounded-lg mb-6 backdrop-blur-sm"
                    >
                      <h3 className="font-semibold text-blue-300 mb-3 text-lg">
                        {selectedAnswer === currentQuestion.correctAnswer ? '✅ Correct!' : '❌ Incorrect'}
                      </h3>
                      <p className="text-gray-200 leading-relaxed">
                        {currentQuestion?.explanation}
                      </p>
                      <div className="mt-4 text-sm text-gray-400">
                        <span className="text-green-400 font-semibold">
                          Correct Answer: {String.fromCharCode(65 + currentQuestion.correctAnswer)} - {currentQuestion?.options[currentQuestion.correctAnswer]}
                        </span>
                      </div>
                    </motion.div>

                    {/* Guest Sign-In Prompt */}
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.15 }}
                      className="p-6 bg-gradient-to-r from-red-900/50 to-orange-900/50 border border-red-500/50 rounded-lg mb-6 backdrop-blur-sm"
                    >
                      <div className="text-center">
                        <h3 className="font-bold text-red-300 mb-3 text-lg flex items-center justify-center">
                          <Trophy className="w-6 h-6 mr-2" />
                          Unlock Full Access!
                        </h3>
                        <p className="text-gray-200 mb-4">
                          You're experiencing just 5 questions from our collection of <span className="font-bold text-red-300">550+ challenging FTC questions</span>!
                        </p>
                        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-red-400">550+</div>
                            <div className="text-gray-400">Questions</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-orange-400">Daily</div>
                            <div className="text-gray-400">Challenges</div>
                          </div>
                        </div>
                        <button
                          onClick={() => router.push('/login')}
                          className="w-full px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 rounded-lg text-white font-bold transition-all transform hover:scale-105 flex items-center justify-center space-x-2"
                        >
                          <User className="w-5 h-5" />
                          <span>Sign Up for Full Access</span>
                        </button>
                        <p className="text-xs text-gray-400 mt-2">
                          Join leaderboards • Track progress • Compete with teams
                        </p>
                      </div>
                    </motion.div>

                    {/* Next Button */}
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="text-center"
                    >
                      <button
                        onClick={nextQuestion}
                        className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-xl text-white font-bold text-lg transition-all transform hover:scale-105"
                      >
                        {currentQuestionIndex < guestQuestions.length - 1 ? 'Next Question' : 'Finish Quiz'}
                      </button>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
