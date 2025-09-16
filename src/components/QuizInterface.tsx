'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Clock, CheckCircle, XCircle, RotateCcw, Zap, Trophy, User } from 'lucide-react'
import { supabase } from '@/utils/supabaseClient'

interface Question {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
  category: string
  difficulty: number | string // Can be numeric (1-10) or string ('easy', 'medium', 'hard')
}

interface QuizInterfaceProps {
  season: string
  mode: 'ranked' | 'practice'
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
    explanation: 'According to the DECODE game manual, robots score 10 points for each Sample placed in the High Basket during the Autonomous period.',
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

export default function QuizInterface({ season, mode, onBack, isGuest = false, onComplete }: QuizInterfaceProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(mode === 'ranked' ? 30 : 60) // Different time limits
  const [isTimerActive, setIsTimerActive] = useState(mode === 'ranked') // Only timer for ranked
  const [quizComplete, setQuizComplete] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<(number | null)[]>([])
  const [bestScore, setBestScore] = useState<number | null>(null)
  const [isNewBestScore, setIsNewBestScore] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [startTime] = useState(Date.now())
  const [loading, setLoading] = useState(true)
  const [submittingReview, setSubmittingReview] = useState(false)
  const [eloChange, setEloChange] = useState<{old_elo: number, new_elo: number, total_elo_change: number} | null>(null)
  const [reviewExplanation, setReviewExplanation] = useState('')
  const [showReviewForm, setShowReviewForm] = useState(false)

  // Load user and questions on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load user data
        if (!isGuest) {
          const { data: { user } } = await supabase.auth.getUser()
          setUser(user)
          
          // For ranked mode, check if user already took today's quiz
          if (user && mode === 'ranked') {
            const today = new Date().toISOString().split('T')[0]
            
            // Check ranked attempts first
            const { data: rankedAttempt } = await supabase
              .from('ranked_quiz_attempts')
              .select('*')
              .eq('user_id', user.id)
              .eq('date_attempted', today)
              .single()

            if (rankedAttempt) {
              console.log('User already took today\'s ranked quiz:', rankedAttempt)
              // User already took today's quiz, redirect back
              setTimeout(() => {
                onBack()
              }, 1000)
              return
            }

            // Check fallback table
            const { data: oldAttempts } = await supabase
              .from('quiz_attempts')
              .select('*')
              .eq('user_id', user.id)
              .gte('created_at', today + 'T00:00:00')
              .lt('created_at', today + 'T23:59:59')

            if (oldAttempts && oldAttempts.length > 0) {
              console.log('User already took today\'s ranked quiz (old table):', oldAttempts[0])
              // User already took today's quiz, redirect back
              setTimeout(() => {
                onBack()
              }, 1000)
              return
            }
          }
          
          if (user) {
            // Load best score from localStorage for now
            const savedBestScore = localStorage.getItem(`bestScore_${user.id}_${season}_${mode}`)
            if (savedBestScore) {
              setBestScore(parseInt(savedBestScore))
            }
          }
        }

        // Load questions based on mode
        let questionsData, error
        
        if (mode === 'ranked') {
          // Use the stored function to get daily ranked questions
          const { data, error: dbError } = await supabase
            .rpc('get_daily_ranked_questions')
          
          questionsData = data
          error = dbError
        } else {
          // Get practice questions (not in today's ranked set)
          const { data, error: dbError } = await supabase
            .rpc('get_practice_questions')
          
          questionsData = data
          error = dbError
        }

        console.log(`${mode} questions data from database:`, questionsData)
        console.log('Database error:', error)

        if (error) {
          console.error('Error loading questions:', error)
          console.error('Error details:', JSON.stringify(error, null, 2))
          
          // For ranked mode, don't fallback - show error instead
          if (mode === 'ranked') {
            console.error('Ranked quiz database functions not available')
            console.error('Error code:', error.code)
            console.error('Error message:', error.message)
            console.error('Error details:', error.details)
            setQuestions([])
            setLoading(false)
            return
          }
          
          // Only fallback for practice mode
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('quiz_questions')
            .select('id, question, options, correct_answer, explanation, category, difficulty, season')
            .eq('season', season)
            // No limit for practice mode - get ALL questions

          if (fallbackError) {
            console.error('Fallback query also failed:', fallbackError)
            setQuestions([])
          } else {
            questionsData = fallbackData
          }
        }

        // Process the questions data (whether from RPC or fallback)
        if (questionsData && questionsData.length > 0) {
          // Convert database format to component format
          let formattedQuestions: Question[] = questionsData.map((q: any) => ({
            id: q.id.toString(),
            question: q.question || 'Question text missing',
            options: Array.isArray(q.options) ? q.options : ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
            correctAnswer: typeof q.correct_answer === 'number' ? q.correct_answer : 0,
            explanation: q.explanation || 'No explanation available',
            category: q.category || 'General',
            difficulty: q.difficulty || 'medium'
          }))
          
          // Shuffle questions for practice mode
          if (mode === 'practice') {
            // Fisher-Yates shuffle algorithm
            for (let i = formattedQuestions.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [formattedQuestions[i], formattedQuestions[j]] = [formattedQuestions[j], formattedQuestions[i]];
            }
          }
          
          console.log(`${mode === 'practice' ? 'Shuffled' : 'Ordered'} questions (${formattedQuestions.length} total):`, formattedQuestions)
          setQuestions(formattedQuestions)
        } else {
          // No questions available
          console.log('No questions available')
          setQuestions([])
        }
      } catch (error) {
        console.error('Error loading data:', error)
        setQuestions([])
      } finally {
        setLoading(false)
      }
    } // Close loadData function

    loadData()
  }, [mode, isGuest, season])

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
    if (!user || isGuest || questions.length === 0) {
      console.log('Skipping quiz save:', { user: !!user, isGuest, questionsLength: questions.length })
      return
    }
    
    try {
      const questionsAnswered = questions.map((question, index) => ({
        question_id: question.id,
        user_answer: answers[index],
        correct_answer: question.correctAnswer,
        is_correct: answers[index] === question.correctAnswer
      }))

      const timeInSeconds = Math.round((Date.now() - startTime) / 1000)
      const accuracyPercent = Math.round((score / questions.length) * 100)
      
      const attemptData = {
        user_id: user.id,
        season: season,
        score: score,
        total_questions: questions.length,
        questions_answered: questionsAnswered,
        time_taken: timeInSeconds,
        accuracy: accuracyPercent,
        date_attempted: new Date().toISOString().split('T')[0], // Add today's date
        is_guest: false
      }

      console.log('Saving quiz attempt with calculated data:', {
        score: score,
        total_questions: questions.length,
        time_taken: timeInSeconds,
        accuracy: accuracyPercent,
        date_attempted: attemptData.date_attempted
      })

      // For now, let's save to both tables to ensure compatibility
      if (mode === 'ranked') {
        // Try to save to ranked table first
        const { data: rankedData, error: rankedError } = await supabase
          .from('ranked_quiz_attempts')
          .insert(attemptData)
          .select()

        if (rankedError) {
          console.error('Ranked table failed, trying old table:', rankedError)
          // Fallback to old table
          const { data: oldData, error: oldError } = await supabase
            .from('quiz_attempts')
            .insert(attemptData)
            .select()

          if (oldError) {
            console.error('Error saving to fallback table:', oldError)
          } else {
            console.log('Saved to fallback quiz_attempts table:', oldData)
            window.dispatchEvent(new CustomEvent('quizCompleted'))
          }
        } else {
          console.log('Ranked quiz attempt saved successfully:', rankedData)
          
          // Update ELO rating for ranked quizzes
          if (rankedData && rankedData[0]?.id) {
            try {
              console.log('Updating ELO for user:', user.id, 'Quiz:', rankedData[0].id)
              
              const { data: eloData, error: eloError } = await supabase
                .rpc('update_user_elo', {
                  user_uuid: user.id,
                  quiz_attempt_id: rankedData[0].id,
                  questions_data: questionsAnswered
                })

              if (eloError) {
                console.error('Error updating ELO:', eloError)
              } else {
                console.log('ELO updated successfully:', eloData)
                // Store ELO change data for display
                if (eloData && eloData[0]) {
                  setEloChange(eloData[0])
                }
                // Dispatch custom event with ELO data for UI updates
                window.dispatchEvent(new CustomEvent('eloUpdated', { 
                  detail: eloData?.[0] 
                }))
              }
            } catch (error) {
              console.error('Exception updating ELO:', error)
            }
          }
          
          // Record daily completion - SIMPLE METHOD
          try {
            const username = user?.email || 'unknown'
            const { error: trackingError } = await supabase
              .rpc('record_daily_completion', { 
                user_name: username,
                user_score: score
              })
            
            if (trackingError) {
              console.error('Error recording daily completion:', trackingError)
            } else {
              console.log('Daily completion recorded for:', username, 'Score:', score)
            }
          } catch (error) {
            console.error('Exception recording daily completion:', error)
          }
          
          window.dispatchEvent(new CustomEvent('quizCompleted'))
        }
      } else {
        // Practice mode
        const { data: practiceData, error: practiceError } = await supabase
          .from('practice_quiz_attempts')
          .insert(attemptData)
          .select()

        if (practiceError) {
          console.error('Practice table failed, trying old table:', practiceError)
          // Fallback to old table for practice too
          const { data: oldData, error: oldError } = await supabase
            .from('quiz_attempts')
            .insert(attemptData)
            .select()

          if (oldError) {
            console.error('Error saving practice to fallback table:', oldError)
          } else {
            console.log('Saved practice to fallback table:', oldData)
          }
        } else {
          console.log('Practice quiz attempt saved successfully:', practiceData)
        }
      }
    } catch (error) {
      console.error('Exception saving quiz attempt:', error)
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
          localStorage.setItem(`bestScore_${user.id}_${season}_${mode}`, score.toString())
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
    setEloChange(null)
  }

  const submitQuestionForReview = async () => {
    if (!user || !currentQuestion) return
    
    setSubmittingReview(true)
    try {
      const { error } = await supabase
        .from('question_reviews')
        .insert({
          original_question_id: currentQuestion.id, // Already a string/UUID
          question_text: currentQuestion.question,
          options: currentQuestion.options,
          correct_answer: currentQuestion.correctAnswer,
          explanation: currentQuestion.explanation,
          category: currentQuestion.category,
          difficulty: currentQuestion.difficulty,
          season: season,
          submitted_by: user.id,
          review_notes: reviewExplanation.trim() || null // Add the optional explanation
        })

      if (error) {
        console.error('Error submitting question for review:', error)
        alert('Failed to submit question for review. Please try again.')
      } else {
        alert('Question submitted for review successfully!')
        setReviewExplanation('') // Clear the explanation
        setShowReviewForm(false) // Hide the form
      }
    } catch (error) {
      console.error('Error submitting question for review:', error)
      alert('Failed to submit question for review. Please try again.')
    } finally {
      setSubmittingReview(false)
    }
  }

  const getDifficultyText = (difficulty: number | string): string => {
    if (typeof difficulty === 'string') return difficulty
    
    // Convert numeric difficulty (1-10) to text
    if (difficulty <= 3) return 'easy'
    if (difficulty <= 6) return 'medium'
    return 'hard'
  }

  const getDifficultyColor = (difficulty: number | string) => {
    const difficultyText = getDifficultyText(difficulty)
    switch (difficultyText) {
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
          <h2 className="text-2xl font-bold text-white mb-4">
            {mode === 'ranked' ? 'Daily Quiz Setup Required' : 'No Questions Available'}
          </h2>
          <p className="text-gray-400 mb-6">
            {mode === 'ranked' 
              ? 'The daily ranked quiz system needs to be set up first. Please run the database setup script in your Supabase dashboard.'
              : `No quiz questions found for the ${season} season. Please check back later.`
            }
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
            
            {isNewBestScore && (
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
            
            <div className="text-6xl font-bold mb-4">
              <span className="bg-gradient-to-r from-neon-green to-ftc-orange bg-clip-text text-transparent">
                {score}/{questions.length}
              </span>
            </div>
            
            {bestScore !== null && (
              <div className="mb-4 text-gray-400">
                <p className="text-sm">
                  Your Best: {bestScore}/{questions.length} ({Math.round((bestScore / questions.length) * 100)}%)
                </p>
              </div>
            )}
            
            <div className="text-2xl text-gray-300 mb-4">
              {Math.round((score / questions.length) * 100)}% Correct
            </div>
            
            {/* ELO Change Display for Ranked Mode */}
            {mode === 'ranked' && eloChange && (
              <motion.div
                initial={{ scale: 0, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ delay: 0.4, type: "spring" }}
                className="mb-6 p-4 bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-500 rounded-lg"
              >
                <div className="text-purple-400 font-semibold mb-2">ELO Rating Update</div>
                <div className="flex items-center justify-center space-x-4 text-lg">
                  <span className="text-gray-300">{eloChange.old_elo}</span>
                  <span className="text-gray-500">→</span>
                  <span className="text-white font-bold">{eloChange.new_elo}</span>
                  <span className={`font-bold ${eloChange.total_elo_change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ({eloChange.total_elo_change >= 0 ? '+' : ''}{eloChange.total_elo_change})
                  </span>
                </div>
              </motion.div>
            )}
            
            <div className="mb-8"></div>
            
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
              {mode === 'ranked' && (
                <>
                  <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                  <span>•</span>
                </>
              )}
              {mode === 'practice' && (
                <>
                  <span>Practice Mode</span>
                  <span>•</span>
                </>
              )}
              <span className={getDifficultyColor(currentQuestion?.difficulty || 3)}>
                {getDifficultyText(currentQuestion?.difficulty || 3).toUpperCase()}
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

        {/* Progress Bar - Only show for ranked mode */}
        {mode === 'ranked' && (
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
        )}

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
            className="glass-panel p-8 mb-8 relative overflow-hidden min-h-[500px]"
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

            {/* Overlay for Explanation and Next Button */}
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
                      
                      {/* Send for Review Section */}
                      {user && (
                        <div className="mt-4 pt-4 border-t border-blue-500/30">
                          {!showReviewForm ? (
                            <div>
                              <button
                                onClick={() => setShowReviewForm(true)}
                                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-white text-sm font-medium transition-colors flex items-center space-x-2"
                              >
                                <span>Send Question for Review</span>
                              </button>
                              <p className="text-xs text-gray-400 mt-2">
                                Report issues with this question for admin review
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                  Explain the issue (optional):
                                </label>
                                <textarea
                                  value={reviewExplanation}
                                  onChange={(e) => setReviewExplanation(e.target.value)}
                                  placeholder="Describe what's wrong with this question (e.g., incorrect answer, unclear wording, outdated information)..."
                                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                                  rows={3}
                                />
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  onClick={submitQuestionForReview}
                                  disabled={submittingReview}
                                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 rounded-lg text-white text-sm font-medium transition-colors"
                                >
                                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                                </button>
                                <button
                                  onClick={() => {
                                    setShowReviewForm(false)
                                    setReviewExplanation('')
                                  }}
                                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white text-sm font-medium transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                              <p className="text-xs text-gray-400">
                                Your feedback helps improve question quality for everyone
                              </p>
                            </div>
                          )}
                        </div>
                      )}
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
                        className="px-10 py-4 bg-ftc-orange hover:bg-ftc-orange/80 rounded-lg text-white font-semibold transition-colors flex items-center space-x-3 mx-auto text-lg shadow-lg"
                      >
                        <span>{currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}</span>
                        <Zap className="w-5 h-5" />
                      </button>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
