'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Eye, Edit, Trash2, Check, X, Clock, AlertCircle } from 'lucide-react'
import { supabase } from '@/utils/supabaseClient'
import { QuestionReview } from '@/types/supabase'

export default function ReviewQuestionsPage() {
  const [reviews, setReviews] = useState<QuestionReview[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')
  const [selectedReview, setSelectedReview] = useState<QuestionReview | null>(null)
  const [editingReview, setEditingReview] = useState<QuestionReview | null>(null)
  const [editForm, setEditForm] = useState({
    question_text: '',
    options: ['', '', '', ''],
    correct_answer: 0,
    explanation: '',
    category: '',
    difficulty: ''
  })

  useEffect(() => {
    loadReviews()
  }, [filter])

  const loadReviews = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('question_reviews')
        .select('*')
        .order('submitted_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('review_status', filter)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error loading reviews:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        
        // If the table doesn't exist, show a helpful message
        if (error.code === 'PGRST116' || error.message.includes('relation "question_reviews" does not exist')) {
          alert('Question reviews table does not exist. Please run the database migration first.')
        } else {
          alert(`Failed to load reviews: ${error.message}`)
        }
        setReviews([])
      } else {
        console.log('Successfully loaded reviews:', data)
        setReviews(data || [])
      }
    } catch (error) {
      console.error('Error loading reviews:', error)
      alert('Failed to load reviews: Network or connection error')
      setReviews([])
    } finally {
      setLoading(false)
    }
  }

  const updateReviewStatus = async (reviewId: string, status: 'approved' | 'rejected', notes?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('question_reviews')
        .update({
          review_status: status,
          review_notes: notes,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', reviewId)

      if (error) {
        console.error('Error updating review status:', error)
        alert('Failed to update review status')
      } else {
        await loadReviews()
        setSelectedReview(null)
      }
    } catch (error) {
      console.error('Error updating review status:', error)
      alert('Failed to update review status')
    }
  }

  const deleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return

    try {
      const { error } = await supabase
        .from('question_reviews')
        .delete()
        .eq('id', reviewId)

      if (error) {
        console.error('Error deleting review:', error)
        alert('Failed to delete review')
      } else {
        await loadReviews()
        setSelectedReview(null)
      }
    } catch (error) {
      console.error('Error deleting review:', error)
      alert('Failed to delete review')
    }
  }

  const updateOriginalQuestion = async (review: QuestionReview) => {
    if (!review.original_question_id) {
      alert('Cannot update: No original question ID found')
      return
    }

    try {
      // Update the original question in the quiz_questions table
      const { error: updateError } = await supabase
        .from('quiz_questions')
        .update({
          question: editForm.question_text,
          options: editForm.options,
          correct_answer: editForm.correct_answer,
          explanation: editForm.explanation,
          category: editForm.category,
          difficulty: editForm.difficulty
        })
        .eq('id', review.original_question_id)

      if (updateError) {
        console.error('Error updating original question:', updateError)
        alert('Failed to update original question')
        return
      }

      // Mark the review as approved/updated
      await updateReviewStatus(review.id, 'approved', 'Question updated in database')
      setEditingReview(null)
      setEditForm({
        question_text: '',
        options: ['', '', '', ''],
        correct_answer: 0,
        explanation: '',
        category: '',
        difficulty: ''
      })
    } catch (error) {
      console.error('Error updating original question:', error)
      alert('Failed to update original question')
    }
  }

  const startEditing = (review: QuestionReview) => {
    setEditingReview(review)
    setEditForm({
      question_text: review.question_text,
      options: [...review.options],
      correct_answer: review.correct_answer,
      explanation: review.explanation || '',
      category: review.category || '',
      difficulty: review.difficulty || ''
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400 bg-yellow-400/20'
      case 'approved': return 'text-green-400 bg-green-400/20'
      case 'rejected': return 'text-red-400 bg-red-400/20'
      case 'updated': return 'text-blue-400 bg-blue-400/20'
      default: return 'text-gray-400 bg-gray-400/20'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-ftc-orange mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading Reviews...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => window.history.back()}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-3xl font-bold text-ftc-orange">Question Reviews</h1>
          </div>
          
          {/* Filter Buttons */}
          <div className="flex space-x-2">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === status
                    ? 'bg-ftc-orange text-white'
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {reviews.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-400 mb-2">No Reviews Found</h2>
            <p className="text-gray-500">No question reviews match the current filter.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {reviews.map((review) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-900 border border-gray-700 rounded-lg p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(review.review_status)}`}>
                        {review.review_status}
                      </span>
                      <span className="text-gray-400 text-sm">
                        Submitted {new Date(review.submitted_at).toLocaleDateString()}
                      </span>
                      {review.category && (
                        <span className="text-ftc-orange text-sm">{review.category}</span>
                      )}
                      {review.difficulty && (
                        <span className="text-gray-400 text-sm">({review.difficulty})</span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{review.question_text}</h3>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {review.options.map((option, index) => (
                        <div
                          key={index}
                          className={`p-2 rounded text-sm ${
                            index === review.correct_answer
                              ? 'bg-green-900/50 border border-green-500/50 text-green-300'
                              : 'bg-gray-800 text-gray-300'
                          }`}
                        >
                          {String.fromCharCode(65 + index)}. {option}
                        </div>
                      ))}
                    </div>
                    {review.explanation && (
                      <p className="text-gray-400 text-sm bg-gray-800 p-3 rounded">
                        <strong>Explanation:</strong> {review.explanation}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => setSelectedReview(review)}
                      className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => startEditing(review)}
                      className="p-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors"
                      title="Edit Question"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteReview(review.id)}
                      className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                      title="Delete Review"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {review.review_status === 'pending' && (
                      <>
                        <button
                          onClick={() => updateReviewStatus(review.id, 'approved')}
                          className="p-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                          title="Approve"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => updateReviewStatus(review.id, 'rejected')}
                          className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                          title="Reject"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingReview && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Edit Question</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Question</label>
                <textarea
                  value={editForm.question_text}
                  onChange={(e) => setEditForm({...editForm, question_text: e.target.value})}
                  className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Options</label>
                {editForm.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2 mb-2">
                    <input
                      type="radio"
                      name="correct_answer"
                      checked={editForm.correct_answer === index}
                      onChange={() => setEditForm({...editForm, correct_answer: index})}
                      className="text-ftc-orange"
                    />
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...editForm.options]
                        newOptions[index] = e.target.value
                        setEditForm({...editForm, options: newOptions})
                      }}
                      className="flex-1 p-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                      placeholder={`Option ${String.fromCharCode(65 + index)}`}
                    />
                  </div>
                ))}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Explanation</label>
                <textarea
                  value={editForm.explanation}
                  onChange={(e) => setEditForm({...editForm, explanation: e.target.value})}
                  className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Category</label>
                  <input
                    type="text"
                    value={editForm.category}
                    onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                    className="w-full p-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Difficulty</label>
                  <select
                    value={editForm.difficulty}
                    onChange={(e) => setEditForm({...editForm, difficulty: e.target.value})}
                    className="w-full p-2 bg-gray-800 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="">Select...</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => updateOriginalQuestion(editingReview)}
                className="px-4 py-2 bg-ftc-orange hover:bg-ftc-orange/80 rounded-lg text-white font-medium"
              >
                Update Question
              </button>
              <button
                onClick={() => setEditingReview(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
