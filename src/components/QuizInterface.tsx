'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Clock, CheckCircle, XCircle, RotateCcw, Zap } from 'lucide-react'

interface Question {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
  category: string
  difficulty: 'easy' | 'medium' | 'hard'
}

interface QuizInterfaceProps {
  season: string
  onBack: () => void
}

// Mock questions for demonstration
const mockQuestions: Question[] = [
  {
    id: '1',
    question: 'How many points does a robot score for placing a Sample in the High Basket during Autonomous?',
    options: ['6 points', '8 points', '10 points', '12 points'],
    correctAnswer: 2,
    explanation: 'According to the Into The Deep game manual, robots score 10 points for each Sample placed in the High Basket during the Autonomous period.',
    category: 'Scoring',
    difficulty: 'medium'
  },
  {
    id: '2',
    question: 'What is the maximum height a robot can extend during the match?',
    options: ['42 inches', '48 inches', '54 inches', '60 inches'],
    correctAnswer: 0,
    explanation: 'The maximum robot height extension is 42 inches as specified in the robot design constraints section.',
    category: 'Robot Design',
    difficulty: 'easy'
  },
  {
    id: '3',
    question: 'During which period can robots score Specimen points in the High Chamber?',
    options: ['Autonomous only', 'TeleOp only', 'Both Autonomous and TeleOp', 'Neither period'],
    correctAnswer: 2,
    explanation: 'Specimens can be scored in the High Chamber during both Autonomous and TeleOp periods, with different point values.',
    category: 'Game Rules',
    difficulty: 'hard'
  }
]

export default function QuizInterface({ season, onBack }: QuizInterfaceProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(30)
  const [isTimerActive, setIsTimerActive] = useState(true)
  const [quizComplete, setQuizComplete] = useState(false)
  const [answers, setAnswers] = useState<(number | null)[]>(new Array(mockQuestions.length).fill(null))

  const currentQuestion = mockQuestions[currentQuestionIndex]

  // Timer effect
  useEffect(() => {
    if (isTimerActive && timeLeft > 0 && !showExplanation) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && !showExplanation) {
      handleAnswer(null)
    }
  }, [timeLeft, isTimerActive, showExplanation])

  const handleAnswer = (answerIndex: number | null) => {
    setSelectedAnswer(answerIndex)
    setShowExplanation(true)
    setIsTimerActive(false)
    
    const newAnswers = [...answers]
    newAnswers[currentQuestionIndex] = answerIndex
    setAnswers(newAnswers)

    if (answerIndex === currentQuestion.correctAnswer) {
      setScore(score + 1)
    }
  }

  const nextQuestion = () => {
    if (currentQuestionIndex < mockQuestions.length - 1) {
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
    setAnswers(new Array(mockQuestions.length).fill(null))
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-neon-green'
      case 'medium': return 'text-ftc-orange'
      case 'hard': return 'text-ftc-red'
      default: return 'text-gray-400'
    }
  }

  if (quizComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-screen flex items-center justify-center p-6"
      >
        <div className="ftc-card max-w-2xl w-full text-center">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="text-6xl mb-6">🏆</div>
            <h2 className="text-4xl font-cyber font-bold mb-4 text-electric-blue">
              Quiz Complete!
            </h2>
            <div className="text-6xl font-cyber font-black mb-4">
              <span className="bg-gradient-to-r from-neon-green to-electric-blue bg-clip-text text-transparent">
                {score}/{mockQuestions.length}
              </span>
            </div>
            <p className="text-xl text-gray-300 mb-8">
              {score === mockQuestions.length
                ? "Perfect score! You're an FTC master!"
                : score >= mockQuestions.length * 0.8
                ? "Excellent work! Keep it up!"
                : score >= mockQuestions.length * 0.6
                ? "Good job! Room for improvement."
                : "Keep studying those game manuals!"}
            </p>
            <div className="flex gap-4 justify-center">
              <button onClick={resetQuiz} className="cyber-button">
                <RotateCcw className="w-4 h-4 mr-2" />
                Try Again
              </button>
              <button onClick={onBack} className="cyber-button">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Menu
              </button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen p-6"
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex justify-between items-center mb-8"
        >
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-electric-blue" />
              <span className={`font-cyber text-xl ${timeLeft <= 10 ? 'text-ftc-red animate-pulse' : 'text-white'}`}>
                {timeLeft}s
              </span>
            </div>
            <div className="text-gray-400">
              {currentQuestionIndex + 1} / {mockQuestions.length}
            </div>
            <div className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-neon-green" />
              <span className="font-cyber text-xl text-neon-green">{score}</span>
            </div>
          </div>
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          className="w-full bg-gray-800 rounded-full h-2 mb-8"
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${((currentQuestionIndex + 1) / mockQuestions.length) * 100}%` }}
            transition={{ duration: 0.5 }}
            className="h-2 bg-gradient-to-r from-electric-blue to-neon-green rounded-full"
          />
        </motion.div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionIndex}
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="ftc-card mb-8"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center space-x-3">
                <span className="px-3 py-1 bg-electric-blue/20 text-electric-blue rounded-full text-sm font-semibold">
                  {currentQuestion.category}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getDifficultyColor(currentQuestion.difficulty)} bg-current/20`}>
                  {currentQuestion.difficulty.toUpperCase()}
                </span>
              </div>
            </div>

            <h3 className="text-2xl font-semibold text-white mb-8 leading-relaxed">
              {currentQuestion.question}
            </h3>

            <div className="space-y-4">
              {currentQuestion.options.map((option, index) => {
                let buttonClass = "w-full p-6 text-left border-2 rounded-xl transition-all duration-300 font-medium"
                
                if (showExplanation) {
                  if (index === currentQuestion.correctAnswer) {
                    buttonClass += " border-neon-green bg-neon-green/20 text-neon-green"
                  } else if (index === selectedAnswer && index !== currentQuestion.correctAnswer) {
                    buttonClass += " border-ftc-red bg-ftc-red/20 text-ftc-red"
                  } else {
                    buttonClass += " border-gray-600 bg-gray-800/50 text-gray-400"
                  }
                } else {
                  if (selectedAnswer === index) {
                    buttonClass += " border-electric-blue bg-electric-blue/20 text-electric-blue"
                  } else {
                    buttonClass += " border-gray-600 bg-gray-800/50 text-white hover:border-electric-blue/50 hover:bg-electric-blue/10"
                  }
                }

                return (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => !showExplanation && handleAnswer(index)}
                    disabled={showExplanation}
                    className={buttonClass}
                  >
                    <div className="flex items-center justify-between">
                      <span>{option}</span>
                      {showExplanation && index === currentQuestion.correctAnswer && (
                        <CheckCircle className="w-6 h-6 text-neon-green" />
                      )}
                      {showExplanation && index === selectedAnswer && index !== currentQuestion.correctAnswer && (
                        <XCircle className="w-6 h-6 text-ftc-red" />
                      )}
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Explanation */}
        <AnimatePresence>
          {showExplanation && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="ftc-card border-l-4 border-electric-blue"
            >
              <h4 className="text-xl font-semibold text-electric-blue mb-3">Explanation</h4>
              <p className="text-gray-300 leading-relaxed mb-6">
                {currentQuestion.explanation}
              </p>
              <button
                onClick={nextQuestion}
                className="cyber-button"
              >
                {currentQuestionIndex < mockQuestions.length - 1 ? 'Next Question' : 'Finish Quiz'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
