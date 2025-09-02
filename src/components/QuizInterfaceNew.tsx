'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Clock, CheckCircle, XCircle, RotateCcw, Zap, Trophy } from 'lucide-react'
import { supabase } from '@/utils/supabaseClient'

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
  isGuest?: boolean
  onComplete?: () => void
}

// Mock questions for fallback
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

export default function QuizInterfaceNew({ season, onBack, isGuest = false, onComplete }: QuizInterfaceProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(30)
  const [isTimerActive, setIsTimerActive] = useState(true)
  const [quizComplete, setQuizComplete] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<(number | null)[]>([])
  const [bestScore, setBestScore] = useState<number | null>(null)
  const [isNewBestScore, setIsNewBestScore] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [startTime] = useState(Date.now())
  const [loading, setLoading] = useState(true)

  // Load user and questions on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load user data
        if (!isGuest) {
          const { data: { user } } = await supabase.auth.getUser()
          setUser(user)
          
          if (user) {
            // Load best score from localStorage for now
            const savedBestScore = localStorage.getItem(`bestScore_${user.id}_${season}`)
            if (savedBestScore) {
              setBestScore(parseInt(savedBestScore))
            }
          }
        }

        // Load questions from database
        const { data: questionsData, error } = await supabase
          .from('quiz_questions')
          .select('*')
          .eq('season', season)
          .limit(10)

        if (error) {
          console.error('Error loading questions:', error)
          setQuestions(mockQuestions)
        } else if (questionsData && questionsData.length > 0) {
          // Convert database format to component format
          const formattedQuestions: Question[] = questionsData.map((q: any) => ({
            id: q.id,
            question: q.question_text,
            options: q.options,
            correctAnswer: q.correct_answer,
            explanation: q.explanation,
            category: q.category,
            difficulty: q.difficulty
          }))
          setQuestions(formattedQuestions)
        } else {
          // Use mock questions if no questions in database
          setQuestions(mockQuestions)
        }
      } catch (error) {
        console.error('Error loading data:', error)
        setQuestions(mockQuestions)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [isGuest, season])

  // Update answers array when questions change
  useEffect(() => {
    if (questions.length > 0) {
      setAnswers(new Array(questions.length).fill(null))
    }
  }, [questions])

  const currentQuestion = questions[currentQuestionIndex]

  // Timer effect
  useEffect(() => {
    if (isTimerActive && timeLeft > 0 && !showExplanation && !loading) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && !showExplanation) {
      handleAnswer(null)
    }
  }, [timeLeft, isTimerActive, showExplanation, loading])

  const saveQuizAttempt = async () => {
    if (!user || isGuest || questions.length === 0) return
    
    try {
      const questionsAnswered = questions.map((question, index) => ({
        question_id: question.id,
        user_answer: answers[index],
        correct_answer: question.correctAnswer,
        is_correct: answers[index] === question.correctAnswer
      }))

      const { data, error } = await supabase.from('quiz_attempts').insert({
        user_id: user.id,
        season: season,
        score: score,
        total_questions: questions.length,
        questions_answered: questionsAnswered,
        time_taken: Math.round((Date.now() - startTime) / 1000),
        is_guest: false
      }).select()

      if (error) {
        console.error('Error saving quiz attempt:', error)
      } else {
        console.log('Quiz attempt saved successfully:', data)
        // Trigger leaderboard refresh by dispatching a custom event
        window.dispatchEvent(new CustomEvent('quizCompleted'))
      }
    } catch (error) {
      console.error('Error saving quiz attempt:', error)
    }
  }

  const handleAnswer = (answerIndex: number | null) => {
    setSelectedAnswer(answerIndex)
    setShowExplanation(true)
    setIsTimerActive(false)
    
    const newAnswers = [...answers]
    newAnswers[currentQuestionIndex] = answerIndex
    setAnswers(newAnswers)
    
    if (answerIndex === currentQuestion?.correctAnswer) {
      setScore(score + 1)
    }
  }

  const nextQuestion = async () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setSelectedAnswer(null)
      setShowExplanation(false)
      setTimeLeft(30)
      setIsTimerActive(true)
    } else {
      setQuizComplete(true)
      
      // Save quiz attempt to database
      await saveQuizAttempt()
      
      // Check and update best score for logged-in users
      if (!isGuest && user) {
        if (score > (bestScore || 0)) {
          setBestScore(score)
          setIsNewBestScore(true)
          localStorage.setItem(`bestScore_${user.id}_${season}`, score.toString())
        }
      }
      
      // Call onComplete for guest users
      if (isGuest && onComplete) {
        onComplete()
      }
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
    setAnswers(new Array(questions.length).fill(null))
    setIsNewBestScore(false)
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-neon-green'
      case 'medium': return 'text-ftc-orange'
      case 'hard': return 'text-ftc-red'
      default: return 'text-gray-400'
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-ftc-orange mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading Quiz Questions...</p>
        </div>
      </div>
    )
  }

  // Show error state if no questions
  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="glass-panel p-8 text-center max-w-md">
          <XCircle className="w-16 h-16 text-ftc-red mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">No Questions Available</h2>
          <p className="text-gray-400 mb-6">
            No quiz questions found for the {season} season. Please check back later.
          </p>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-ftc-orange hover:bg-ftc-orange/80 rounded-lg text-white font-semibold transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  // Quiz complete screen
  if (quizComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-screen flex items-center justify-center p-6"
      >
        <div className="glass-panel max-w-2xl w-full text-center p-8">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="text-6xl mb-6">🏆</div>
            <h2 className="text-4xl font-bold mb-4 text-white">
              Quiz Complete!
            </h2>
            
            {isNewBestScore && !isGuest && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", duration: 0.8 }}
                className="mb-6 p-4 bg-gradient-to-r from-yellow-900/50 to-orange-900/50 border border-yellow-500 rounded-lg"
              >
                <div className="flex items-center justify-center space-x-2 text-yellow-400">
                  <Trophy className="w-6 h-6" />
                  <span className="font-bold text-lg">NEW BEST SCORE!</span>
                  <Trophy className="w-6 h-6" />
                </div>
              </motion.div>
            )}
            
            {isGuest && (
              <div className="mb-4 p-4 bg-yellow-900/30 border border-yellow-600 rounded-lg">
                <p className="text-yellow-400 text-sm">
                  🎯 Guest Mode: Your score won't be saved to leaderboards
                </p>
              </div>
            )}
            
            <div className="text-6xl font-bold mb-4">
              <span className="bg-gradient-to-r from-neon-green to-ftc-orange bg-clip-text text-transparent">
                {score}/{questions.length}
              </span>
            </div>
            
            {!isGuest && bestScore !== null && (
              <div className="mb-4 text-gray-400">
                <p className="text-sm">
                  Your Best: {bestScore}/{questions.length} ({Math.round((bestScore / questions.length) * 100)}%)
                </p>
              </div>
            )}
            
            <div className="text-2xl text-gray-300 mb-8">
              {Math.round((score / questions.length) * 100)}% Correct
            </div>
            
            <div className="flex flex-wrap gap-4 justify-center">
              <button
                onClick={resetQuiz}
                className="flex items-center space-x-2 px-6 py-3 bg-ftc-blue hover:bg-ftc-blue/80 rounded-lg text-white font-semibold transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
                <span>Try Again</span>
              </button>
              
              <button
                onClick={onBack}
                className="flex items-center space-x-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-semibold transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Dashboard</span>
              </button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-2">{season} Quiz</h1>
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
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
              <span className="font-mono">{formatTime(timeLeft)}</span>
            </div>
            
            <div className="text-right">
              <div className="text-2xl font-bold text-neon-green">{score}</div>
              <div className="text-xs text-gray-400">Score</div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Progress</span>
            <span>{Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <motion.div
              className="bg-gradient-to-r from-ftc-orange to-ftc-red h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
            className="glass-panel p-8 mb-8"
          >
            <h2 className="text-xl font-semibold text-white mb-6 leading-relaxed">
              {currentQuestion?.question}
            </h2>
            
            <div className="space-y-4">
              {currentQuestion?.options.map((option, index) => {
                let buttonClass = "w-full p-4 text-left rounded-lg border transition-all duration-200 "
                
                if (showExplanation) {
                  if (index === currentQuestion.correctAnswer) {
                    buttonClass += "bg-green-900/50 border-green-500 text-green-300"
                  } else if (index === selectedAnswer && index !== currentQuestion.correctAnswer) {
                    buttonClass += "bg-red-900/50 border-red-500 text-red-300"
                  } else {
                    buttonClass += "bg-gray-800/50 border-gray-600 text-gray-400"
                  }
                } else {
                  if (index === selectedAnswer) {
                    buttonClass += "bg-ftc-orange/20 border-ftc-orange text-white"
                  } else {
                    buttonClass += "bg-gray-800/50 border-gray-600 text-gray-300 hover:bg-gray-700/50 hover:border-gray-500"
                  }
                }
                
                return (
                  <button
                    key={index}
                    onClick={() => !showExplanation && handleAnswer(index)}
                    disabled={showExplanation}
                    className={buttonClass}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-bold">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span>{option}</span>
                      {showExplanation && index === currentQuestion.correctAnswer && (
                        <CheckCircle className="w-5 h-5 text-green-400 ml-auto" />
                      )}
                      {showExplanation && index === selectedAnswer && index !== currentQuestion.correctAnswer && (
                        <XCircle className="w-5 h-5 text-red-400 ml-auto" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Explanation */}
            <AnimatePresence>
              {showExplanation && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg"
                >
                  <h3 className="font-semibold text-blue-300 mb-2">Explanation:</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {currentQuestion?.explanation}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Next Button */}
            {showExplanation && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 text-center"
              >
                <button
                  onClick={nextQuestion}
                  className="px-8 py-3 bg-ftc-orange hover:bg-ftc-orange/80 rounded-lg text-white font-semibold transition-colors flex items-center space-x-2 mx-auto"
                >
                  <span>{currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}</span>
                  <Zap className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
