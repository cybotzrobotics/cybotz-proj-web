'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabaseClient'

export default function QuizDebug() {
  const [user, setUser] = useState<any>(null)
  const [quizAttempts, setQuizAttempts] = useState<any[]>([])
  const [leaderboardViews, setLeaderboardViews] = useState<any[]>([])
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      console.log('Current user:', user)
      
      if (error) {
        setError(`Auth error: ${error.message}`)
        return
      }
      
      setUser(user)
      
      if (user) {
        await checkQuizAttempts(user.id)
        await checkLeaderboardViews()
      }
    } catch (err: any) {
      setError(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const checkQuizAttempts = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      console.log('Quiz attempts:', data)
      console.log('Quiz attempts error:', error)

      if (error) {
        setError(`Quiz attempts error: ${error.message}`)
      } else {
        setQuizAttempts(data || [])
      }
    } catch (err: any) {
      setError(`Quiz attempts fetch error: ${err.message}`)
    }
  }

  const checkLeaderboardViews = async () => {
    try {
      const { data, error } = await supabase
        .from('individual_leaderboard')
        .select('*')
        .limit(5)

      console.log('Individual leaderboard view:', data)
      console.log('Individual leaderboard error:', error)

      if (error) {
        setError(`Leaderboard view error: ${error.message}`)
      } else {
        setLeaderboardViews(data || [])
      }
    } catch (err: any) {
      setError(`Leaderboard fetch error: ${err.message}`)
    }
  }

  const addDateTrackingToAttempts = async () => {
    if (!user) {
      setError('No user logged in')
      return
    }

    try {
      // Add date_attempted column to existing quiz_attempts
      const { data, error } = await supabase.rpc('exec', {
        sql: `
          ALTER TABLE quiz_attempts 
          ADD COLUMN IF NOT EXISTS date_attempted DATE DEFAULT CURRENT_DATE;
          
          ALTER TABLE quiz_attempts
          ADD COLUMN IF NOT EXISTS accuracy DECIMAL(5,2);
          
          UPDATE quiz_attempts 
          SET date_attempted = CURRENT_DATE 
          WHERE date_attempted IS NULL;
        `
      })

      if (error) {
        setError(`Database update error: ${error.message}`)
      } else {
        setError(`✅ Successfully added date tracking to quiz_attempts table!`)
      }
    } catch (err: any) {
      setError(`Database update exception: ${err.message}`)
    }
  }

  const debugAttemptData = async () => {
    if (!user) {
      setError('No user logged in')
      return
    }

    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Get all attempts for today with full data
      const { data: attempts, error } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('user_id', user.id)
        .eq('date_attempted', today)

      if (error) {
        setError(`Debug error: ${error.message}`)
      } else {
        console.log('Raw attempt data:', attempts)
        setError(`📊 Today's attempts: ${JSON.stringify(attempts, null, 2)}`)
      }
    } catch (err: any) {
      setError(`Debug exception: ${err.message}`)
    }
  }

  const checkTodaysRankedAttempt = async () => {
    if (!user) {
      setError('No user logged in')
      return
    }

    try {
      const today = new Date().toISOString().split('T')[0]
      console.log('Checking for attempts on date:', today)
      
      // Check if ranked_quiz_attempts table exists, fallback to quiz_attempts
      const { data: rankedAttempts, error: rankedError } = await supabase
        .from('ranked_quiz_attempts')
        .select('*')
        .eq('user_id', user.id)
        .eq('date_attempted', today)

      console.log('Ranked attempts:', rankedAttempts)
      console.log('Ranked error:', rankedError)

      // Fallback to check old table
      const { data: oldAttempts, error: oldError } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', today + 'T00:00:00')
        .lt('created_at', today + 'T23:59:59')

      console.log('Old attempts today:', oldAttempts)
      console.log('Old error:', oldError)

      if (rankedError && oldError) {
        setError(`Both tables failed - Ranked: ${rankedError.message}, Old: ${oldError.message}`)
      } else {
        const totalAttempts = (rankedAttempts?.length || 0) + (oldAttempts?.length || 0)
        setError(`✅ Found ${totalAttempts} attempts today. Ranked: ${rankedAttempts?.length || 0}, Old: ${oldAttempts?.length || 0}`)
      }
    } catch (err: any) {
      setError(`Check attempt exception: ${err.message}`)
    }
  }

  const checkTodaysSpecificAttempt = async () => {
    if (!user) {
      setError('No user logged in')
      return
    }

    try {
      const today = new Date().toISOString().split('T')[0]
      console.log('=== DETAILED TODAY\'S ATTEMPT CHECK ===')
      console.log('Date:', today)
      console.log('User ID:', user.id)
      
      // Check ranked_quiz_attempts table
      const { data: rankedAttempt, error: rankedError } = await supabase
        .from('ranked_quiz_attempts')
        .select('*')
        .eq('user_id', user.id)
        .eq('date_attempted', today)
        .single()

      console.log('=== RANKED TABLE RESULT ===')
      console.log('Data:', rankedAttempt)
      console.log('Error:', rankedError)

      // Check quiz_attempts table as fallback
      const { data: oldAttempts, error: oldError } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', today + 'T00:00:00')
        .lt('created_at', today + 'T23:59:59')

      console.log('=== OLD TABLE RESULT ===')
      console.log('Data:', oldAttempts)
      console.log('Error:', oldError)

      const result = rankedAttempt || (oldAttempts && oldAttempts.length > 0 ? oldAttempts[0] : null)
      
      if (result) {
        setError(`✅ FOUND ATTEMPT: Score ${result.score}/${result.total_questions}, Time: ${result.time_taken}s, Date: ${result.date_attempted || result.created_at}`)
      } else {
        setError(`❌ NO ATTEMPT FOUND for today (${today})`)
      }
    } catch (err: any) {
      setError(`Detailed check exception: ${err.message}`)
    }
  }

  const checkQuestionCount = async () => {
    try {
      const { data, error, count } = await supabase
        .from('quiz_questions')
        .select('*', { count: 'exact', head: true })

      if (error) {
        setError(`Question count error: ${error.message}`)
      } else {
        setError(`📊 Total questions in database: ${count}`)
      }
    } catch (err: any) {
      setError(`Question count exception: ${err.message}`)
    }
  }

  const insertNewQuestions = async () => {
    // Temporarily allow question insertion without auth for migration
    if (!user) {
      console.log('⚠️ Inserting questions without auth (migration mode)')
    }

    try {
      // Paste your new 100+ questions here
      const newQuestions: any[] = [
        {
    "section": "Section 9.2",
    "rule_name": "FIELD Dimensions",
    "question": "What are the exact dimensions of the DECODE playing field?",
    "options": [
      "120 in. by 120 in.",
      "144 in. by 144 in.",
      "156 in. by 156 in.",
      "132 in. by 132 in."
    ],
    "correct_answer": 1,
    "explanation": "The DECODE field is approximately 144 in. by 144 in. (365.75 cm by 365.75 cm) as specified in Section 9.2.",
    "difficulty": 2,
    "category": "Field Setup",
    "season": "2025-2026",
    "tags": ["field", "dimensions", "setup"],
    "source_page": "Section 9.2",
    "confidence": 10
  },
  {
    "section": "Section 9.9",
    "rule_name": "SCORING ELEMENTS",
    "question": "How many total ARTIFACTS are used in a DECODE match?",
    "options": [
      "30 (20 purple, 10 green)",
      "36 (24 purple, 12 green)",
      "40 (25 purple, 15 green)",
      "32 (22 purple, 10 green)"
    ],
    "correct_answer": 1,
    "explanation": "There are 36 total ARTIFACTS: 24 purple and 12 green as stated in Section 9.9.",
    "difficulty": 2,
    "category": "Scoring",
    "season": "2025-2026",
    "tags": ["artifacts", "scoring elements", "game pieces"],
    "source_page": "Section 9.9",
    "confidence": 10
  },
  {
    "section": "Section 10.1",
    "rule_name": "MATCH Timing",
    "question": "What is the total duration of the AUTO period in DECODE?",
    "options": [
      "20 seconds",
      "25 seconds",
      "30 seconds",
      "35 seconds"
    ],
    "correct_answer": 2,
    "explanation": "The AUTO period lasts 30 seconds as specified in Section 10.1.",
    "difficulty": 1,
    "category": "Game Rules",
    "season": "2025-2026",
    "tags": ["timing", "auto", "match"],
    "source_page": "Section 10.1",
    "confidence": 10
  },
  {
    "section": "Section 10.1",
    "rule_name": "Transition Period",
    "question": "How long is the transition period between AUTO and TELEOP?",
    "options": [
      "5 seconds",
      "8 seconds",
      "10 seconds",
      "12 seconds"
    ],
    "correct_answer": 1,
    "explanation": "There is an 8-second transition period between AUTO and TELEOP as stated in Section 10.1.",
    "difficulty": 2,
    "category": "Game Rules",
    "season": "2025-2026",
    "tags": ["timing", "transition", "match"],
    "source_page": "Section 10.1",
    "confidence": 10
  },
  {
    "section": "Section 10.2",
    "rule_name": "DRIVE TEAM Composition",
    "question": "What is the maximum number of people allowed on a DRIVE TEAM?",
    "options": [
      "3 people",
      "4 people",
      "5 people",
      "6 people"
    ],
    "correct_answer": 1,
    "explanation": "A DRIVE TEAM consists of up to 4 people as specified in Section 10.2.",
    "difficulty": 2,
    "category": "Game Rules",
    "season": "2025-2026",
    "tags": ["drive team", "team composition"],
    "source_page": "Section 10.2",
    "confidence": 10
  },
  {
    "section": "Section 10.2",
    "rule_name": "Non-STUDENT Limit",
    "question": "How many non-STUDENTS are allowed on a DRIVE TEAM?",
    "options": [
      "None",
      "No more than 1",
      "No more than 2",
      "Unlimited"
    ],
    "correct_answer": 1,
    "explanation": "No more than 1 member of the DRIVE TEAM is allowed to be a non-STUDENT according to Section 10.2.",
    "difficulty": 3,
    "category": "Game Rules",
    "season": "2025-2026",
    "tags": ["drive team", "student", "adult"],
    "source_page": "Section 10.2",
    "confidence": 10
  },
  {
    "section": "Section 10.5.4",
    "rule_name": "CLASSIFIED Points",
    "question": "How many points is a CLASSIFIED ARTIFACT worth during AUTO?",
    "options": [
      "1 point",
      "2 points",
      "3 points",
      "5 points"
    ],
    "correct_answer": 2,
    "explanation": "CLASSIFIED ARTIFACTS are worth 3 points during both AUTO and TELEOP as shown in Table 10-2.",
    "difficulty": 2,
    "category": "Scoring",
    "season": "2025-2026",
    "tags": ["scoring", "classified", "points"],
    "source_page": "Section 10.5.4",
    "confidence": 10
  },
  {
    "section": "Section 10.5.4",
    "rule_name": "OVERFLOW Points",
    "question": "How many points is an OVERFLOW ARTIFACT worth?",
    "options": [
      "1 point",
      "2 points",
      "3 points",
      "5 points"
    ],
    "correct_answer": 0,
    "explanation": "OVERFLOW ARTIFACTS are worth 1 point during both AUTO and TELEOP according to Table 10-2.",
    "difficulty": 2,
    "category": "Scoring",
    "season": "2025-2026",
    "tags": ["scoring", "overflow", "points"],
    "source_page": "Section 10.5.4",
    "confidence": 10
  },
  {
    "section": "Section 10.5.4",
    "rule_name": "LEAVE Points",
    "question": "How many points does a ROBOT earn for LEAVING the LAUNCH LINE during AUTO?",
    "options": [
      "2 points",
      "3 points",
      "5 points",
      "10 points"
    ],
    "correct_answer": 1,
    "explanation": "LEAVING the LAUNCH LINE during AUTO awards 3 points as specified in Table 10-2.",
    "difficulty": 2,
    "category": "Scoring",
    "season": "2025-2026",
    "tags": ["scoring", "leave", "auto"],
    "source_page": "Section 10.5.4",
    "confidence": 10
  },
  {
    "section": "Section 10.5.4",
    "rule_name": "Fully Returned BASE Points",
    "question": "How many points does a ROBOT earn for being fully returned to BASE at the end of TELEOP?",
    "options": [
      "5 points",
      "8 points",
      "10 points",
      "15 points"
    ],
    "correct_answer": 2,
    "explanation": "A ROBOT fully returned to BASE earns 10 points according to Table 10-2.",
    "difficulty": 2,
    "category": "Scoring",
    "season": "2025-2026",
    "tags": ["scoring", "base", "endgame"],
    "source_page": "Section 10.5.4",
    "confidence": 10
  },
  {
    "section": "Section 10.5.4",
    "rule_name": "Double BASE Bonus",
    "question": "What is the additional bonus when both ROBOTS on an ALLIANCE are fully returned to BASE?",
    "options": [
      "5 points",
      "10 points",
      "15 points",
      "20 points"
    ],
    "correct_answer": 1,
    "explanation": "When 2 ROBOTS are fully returned to BASE, there's an additional 10 point bonus as shown in Table 10-2.",
    "difficulty": 3,
    "category": "Scoring",
    "season": "2025-2026",
    "tags": ["scoring", "base", "bonus"],
    "source_page": "Section 10.5.4",
    "confidence": 10
  },
  {
    "section": "Section 10.6",
    "rule_name": "MINOR FOUL Value",
    "question": "How many points does a MINOR FOUL award to the opposing ALLIANCE?",
    "options": [
      "3 points",
      "5 points",
      "10 points",
      "15 points"
    ],
    "correct_answer": 1,
    "explanation": "A MINOR FOUL credits 5 points to the opponent's MATCH point total as defined in Table 10-4.",
    "difficulty": 2,
    "category": "Penalties",
    "season": "2025-2026",
    "tags": ["penalties", "fouls", "minor"],
    "source_page": "Section 10.6",
    "confidence": 10
  },
  {
    "section": "Section 10.6",
    "rule_name": "MAJOR FOUL Value",
    "question": "How many points does a MAJOR FOUL award to the opposing ALLIANCE?",
    "options": [
      "5 points",
      "10 points",
      "15 points",
      "20 points"
    ],
    "correct_answer": 2,
    "explanation": "A MAJOR FOUL credits 15 points to the opponent's MATCH point total according to Table 10-4.",
    "difficulty": 2,
    "category": "Penalties",
    "season": "2025-2026",
    "tags": ["penalties", "fouls", "major"],
    "source_page": "Section 10.6",
    "confidence": 10
  },
  {
    "section": "Section 9.8.2",
    "rule_name": "RAMP Capacity",
    "question": "How many CLASSIFIED ARTIFACTS can the RAMP hold before OVERFLOW occurs?",
    "options": [
      "6 ARTIFACTS",
      "8 ARTIFACTS",
      "9 ARTIFACTS",
      "12 ARTIFACTS"
    ],
    "correct_answer": 2,
    "explanation": "The RAMP can fit up to 9 CLASSIFIED ARTIFACTS before newly entered ARTIFACTS will OVERFLOW as stated in Section 9.8.2.",
    "difficulty": 3,
    "category": "Field Setup",
    "season": "2025-2026",
    "tags": ["ramp", "capacity", "classifier"],
    "source_page": "Section 9.8.2",
    "confidence": 10
  },
  {
    "section": "Section 9.6",
    "rule_name": "OBELISK Height",
    "question": "What is the height of the OBELISK?",
    "options": [
      "18 inches",
      "23 inches",
      "27 inches",
      "30 inches"
    ],
    "correct_answer": 1,
    "explanation": "The OBELISK is 23 in. (58.40 cm) tall as specified in Section 9.6.",
    "difficulty": 3,
    "category": "Field Setup",
    "season": "2025-2026",
    "tags": ["obelisk", "dimensions", "field"],
    "source_page": "Section 9.6",
    "confidence": 10
  },
  {
    "section": "Section 9.6",
    "rule_name": "MOTIF Options",
    "question": "Which of the following is NOT one of the three MOTIFS in DECODE?",
    "options": [
      "GPP",
      "PGP",
      "PPG",
      "GGP"
    ],
    "correct_answer": 3,
    "explanation": "The three MOTIFS in DECODE are GPP, PGP, and PPG as stated in Section 9.6. GGP is not a valid MOTIF.",
    "difficulty": 3,
    "category": "Game Rules",
    "season": "2025-2026",
    "tags": ["motif", "obelisk", "pattern"],
    "source_page": "Section 9.6",
    "confidence": 10
  },
  {
    "section": "Section 10.5.1",
    "rule_name": "CLASSIFIED Criteria",
    "question": "A ROBOT launches an ARTIFACT that enters through the GOAL top but bounces out before going through the SQUARE. How many points is this worth?",
    "options": [
      "0 points",
      "1 point (OVERFLOW)",
      "3 points (CLASSIFIED)",
      "Cannot be determined"
    ],
    "correct_answer": 0,
    "explanation": "ARTIFACTS must enter through the open top, exit under the archway, AND pass through the SQUARE to score. This ARTIFACT didn't meet all criteria, so it scores 0 points per Section 10.5.1.",
    "difficulty": 5,
    "category": "Scoring",
    "season": "2025-2026",
    "tags": ["scoring", "classified", "rules application"],
    "source_page": "Section 10.5.1",
    "confidence": 10
  },
  {
    "section": "Section 10.5.3",
    "rule_name": "BASE Support",
    "question": "A ROBOT has one wheel in the BASE ZONE and three wheels outside. What scoring condition does this meet?",
    "options": [
      "Not returned to BASE",
      "Partially returned to BASE (5 points)",
      "Fully returned to BASE (10 points)",
      "Invalid position (penalty)"
    ],
    "correct_answer": 1,
    "explanation": "Since the ROBOT is partially supported by the TILE in the BASE ZONE and partially by TILES outside, it's partially returned to BASE worth 5 points per Section 10.5.3.",
    "difficulty": 6,
    "category": "Scoring",
    "season": "2025-2026",
    "tags": ["base", "endgame", "scoring scenario"],
    "source_page": "Section 10.5.3",
    "confidence": 10
  },
  {
    "section": "Section 10.6.1",
    "rule_name": "YELLOW CARD Progression",
    "question": "What happens when a team receives a second YELLOW CARD during the event?",
    "options": [
      "They receive a warning",
      "They receive another YELLOW CARD only",
      "It automatically converts to a RED CARD",
      "They are disqualified from the event"
    ],
    "correct_answer": 2,
    "explanation": "A second YELLOW CARD is automatically converted to a RED CARD according to Section 10.6.1.",
    "difficulty": 4,
    "category": "Penalties",
    "season": "2025-2026",
    "tags": ["penalties", "yellow card", "red card"],
    "source_page": "Section 10.6.1",
    "confidence": 10
  },
  {
    "section": "Section 10.5.4",
    "rule_name": "DEPOT Points",
    "question": "How many points is each ARTIFACT in the DEPOT worth?",
    "options": [
      "1 point",
      "2 points",
      "3 points",
      "5 points"
    ],
    "correct_answer": 0,
    "explanation": "ARTIFACTS in the DEPOT are worth 1 point each according to Table 10-2.",
    "difficulty": 2,
    "category": "Scoring",
    "season": "2025-2026",
    "tags": ["depot", "scoring", "points"],
    "source_page": "Section 10.5.4",
    "confidence": 10
  },
  {
    "section": "Section 10.5.2",
    "rule_name": "PATTERN Scoring",
    "question": "If the MOTIF is GPP and the RAMP has GPPGPP in positions 1-6, how many PATTERN points are earned?",
    "options": [
      "6 points",
      "8 points",
      "12 points",
      "18 points"
    ],
    "correct_answer": 2,
    "explanation": "Each matching ARTIFACT scores 2 points. With 6 matching positions, that's 6 × 2 = 12 points per Section 10.5.2 and Table 10-2.",
    "difficulty": 6,
    "category": "Scoring",
    "season": "2025-2026",
    "tags": ["pattern", "scoring", "calculation"],
    "source_page": "Section 10.5.2",
    "confidence": 10
  },
  {
    "section": "Section 9.8.3",
    "rule_name": "GATE Height Range",
    "question": "When closed, what is the height range of the GATE contact area above the TILES?",
    "options": [
      "2.5 to 4.0 inches",
      "3.75 to 5.5 inches",
      "4.0 to 6.0 inches",
      "5.0 to 7.0 inches"
    ],
    "correct_answer": 1,
    "explanation": "When closed, the GATE contact area ranges from approximately 3.75 in. to 5.5 in. above the TILES per Section 9.8.3.",
    "difficulty": 4,
    "category": "Field Setup",
    "season": "2025-2026",
    "tags": ["gate", "dimensions", "classifier"],
    "source_page": "Section 9.8.3",
    "confidence": 10
  },
  {
    "section": "Section 10.3.1",
    "rule_name": "Pre-loaded ARTIFACTS",
    "question": "How many ARTIFACTS can each ROBOT be pre-loaded with before the match?",
    "options": [
      "Up to 2 ARTIFACTS",
      "Up to 3 ARTIFACTS",
      "Up to 4 ARTIFACTS",
      "Up to 5 ARTIFACTS"
    ],
    "correct_answer": 1,
    "explanation": "Each ROBOT may be pre-loaded with up to 3 ARTIFACTS from their ALLIANCE AREA as stated in Section 10.3.1.",
    "difficulty": 3,
    "category": "Game Rules",
    "season": "2025-2026",
    "tags": ["preload", "setup", "artifacts"],
    "source_page": "Section 10.3.1",
    "confidence": 10
  },
  {
    "section": "Section 10.6",
    "rule_name": "MOMENTARY Duration",
    "question": "According to the rules, MOMENTARY describes durations that are fewer than approximately how many seconds?",
    "options": [
      "2 seconds",
      "3 seconds",
      "5 seconds",
      "10 seconds"
    ],
    "correct_answer": 1,
    "explanation": "MOMENTARY describes durations that are fewer than approximately 3 seconds as defined in Section 10.6.",
    "difficulty": 3,
    "category": "Game Rules",
    "season": "2025-2026",
    "tags": ["timing", "definitions", "violations"],
    "source_page": "Section 10.6",
    "confidence": 10
  },
  {
    "section": "Section 10.6",
    "rule_name": "CONTINUOUS Duration",
    "question": "What duration threshold defines a CONTINUOUS action?",
    "options": [
      "More than 3 seconds",
      "More than 5 seconds",
      "More than 10 seconds",
      "More than 15 seconds"
    ],
    "correct_answer": 2,
    "explanation": "CONTINUOUS describes durations that are more than approximately 10 seconds according to Section 10.6.",
    "difficulty": 3,
    "category": "Game Rules",
    "season": "2025-2026",
    "tags": ["timing", "definitions", "violations"],
    "source_page": "Section 10.6",
    "confidence": 10
  },
  {
    "section": "Section 9.7",
    "rule_name": "GOAL Opening Dimensions",
    "question": "What are the approximate dimensions of the GOAL opening?",
    "options": [
      "24.5 in. wide by 16.3 in. deep",
      "26.5 in. wide by 18.3 in. deep",
      "28.5 in. wide by 20.3 in. deep",
      "30.5 in. wide by 22.3 in. deep"
    ],
    "correct_answer": 1,
    "explanation": "The GOAL opening is approximately 26.5 in. (67.30 cm) wide and 18.3 in. (46.45 cm) deep per Section 9.7.",
    "difficulty": 4,
    "category": "Field Setup",
    "season": "2025-2026",
    "tags": ["goal", "dimensions", "field"],
    "source_page": "Section 9.7",
    "confidence": 10
  },
  {
    "section": "Section 10.5.4",
    "rule_name": "WIN Ranking Points",
    "question": "How many RANKING POINTS does an ALLIANCE receive for winning a Qualification match?",
    "options": [
      "1 RP",
      "2 RP",
      "3 RP",
      "4 RP"
    ],
    "correct_answer": 2,
    "explanation": "Winning a match awards 3 RANKING POINTS according to Table 10-2.",
    "difficulty": 2,
    "category": "Scoring",
    "season": "2025-2026",
    "tags": ["ranking points", "win", "scoring"],
    "source_page": "Section 10.5.4",
    "confidence": 10
  },
  {
    "section": "Section 10.5.4",
    "rule_name": "TIE Ranking Points",
    "question": "How many RANKING POINTS does each ALLIANCE receive for a tied match?",
    "options": [
      "0 RP",
      "1 RP",
      "2 RP",
      "3 RP"
    ],
    "correct_answer": 1,
    "explanation": "A tied match awards 1 RANKING POINT to each ALLIANCE per Table 10-2.",
    "difficulty": 2,
    "category": "Scoring",
    "season": "2025-2026",
    "tags": ["ranking points", "tie", "scoring"],
    "source_page": "Section 10.5.4",
    "confidence": 10
  },
  {
    "section": "Section 9.2",
    "rule_name": "TILE Dimensions",
    "question": "What are the nominal dimensions of each foam TILE on the field?",
    "options": [
      "20 in. by 20 in.",
      "24 in. by 24 in.",
      "30 in. by 30 in.",
      "36 in. by 36 in."
    ],
    "correct_answer": 1,
    "explanation": "Each foam TILE is approximately 24 in. by 24 in. by 0.59 in. nominally sized according to Section 9.2.",
    "difficulty": 3,
    "category": "Field Setup",
    "season": "2025-2026",
    "tags": ["tiles", "field", "dimensions"],
    "source_page": "Section 9.2",
    "confidence": 10
  },
  {
    "section": "Section 9.2",
    "rule_name": "Total TILES",
    "question": "How many interlocking foam TILES make up the DECODE field surface?",
    "options": [
      "25 tiles",
      "30 tiles",
      "36 tiles",
      "42 tiles"
    ],
    "correct_answer": 2,
    "explanation": "The field surface is made of 36 interlocking soft foam TILES as stated in Section 9.2.",
    "difficulty": 3,
    "category": "Field Setup",
    "season": "2025-2026",
    "tags": ["tiles", "field", "quantity"],
    "source_page": "Section 9.2",
    "confidence": 10
  },
  {
    "section": "Section 10.3.4",
    "rule_name": "ROBOT Placement Order",
    "question": "In Qualification matches, which ROBOT places first when alternating placement is required?",
    "options": [
      "Blue 1",
      "Red 1",
      "The higher ranked team",
      "Determined by coin flip"
    ],
    "correct_answer": 1,
    "explanation": "In Qualification MATCHES, the first red ROBOT (Red 1) places first when alternating placement is required per Section 10.3.4.",
    "difficulty": 5,
    "category": "Game Rules",
    "season": "2025-2026",
    "tags": ["setup", "placement", "qualification"],
    "source_page": "Section 10.3.4",
    "confidence": 10
  },
  {
    "section": "Section 10.5.1",
    "rule_name": "DEPOT Ownership",
    "question": "A blue ROBOT pushes 3 ARTIFACTS into the red DEPOT. Who gets the points?",
    "options": [
      "Blue ALLIANCE gets 3 points",
      "Red ALLIANCE gets 3 points",
      "No points are awarded",
      "Both ALLIANCES get 1.5 points each"
    ],
    "correct_answer": 1,
    "explanation": "DEPOT points are awarded to the ALLIANCE that owns the DEPOT regardless of who placed the ARTIFACTS there, per Section 10.5.1.",
    "difficulty": 6,
    "category": "Scoring",
    "season": "2025-2026",
    "tags": ["depot", "scoring", "scenario"],
    "source_page": "Section 10.5.1",
    "confidence": 10
  },
  {
    "section": "Section 9.10",
    "rule_name": "AprilTag IDs",
    "question": "What is the AprilTag ID on the red ALLIANCE GOAL?",
    "options": [
      "ID 20",
      "ID 21",
      "ID 23",
      "ID 24"
    ],
    "correct_answer": 3,
    "explanation": "The red ALLIANCE GOAL has AprilTag ID 24 as specified in Section 9.10.",
    "difficulty": 4,
    "category": "Field Setup",
    "season": "2025-2026",
    "tags": ["apriltag", "goal", "identification"],
    "source_page": "Section 9.10",
    "confidence": 10
  },
  {
    "section": "Section 9.10",
    "rule_name": "AprilTag Size",
    "question": "What is the size of the AprilTags used in DECODE?",
    "options": [
      "6.125 inches square",
      "8.125 inches square",
      "10.125 inches square",
      "12.125 inches square"
    ],
    "correct_answer": 1,
    "explanation": "AprilTags for DECODE are 8.125 in. (~20.65 cm) square targets from the 36h11 tag family per Section 9.10.",
    "difficulty": 4,
    "category": "Field Setup",
    "season": "2025-2026",
    "tags": ["apriltag", "dimensions", "vision"],
    "source_page": "Section 9.10",
    "confidence": 10
  },
  {
    "section": "Section 10.6.4",
    "rule_name": "Progressive Penalties",
    "question": "A ROBOT violates a 'MINOR FOUL, MAJOR FOUL if REPEATED' rule twice in one match. What is the total penalty?",
    "options": [
      "10 points (2 MINOR FOULS)",
      "15 points (1 MAJOR FOUL)",
      "20 points (1 MINOR + 1 MAJOR)",
      "30 points (2 MAJOR FOULS)"
    ],
    "correct_answer": 2,
    "explanation": "First violation = MINOR FOUL (5 points), second violation = MAJOR FOUL (15 points), total = 20 points per Section 10.6.4.",
    "difficulty": 7,
    "category": "Penalties",
    "season": "2025-2026",
    "tags": ["penalties", "progressive", "calculation"],
    "source_page": "Section 10.6.4",
    "confidence": 10
  },
  {
    "section": "Section 10.5",
    "rule_name": "AUTO to TELEOP Scoring",
    "question": "An ARTIFACT is launched just before AUTO ends but passes through the SQUARE after AUTO ends. When is it scored?",
    "options": [
      "During AUTO period",
      "During the 8-second transition",
      "During TELEOP period",
      "Not scored at all"
    ],
    "correct_answer": 2,
    "explanation": "ARTIFACTS scored after the end of AUTO are assessed as part of TELEOP according to Section 10.5.",
    "difficulty": 6,
    "category": "Scoring",
    "season": "2025-2026",
    "tags": ["timing", "scoring", "auto", "teleop"],
    "source_page": "Section 10.5",
    "confidence": 10
  },
  {
    "section": "Section 9.8.3",
    "rule_name": "GATE Displacement",
    "question": "What is the total horizontal displacement required to move the GATE from closed to open?",
    "options": [
      "Approximately 1 inch",
      "Approximately 2 inches",
      "Approximately 3 inches",
      "Approximately 4 inches"
    ],
    "correct_answer": 1,
    "explanation": "The total horizontal displacement required to move the GATE from closed to open is approximately 2 in. (5.10 cm) per Section 9.8.3.",
    "difficulty": 5,
    "category": "Field Setup",
    "season": "2025-2026",
    "tags": ["gate", "actuation", "mechanics"],
    "source_page": "Section 9.8.3",
    "confidence": 10
  },
  {
    "section": "Section 9.8.3",
    "rule_name": "GATE Displacement",
    "question": "What is the total horizontal displacement required to move the GATE from closed to open?",
    "options": [
      "Approximately 1 inch",
      "Approximately 2 inches",
      "Approximately 3 inches",
      "Approximately 4 inches"
    ],
    "correct_answer": 1,
    "explanation": "The total horizontal displacement required to move the GATE from closed to open is approximately 2 in. (5.10 cm) per Section 9.8.3.",
    "difficulty": 5,
    "category": "Field Setup",
    "season": "2025-2026",
    "tags": ["gate", "actuation", "mechanics"],
    "source_page": "Section 9.8.3",
  },
    {
    "section": "Section 9.2",
    "rule_name": "FIELD Dimensions",
    "question": "What are the exact dimensions of the DECODE playing field?",
    "options": [
      "120 in. by 120 in.",
      "144 in. by 144 in.",
      "156 in. by 156 in.",
      "132 in. by 132 in."
    ],
    "correct_answer": 1,
    "explanation": "The DECODE field is approximately 144 in. by 144 in. (365.75 cm by 365.75 cm) as specified in Section 9.2.",
    "difficulty": 2,
    "category": "Field Setup",
    "season": "2025-2026",
    "tags": ["field", "dimensions", "setup"],
    "source_page": "Section 9.2",
    "confidence": 10
  },
  {
    "section": "Section 9.9",
    "rule_name": "SCORING ELEMENTS",
    "question": "How many total ARTIFACTS are used in a DECODE match?",
    "options": [
      "30 (20 purple, 10 green)",
      "36 (24 purple, 12 green)",
      "40 (25 purple, 15 green)",
      "32 (22 purple, 10 green)"
    ],
    "correct_answer": 1,
    "explanation": "There are 36 total ARTIFACTS: 24 purple and 12 green as stated in Section 9.9.",
    "difficulty": 2,
    "category": "Scoring",
    "season": "2025-2026",
    "tags": ["artifacts", "scoring elements", "game pieces"],
    "source_page": "Section 9.9",
    "confidence": 10
  },
  {
    "section": "Section 10.1",
    "rule_name": "MATCH Timing",
    "question": "What is the total duration of the AUTO period in DECODE?",
    "options": [
      "20 seconds",
      "25 seconds",
      "30 seconds",
      "35 seconds"
    ],
    "correct_answer": 2,
    "explanation": "The AUTO period lasts 30 seconds as specified in Section 10.1.",
    "difficulty": 1,
    "category": "Game Rules",
    "season": "2025-2026",
    "tags": ["timing", "auto", "match"],
    "source_page": "Section 10.1",
    "confidence": 10
  },
  {
    "section": "Section 10.1",
    "rule_name": "Transition Period",
    "question": "How long is the transition period between AUTO and TELEOP?",
    "options": [
      "5 seconds",
      "8 seconds",
      "10 seconds",
      "12 seconds"
    ],
    "correct_answer": 1,
    "explanation": "There is an 8-second transition period between AUTO and TELEOP as stated in Section 10.1.",
    "difficulty": 2,
    "category": "Game Rules",
    "season": "2025-2026",
    "tags": ["timing", "transition", "match"],
    "source_page": "Section 10.1",
    "confidence": 10
  },
  {
    "section": "Section 10.2",
    "rule_name": "DRIVE TEAM Composition",
    "question": "What is the maximum number of people allowed on a DRIVE TEAM?",
    "options": [
      "3 people",
      "4 people",
      "5 people",
      "6 people"
    ],
    "correct_answer": 1,
    "explanation": "A DRIVE TEAM consists of up to 4 people as specified in Section 10.2.",
    "difficulty": 2,
    "category": "Game Rules",
    "season": "2025-2026",
    "tags": ["drive team", "team composition"],
    "source_page": "Section 10.2",
    "confidence": 10
  },
  {
    "section": "Section 10.2",
    "rule_name": "Non-STUDENT Limit",
    "question": "How many non-STUDENTS are allowed on a DRIVE TEAM?",
    "options": [
      "None",
      "No more than 1",
      "No more than 2",
      "Unlimited"
    ],
    "correct_answer": 1,
    "explanation": "No more than 1 member of the DRIVE TEAM is allowed to be a non-STUDENT according to Section 10.2.",
    "difficulty": 3,
    "category": "Game Rules",
    "season": "2025-2026",
    "tags": ["drive team", "student", "adult"],
    "source_page": "Section 10.2",
    "confidence": 10
  },
  {
    "section": "Section 10.5.4",
    "rule_name": "CLASSIFIED Points",
    "question": "How many points is a CLASSIFIED ARTIFACT worth during AUTO?",
    "options": [
      "1 point",
      "2 points",
      "3 points",
      "5 points"
    ],
    "correct_answer": 2,
    "explanation": "CLASSIFIED ARTIFACTS are worth 3 points during both AUTO and TELEOP as shown in Table 10-2.",
    "difficulty": 2,
    "category": "Scoring",
    "season": "2025-2026",
    "tags": ["scoring", "classified", "points"],
    "source_page": "Section 10.5.4",
    "confidence": 10
  },
  {
    "section": "Section 10.5.4",
    "rule_name": "OVERFLOW Points",
    "question": "How many points is an OVERFLOW ARTIFACT worth?",
    "options": [
      "1 point",
      "2 points",
      "3 points",
      "5 points"
    ],
    "correct_answer": 0,
    "explanation": "OVERFLOW ARTIFACTS are worth 1 point during both AUTO and TELEOP according to Table 10-2.",
    "difficulty": 2,
    "category": "Scoring",
    "season": "2025-2026",
    "tags": ["scoring", "overflow", "points"],
    "source_page": "Section 10.5.4",
    "confidence": 10
  },
  {
    "section": "Section 10.5.4",
    "rule_name": "LEAVE Points",
    "question": "How many points does a ROBOT earn for LEAVING the LAUNCH LINE during AUTO?",
    "options": [
      "2 points",
      "3 points",
      "5 points",
      "10 points"
    ],
    "correct_answer": 1,
    "explanation": "LEAVING the LAUNCH LINE during AUTO awards 3 points as specified in Table 10-2.",
    "difficulty": 2,
    "category": "Scoring",
    "season": "2025-2026",
    "tags": ["scoring", "leave", "auto"],
    "source_page": "Section 10.5.4",
    "confidence": 10
  },
  {
    "section": "Section 10.5.4",
    "rule_name": "Fully Returned BASE Points",
    "question": "How many points does a ROBOT earn for being fully returned to BASE at the end of TELEOP?",
    "options": [
      "5 points",
      "8 points",
      "10 points",
      "15 points"
    ],
    "correct_answer": 2,
    "explanation": "A ROBOT fully returned to BASE earns 10 points according to Table 10-2.",
    "difficulty": 2,
    "category": "Scoring",
    "season": "2025-2026",
    "tags": ["scoring", "base", "endgame"],
    "source_page": "Section 10.5.4",
    "confidence": 10
  },
  {
    "section": "Section 10.5.4",
    "rule_name": "Double BASE Bonus",
    "question": "What is the additional bonus when both ROBOTS on an ALLIANCE are fully returned to BASE?",
    "options": [
      "5 points",
      "10 points",
      "15 points",
      "20 points"
    ],
    "correct_answer": 1,
    "explanation": "When 2 ROBOTS are fully returned to BASE, there's an additional 10 point bonus as shown in Table 10-2.",
    "difficulty": 3,
    "category": "Scoring",
    "season": "2025-2026",
    "tags": ["scoring", "base", "bonus"],
    "source_page": "Section 10.5.4",
    "confidence": 10
  },
  {
    "section": "Section 10.6",
    "rule_name": "MINOR FOUL Value",
    "question": "How many points does a MINOR FOUL award to the opposing ALLIANCE?",
    "options": [
      "3 points",
      "5 points",
      "10 points",
      "15 points"
    ],
    "correct_answer": 1,
    "explanation": "A MINOR FOUL credits 5 points to the opponent's MATCH point total as defined in Table 10-4.",
    "difficulty": 2,
    "category": "Penalties",
    "season": "2025-2026",
    "tags": ["penalties", "fouls", "minor"],
    "source_page": "Section 10.6",
    "confidence": 10
  },
  {
    "section": "Section 10.6",
    "rule_name": "MAJOR FOUL Value",
    "question": "How many points does a MAJOR FOUL award to the opposing ALLIANCE?",
    "options": [
      "5 points",
      "10 points",
      "15 points",
      "20 points"
    ],
    "correct_answer": 2,
    "explanation": "A MAJOR FOUL credits 15 points to the opponent's MATCH point total according to Table 10-4.",
    "difficulty": 2,
    "category": "Penalties",
    "season": "2025-2026",
    "tags": ["penalties", "fouls", "major"],
    "source_page": "Section 10.6",
    "confidence": 10
  },
  {
    "section": "Section 9.8.2",
    "rule_name": "RAMP Capacity",
    "question": "How many CLASSIFIED ARTIFACTS can the RAMP hold before OVERFLOW occurs?",
    "options": [
      "6 ARTIFACTS",
      "8 ARTIFACTS",
      "9 ARTIFACTS",
      "12 ARTIFACTS"
    ],
    "correct_answer": 2,
    "explanation": "The RAMP can fit up to 9 CLASSIFIED ARTIFACTS before newly entered ARTIFACTS will OVERFLOW as stated in Section 9.8.2.",
    "difficulty": 3,
    "category": "Field Setup",
    "season": "2025-2026",
    "tags": ["ramp", "capacity", "classifier"],
    "source_page": "Section 9.8.2",
    "confidence": 10
  },
  {
    "section": "Section 9.6",
    "rule_name": "OBELISK Height",
    "question": "What is the height of the OBELISK?",
    "options": [
      "18 inches",
      "23 inches",
      "27 inches",
      "30 inches"
    ],
    "correct_answer": 1,
    "explanation": "The OBELISK is 23 in. (58.40 cm) tall as specified in Section 9.6.",
    "difficulty": 3,
    "category": "Field Setup",
    "season": "2025-2026",
    "tags": ["obelisk", "dimensions", "field"],
    "source_page": "Section 9.6",
    "confidence": 10
  },
  {
    "section": "Section 9.6",
    "rule_name": "MOTIF Options",
    "question": "Which of the following is NOT one of the three MOTIFS in DECODE?",
    "options": [
      "GPP",
      "PGP",
      "PPG",
      "GGP"
    ],
    "correct_answer": 3,
    "explanation": "The three MOTIFS in DECODE are GPP, PGP, and PPG as stated in Section 9.6. GGP is not a valid MOTIF.",
    "difficulty": 3,
    "category": "Game Rules",
    "season": "2025-2026",
    "tags": ["motif", "obelisk", "pattern"],
    "source_page": "Section 9.6",
    "confidence": 10
  },
  {
    "section": "Section 10.5.1",
    "rule_name": "CLASSIFIED Criteria",
    "question": "A ROBOT launches an ARTIFACT that enters through the GOAL top but bounces out before going through the SQUARE. How many points is this worth?",
    "options": [
      "0 points",
      "1 point (OVERFLOW)",
      "3 points (CLASSIFIED)",
      "Cannot be determined"
    ],
    "correct_answer": 0,
    "explanation": "ARTIFACTS must enter through the open top, exit under the archway, AND pass through the SQUARE to score. This ARTIFACT didn't meet all criteria, so it scores 0 points per Section 10.5.1.",
    "difficulty": 5,
    "category": "Scoring",
    "season": "2025-2026",
    "tags": ["scoring", "classified", "rules application"],
    "source_page": "Section 10.5.1",
    "confidence": 10
  },
  {
    "section": "Section 10.5.3",
    "rule_name": "BASE Support",
    "question": "A ROBOT has one wheel in the BASE ZONE and three wheels outside. What scoring condition does this meet?",
    "options": [
      "Not returned to BASE",
      "Partially returned to BASE (5 points)",
      "Fully returned to BASE (10 points)",
      "Invalid position (penalty)"
    ],
    "correct_answer": 1,
    "explanation": "Since the ROBOT is partially supported by the TILE in the BASE ZONE and partially by TILES outside, it's partially returned to BASE worth 5 points per Section 10.5.3.",
    "difficulty": 6,
    "category": "Scoring",
    "season": "2025-2026",
    "tags": ["base", "endgame", "scoring scenario"],
    "source_page": "Section 10.5.3",
    "confidence": 10
  },
  {
    "section": "Section 10.6.1",
    "rule_name": "YELLOW CARD Progression",
    "question": "What happens when a team receives a second YELLOW CARD during the event?",
    "options": [
      "They receive a warning",
      "They receive another YELLOW CARD only",
      "It automatically converts to a RED CARD",
      "They are disqualified from the event"
    ],
    "correct_answer": 2,
    "explanation": "A second YELLOW CARD is automatically converted to a RED CARD according to Section 10.6.1.",
    "difficulty": 4,
    "category": "Penalties",
    "season": "2025-2026",
    "tags": ["penalties", "yellow card", "red card"],
    "source_page": "Section 10.6.1",
    "confidence": 10
  },
  {
    "section": "Section 10.5.4",
    "rule_name": "DEPOT Points",
    "question": "How many points is each ARTIFACT in the DEPOT worth?",
    "options": [
      "1 point",
      "2 points",
      "3 points",
      "5 points"
    ],
    "correct_answer": 0,
    "explanation": "ARTIFACTS in the DEPOT are worth 1 point each according to Table 10-2.",
    "difficulty": 2,
    "category": "Scoring",
    "season": "2025-2026",
    "tags": ["depot", "scoring", "points"],
    "source_page": "Section 10.5.4",
    "confidence": 10
  },
  {
    "section": "Section 10.5.2",
    "rule_name": "PATTERN Scoring",
    "question": "If the MOTIF is GPP and the RAMP has GPPGPP in positions 1-6, how many PATTERN points are earned?",
    "options": [
      "6 points",
      "8 points",
      "12 points",
      "18 points"
    ],
    "correct_answer": 2,
    "explanation": "Each matching ARTIFACT scores 2 points. With 6 matching positions, that's 6 × 2 = 12 points per Section 10.5.2 and Table 10-2.",
    "difficulty": 6,
    "category": "Scoring",
    "season": "2025-2026",
    "tags": ["pattern", "scoring", "calculation"],
    "source_page": "Section 10.5.2",
    "confidence": 10
  },
  {
    "section": "Section 9.8.3",
    "rule_name": "GATE Height Range",
    "question": "When closed, what is the height range of the GATE contact area above the TILES?",
    "options": [
      "2.5 to 4.0 inches",
      "3.75 to 5.5 inches",
      "4.0 to 6.0 inches",
      "5.0 to 7.0 inches"
    ],
    "correct_answer": 1,
    "explanation": "When closed, the GATE contact area ranges from approximately 3.75 in. to 5.5 in. above the TILES per Section 9.8.3.",
    "difficulty": 4,
    "category": "Field Setup",
    "season": "2025-2026",
    "tags": ["gate", "dimensions", "classifier"],
    "source_page": "Section 9.8.3",
    "confidence": 10
  },
  {
    "section": "Section 10.3.1",
    "rule_name": "Pre-loaded ARTIFACTS",
    "question": "How many ARTIFACTS can each ROBOT be pre-loaded with before the match?",
    "options": [
      "Up to 2 ARTIFACTS",
      "Up to 3 ARTIFACTS",
      "Up to 4 ARTIFACTS",
      "Up to 5 ARTIFACTS"
    ],
    "correct_answer": 1,
    "explanation": "Each ROBOT may be pre-loaded with up to 3 ARTIFACTS from their ALLIANCE AREA as stated in Section 10.3.1.",
    "difficulty": 3,
    "category": "Game Rules",
    "season": "2025-2026",
    "tags": ["preload", "setup", "artifacts"],
    "source_page": "Section 10.3.1",
    "confidence": 10
  },
  {
    "section": "Section 10.6",
    "rule_name": "MOMENTARY Duration",
    "question": "According to the rules, MOMENTARY describes durations that are fewer than approximately how many seconds?",
    "options": [
      "2 seconds",
      "3 seconds",
      "5 seconds",
      "10 seconds"
    ],
    "correct_answer": 1,
    "explanation": "MOMENTARY describes durations that are fewer than approximately 3 seconds as defined in Section 10.6.",
    "difficulty": 3,
    "category": "Game Rules",
    "season": "2025-2026",
    "tags": ["timing", "definitions", "violations"],
    "source_page": "Section 10.6",
    "confidence": 10
  },
  {
    "section": "Section 10.6",
    "rule_name": "CONTINUOUS Duration",
    "question": "What duration threshold defines a CONTINUOUS action?",
    "options": [
      "More than 3 seconds",
      "More than 5 seconds",
      "More than 10 seconds",
      "More than 15 seconds"
    ],
    "correct_answer": 2,
    "explanation": "CONTINUOUS describes durations that are more than approximately 10 seconds according to Section 10.6.",
    "difficulty": 3,
    "category": "Game Rules",
    "season": "2025-2026",
    "tags": ["timing", "definitions", "violations"],
    "source_page": "Section 10.6",
    "confidence": 10
  },
  {
    "section": "Section 9.7",
    "rule_name": "GOAL Opening Dimensions",
    "question": "What are the approximate dimensions of the GOAL opening?",
    "options": [
      "24.5 in. wide by 16.3 in. deep",
      "26.5 in. wide by 18.3 in. deep",
      "28.5 in. wide by 20.3 in. deep",
      "30.5 in. wide by 22.3 in. deep"
    ],
    "correct_answer": 1,
    "explanation": "The GOAL opening is approximately 26.5 in. (67.30 cm) wide and 18.3 in. (46.45 cm) deep per Section 9.7.",
    "difficulty": 4,
    "category": "Field Setup",
    "season": "2025-2026",
    "tags": ["goal", "dimensions", "field"],
    "source_page": "Section 9.7",
    "confidence": 10
  },
  {
    "section": "Section 10.5.4",
    "rule_name": "WIN Ranking Points",
    "question": "How many RANKING POINTS does an ALLIANCE receive for winning a Qualification match?",
    "options": [
      "1 RP",
      "2 RP",
      "3 RP",
      "4 RP"
    ],
    "correct_answer": 2,
    "explanation": "Winning a match awards 3 RANKING POINTS according to Table 10-2.",
    "difficulty": 2,
    "category": "Scoring",
    "season": "2025-2026",
    "tags": ["ranking points", "win", "scoring"],
    "source_page": "Section 10.5.4",
    "confidence": 10
  },
  {
    "section": "Section 10.5.4",
    "rule_name": "TIE Ranking Points",
    "question": "How many RANKING POINTS does each ALLIANCE receive for a tied match?",
    "options": [
      "0 RP",
      "1 RP",
      "2 RP",
      "3 RP"
    ],
    "correct_answer": 1,
    "explanation": "A tied match awards 1 RANKING POINT to each ALLIANCE per Table 10-2.",
    "difficulty": 2,
    "category": "Scoring",
    "season": "2025-2026",
    "tags": ["ranking points", "tie", "scoring"],
    "source_page": "Section 10.5.4",
    "confidence": 10
  },
  {
    "section": "Section 9.2",
    "rule_name": "TILE Dimensions",
    "question": "What are the nominal dimensions of each foam TILE on the field?",
    "options": [
      "20 in. by 20 in.",
      "24 in. by 24 in.",
      "30 in. by 30 in.",
      "36 in. by 36 in."
    ],
    "correct_answer": 1,
    "explanation": "Each foam TILE is approximately 24 in. by 24 in. by 0.59 in. nominally sized according to Section 9.2.",
    "difficulty": 3,
    "category": "Field Setup",
    "season": "2025-2026",
    "tags": ["tiles", "field", "dimensions"],
    "source_page": "Section 9.2",
    "confidence": 10
  },
  {
    "section": "Section 9.2",
    "rule_name": "Total TILES",
    "question": "How many interlocking foam TILES make up the DECODE field surface?",
    "options": [
      "25 tiles",
      "30 tiles",
      "36 tiles",
      "42 tiles"
    ],
    "correct_answer": 2,
    "explanation": "The field surface is made of 36 interlocking soft foam TILES as stated in Section 9.2.",
    "difficulty": 3,
    "category": "Field Setup",
    "season": "2025-2026",
    "tags": ["tiles", "field", "quantity"],
    "source_page": "Section 9.2",
    "confidence": 10
  },
  {
    "section": "Section 10.3.4",
    "rule_name": "ROBOT Placement Order",
    "question": "In Qualification matches, which ROBOT places first when alternating placement is required?",
    "options": [
      "Blue 1",
      "Red 1",
      "The higher ranked team",
      "Determined by coin flip"
    ],
    "correct_answer": 1,
    "explanation": "In Qualification MATCHES, the first red ROBOT (Red 1) places first when alternating placement is required per Section 10.3.4.",
    "difficulty": 5,
    "category": "Game Rules",
    "season": "2025-2026",
    "tags": ["setup", "placement", "qualification"],
    "source_page": "Section 10.3.4",
    "confidence": 10
  },
  {
    "section": "Section 10.5.1",
    "rule_name": "DEPOT Ownership",
    "question": "A blue ROBOT pushes 3 ARTIFACTS into the red DEPOT. Who gets the points?",
    "options": [
      "Blue ALLIANCE gets 3 points",
      "Red ALLIANCE gets 3 points",
      "No points are awarded",
      "Both ALLIANCES get 1.5 points each"
    ],
    "correct_answer": 1,
    "explanation": "DEPOT points are awarded to the ALLIANCE that owns the DEPOT regardless of who placed the ARTIFACTS there, per Section 10.5.1.",
    "difficulty": 6,
    "category": "Scoring",
    "season": "2025-2026",
    "tags": ["depot", "scoring", "scenario"],
    "source_page": "Section 10.5.1",
    "confidence": 10
  },
  {
    "section": "Section 9.10",
    "rule_name": "AprilTag IDs",
    "question": "What is the AprilTag ID on the red ALLIANCE GOAL?",
    "options": [
      "ID 20",
      "ID 21",
      "ID 23",
      "ID 24"
    ],
    "correct_answer": 3,
    "explanation": "The red ALLIANCE GOAL has AprilTag ID 24 as specified in Section 9.10.",
    "difficulty": 4,
    "category": "Field Setup",
    "season": "2025-2026",
    "tags": ["apriltag", "goal", "identification"],
    "source_page": "Section 9.10",
    "confidence": 10
  },
  {
    "section": "Section 9.10",
    "rule_name": "AprilTag Size",
    "question": "What is the size of the AprilTags used in DECODE?",
    "options": [
      "6.125 inches square",
      "8.125 inches square",
      "10.125 inches square",
      "12.125 inches square"
    ],
    "correct_answer": 1,
    "explanation": "AprilTags for DECODE are 8.125 in. (~20.65 cm) square targets from the 36h11 tag family per Section 9.10.",
    "difficulty": 4,
    "category": "Field Setup",
    "season": "2025-2026",
    "tags": ["apriltag", "dimensions", "vision"],
    "source_page": "Section 9.10",
    "confidence": 10
  },
  {
    "section": "Section 10.6.4",
    "rule_name": "Progressive Penalties",
    "question": "A ROBOT violates a 'MINOR FOUL, MAJOR FOUL if REPEATED' rule twice in one match. What is the total penalty?",
    "options": [
      "10 points (2 MINOR FOULS)",
      "15 points (1 MAJOR FOUL)",
      "20 points (1 MINOR + 1 MAJOR)",
      "30 points (2 MAJOR FOULS)"
    ],
    "correct_answer": 2,
    "explanation": "First violation = MINOR FOUL (5 points), second violation = MAJOR FOUL (15 points), total = 20 points per Section 10.6.4.",
    "difficulty": 7,
    "category": "Penalties",
    "season": "2025-2026",
    "tags": ["penalties", "progressive", "calculation"],
    "source_page": "Section 10.6.4",
    "confidence": 10
  },
  {
    "section": "Section 10.5",
    "rule_name": "AUTO to TELEOP Scoring",
    "question": "An ARTIFACT is launched just before AUTO ends but passes through the SQUARE after AUTO ends. When is it scored?",
    "options": [
      "During AUTO period",
      "During the 8-second transition",
      "During TELEOP period",
      "Not scored at all"
    ],
    "correct_answer": 2,
    "explanation": "ARTIFACTS scored after the end of AUTO are assessed as part of TELEOP according to Section 10.5.",
    "difficulty": 6,
    "category": "Scoring",
    "season": "2025-2026",
    "tags": ["timing", "scoring", "auto", "teleop"],
    "source_page": "Section 10.5",
    "confidence": 10
  },
  {
    "section": "Section 9.8.3",
    "rule_name": "GATE Displacement",
    "question": "What is the total horizontal displacement required to move the GATE from closed to open?",
    "options": [
      "Approximately 1 inch",
      "Approximately 2 inches",
      "Approximately 3 inches",
      "Approximately 4 inches"
    ],
    "correct_answer": 1,
    "explanation": "The total horizontal displacement required to move the GATE from closed to open is approximately 2 in. (5.10 cm) per Section 9.8.3.",
    "difficulty": 5,
    "category": "Field Setup",
    "season": "2025-2026",
    "tags": ["gate", "actuation", "mechanics"],
    "source_page": "Section 9.8.3",
    "confidence": 10
  },
  {
    "section": "Section 9.3",
    "rule_name": "ALLIANCE AREA Dimensions",
    "question": "What are the dimensions of each ALLIANCE AREA?",
    "options": [
      "84 in. wide by 48 in. deep",
      "96 in. wide by 54 in. deep",
      "108 in. wide by 60 in. deep",
      "120 in. wide by 66 in. deep"
    ],
    "correct_answer": 1,
    "explanation": "The ALLIANCE AREA is 96 in. (243.85 cm) wide by 54 in. (137.15 cm) deep as specified in Section 9.3.",
    "difficulty": 3,
    "category": "Field Setup",
    "season": "2025-2026",
    "tags": ["alliance area", "dimensions", "field"],
    "source_page": "Section 9.3",
    "confidence": 10
  },
  {
    "section": "Section 10.5.3",
    "rule_name": "LEAVE Qualification",
    "question": "At the end of AUTO, a ROBOT is straddling the LAUNCH LINE with half on each side. Does it qualify for LEAVE points?",
    "options": [
      "Yes, 3 points awarded",
      "No, 0 points awarded",
      "Partial credit of 1.5 points",
      "Referee discretion"
    ],
    "correct_answer": 1,
    "explanation": "To qualify for LEAVE points, a ROBOT must be no longer over ANY LAUNCH LINE. Being partially over disqualifies it from LEAVE points per Section 10.5.3.",
    "difficulty": 5,
    "category": "Scoring",
    "season": "2025-2026",
    "tags": ["leave", "auto", "scoring scenario"],
    "source_page": "Section 10.5.3",
    "confidence": 10
  },
  {
    "section": "Section 10.6.4",
    "rule_name": "Time-Based Penalties",
    "question": "A ROBOT violates a rule with 'MINOR FOUL and an additional MINOR FOUL for every 3 seconds' for 10 seconds. What's the total penalty?",
    "options": [
      "15 points (3 MINOR FOULS)",
      "20 points (4 MINOR FOULS)",
      "25 points (5 MINOR FOULS)",
      "30 points (6 MINOR FOULS)"
    ],
    "correct_answer": 1,
    "explanation": "1 initial MINOR FOUL + 3 additional (10 seconds ÷ 3 = 3.33, rounds down to 3) = 4 MINOR FOULS × 5 points = 20 points per Section 10.6.4.",
    "difficulty": 7,
    "category": "Penalties",
    "season": "2025-2026",
    "tags": ["penalties", "time-based", "calculation"],
    "source_page": "Section 10.6.4",
    "confidence": 10
  },
  {
    "section": "Section 9.3",
    "rule_name": "BASE ZONE Dimensions",
    "question": "What are the dimensions of the BASE ZONE?",
    "options": [
      "12 in. × 12 in.",
      "18 in. × 18 in. ± 0.125 in.",
      "24 in. × 24 in.",
      "30 in. × 30 in."
    ],
    "correct_answer": 1,
    "explanation": "The BASE ZONE is 18 in. +/- 0.125 in. (45.70 cm +/- 0.30 cm) wide by 18 in. +/- 0.125 in. deep per Section 9.3.",
    "difficulty": 4,
    "category": "Field Setup",
    "season": "2025-2026",
    "tags": ["base zone", "dimensions", "field"],
    "source_page": "Section 9.3",
    "confidence": 10
  },
  {
    "section": "Section 10.2",
    "rule_name": "DRIVER Requirements",
    "question": "What is the maximum number of DRIVERS allowed on a DRIVE TEAM?",
    "options": [
      "1 DRIVER",
      "2 DRIVERS",
      "3 DRIVERS",
      "4 DRIVERS"
    ],
    "correct_answer": 2,
    "explanation": "A DRIVE TEAM can have up to 3 DRIVERS according to Table 10-1 in Section 10.2.",
    "difficulty": 3,
    "category": "Game Rules",
    "season": "2025-2026",
    "tags": ["drive team", "drivers", "team composition"],
    "source_page": "Section 10.2",
    "confidence": 10
  },
  {
    "section": "Section 10.5.2",
    "rule_name": "PATTERN Point Value",
    "question": "How many points is each correctly matched ARTIFACT in the PATTERN worth during TELEOP?",
    "options": [
      "1 point",
      "2 points",
      "3 points",
      "5 points"
    ],
    "correct_answer": 1,
    "explanation": "Each CLASSIFIED ARTIFACT that matches the MOTIF position scores 2 points during both AUTO and TELEOP per Table 10-2.",
    "difficulty": 3,
    "category": "Scoring",
    "season": "2025-2026",
    "tags": ["pattern", "scoring", "points"],
    "source_page": "Section 10.5.2",
    "confidence": 10
  },
  {
    "section": "Section 9.7",
    "rule_name": "GOAL Top Height",
    "question": "What is the height of the GOAL's top lip from the TILE surface?",
    "options": [
      "32.75 inches",
      "36.75 inches",
      "38.75 inches",
      "42.75 inches"
    ],
    "correct_answer": 2,
    "explanation": "The top lip of the GOAL is 38.75 in. (98.45 cm) from the surface of the TILE according to Section 9.7.",
    "difficulty": 4,
    "category": "Field Setup",
    "season": "2025-2026",
    "tags": ["goal", "height", "dimensions"],
    "source_page": "Section 9.7",
    "confidence": 10
  },
  {
    "section": "Section 10.6.3",
    "rule_name": "Playoff YELLOW CARDS",
    "question": "During Playoff matches, if one team on an ALLIANCE receives a YELLOW CARD, who is affected?",
    "options": [
      "Only the violating team",
      "The entire ALLIANCE",
      "The opposing ALLIANCE",
      "Only the team's next match"
    ],
    "correct_answer": 1,
    "explanation": "During Playoff MATCHES, YELLOW and RED CARDS are assigned to the entire ALLIANCE, not just the violating team per Section 10.6.3.",
    "difficulty": 5,
    "category": "Penalties",
    "season": "2025-2026",
    "tags": ["playoffs", "yellow card", "alliance"],
    "source_page": "Section 10.6.3",
    "confidence": 10
  },
  {
    "section": "Section 10.5.1",
    "rule_name": "OVERFLOW Path",
    "question": "An ARTIFACT enters the GOAL, exits under the archway, passes through the SQUARE, but rolls over 2 ARTIFACTS already on the RAMP. How is it scored?",
    "options": [
      "Not scored (0 points)",
      "OVERFLOW (1 point)",
      "CLASSIFIED (3 points)",
      "Double OVERFLOW (2 points)"
    ],
    "correct_answer": 1,
    "explanation": "ARTIFACTS that pass through the SQUARE but roll over other ARTIFACTS on the RAMP are OVERFLOW worth 1 point per Section 10.5.1.",
    "difficulty": 5,
    "category": "Scoring",
    "season": "2025-2026",
    "tags": ["overflow", "scoring", "classifier"],
    "source_page": "Section 10.5.1",
    "confidence": 10
  },
  {
    "section": "Section 10.3.1",
    "rule_name": "SPIKE MARK Arrangement",
    "question": "What is the MOTIF arrangement on the Near (audience side) SPIKE MARK?",
    "options": [
      "PPG",
      "PGP",
      "GPP",
      "GGP"
    ],
    "correct_answer": 2,
    "explanation": "The Near (audience side) SPIKE MARK has ARTIFACTS arranged as GPP according to Section 10.3.1.",
    "difficulty": 4,
    "category": "Field Setup",
    "season": "2025-2026",
    "tags": ["spike mark", "setup", "motif"],
    "source_page": "Section 10.3.1",
    "confidence": 10
  },
  {
    "section": "Section 10.5.4",
    "rule_name": "Partially Returned BASE",
    "question": "How many points does a ROBOT earn for being partially returned to BASE?",
    "options": [
      "3 points",
      "5 points",
      "8 points",
      "10 points"
    ],
    "correct_answer": 1,
    "explanation": "A ROBOT partially returned to BASE earns 5 points according to Table 10-2.",
    "difficulty": 2,
    "category": "Scoring",
    "season": "2025-2026",
    "tags": ["base", "endgame", "scoring"],
    "source_page": "Section 10.5.4",
    "confidence": 10
  },
  {
    "section": "Section 9.3",
    "rule_name": "LOADING ZONE Dimensions",
    "question": "What are the approximate dimensions of each LOADING ZONE?",
    "options": [
      "18 in. × 18 in.",
      "20 in. × 20 in.",
      "23 in. × 23 in.",
      "26 in. × 26 in."
    ],
    "correct_answer": 2,
    "explanation": "The LOADING ZONE is approximately 23 in. (58.40 cm) wide by 23 in. (58.40 cm) deep per Section 9.3.",
    "difficulty": 4,
    "category": "Field Setup",
    "season": "2025-2026",
    "tags": ["loading zone", "dimensions", "field"],
    "source_page": "Section 9.3",
    "confidence": 10
  },
  {
    "section": "Section 10.7",
    "rule_name": "Head REFEREE Authority",
    "question": "Can the Head REFEREE review video footage to make or change a ruling?",
    "options": [
      "Yes, if requested by both ALLIANCES",
      "Yes, but only for scoring disputes",
      "Yes, but only for safety violations",
      "No, under no circumstances"
    ],
    "correct_answer": 3,
    "explanation": "No event staff, including the Head REFEREE, will review video, photos, or any media from any source under any circumstances per Section 10.7.",
    "difficulty": 4,
    "category": "Game Rules",
    "season": "2025-2026",
    "tags": ["referee", "video review", "rulings"],
    "source_page": "Section 10.7",
    "confidence": 10
  },
  {
    "section": "Section 10.2",
    "rule_name": "STUDENT Definition",
    "question": "According to the rules, when is the cutoff date for determining STUDENT status?",
    "options": [
      "January 1st of the current season",
      "September 1st of the current season",
      "December 31st of the previous year",
      "June 1st of the current season"
    ],
    "correct_answer": 1,
    "explanation": "A STUDENT is someone who has not completed high school as of September 1st of the current season per Section 10.2.",
    "difficulty": 3,
    "category": "Game Rules",
    "season": "2025-2026",
    "tags": ["student", "eligibility", "drive team"],
    "source_page": "Section 10.2",
    "confidence": 10
  },
  {
    "section": "Section 9.12",
    "rule_name": "Audio Cues",
    "question": "What audio cue indicates the start of a MATCH?",
    "options": [
      "3 Bells",
      "Buzzer × 3",
      "Cavalry Charge",
      "Train Whistle"
    ],
    "correct_answer": 2,
    "explanation": "The 'Cavalry Charge' audio cue plays at MATCH start (2:30) according to Table 9-1.",
    "difficulty": 3,
    "category": "Game Rules",
    "season": "2025-2026",
    "tags": ["audio cues", "match timing", "signals"],
    "source_page": "Section 9.12",
    "confidence": 10
  },
  {
    "section": "Section 9.12",
    "rule_name": "TELEOP Start Signal",
    "question": "What audio cue signals the beginning of TELEOP?",
    "options": [
      "Foghorn",
      "3 Bells",
      "Train Whistle",
      "3-second Buzzer"
    ],
    "correct_answer": 1,
    "explanation": "3 Bells signal the beginning of TELEOP at the 2:00 mark per Table 9-1.",
    "difficulty": 3,
    "category": "Game Rules",
    "season": "2025-2026",
    "tags": ["audio cues", "teleop", "match timing"],
    "source_page": "Section 9.12",
    "confidence": 10
  },
  {
    "section": "Section 10.5.3",
    "rule_name": "BASE Support Scenario",
    "question": "A ROBOT is completely inside the BASE ZONE but is supported by another ROBOT that is partially outside. Does it qualify as fully returned?",
    "options": [
      "Yes, fully returned (10 points)",
      "No, partially returned (5 points)",
      "No, not returned (0 points)",
      "Penalty for illegal support"
    ],
    "correct_answer": 0,
    "explanation": "Support can come transitively through other items including ROBOTS. If all support originates from the TILE in the BASE ZONE, it's fully returned per Section 10.5.3.",
    "difficulty": 7,
    "category": "Scoring",
    "season": "2025-2026",
    "tags": ["base", "support", "endgame scenario"],
    "source_page": "Section 10.5.3",
    "confidence": 10
  },
  {
    "section": "Section 10.3.1",
    "rule_name": "ALLIANCE AREA ARTIFACTS",
    "question": "How many ARTIFACTS are staged in each ALLIANCE AREA before the match?",
    "options": [
      "3 ARTIFACTS (2P, 1G)",
      "6 ARTIFACTS (4P, 2G)",
      "9 ARTIFACTS (6P, 3G)",
      "12 ARTIFACTS (8P, 4G)"
    ],
    "correct_answer": 1,
    "explanation": "6 ARTIFACTS (4 purple, 2 green) are staged in each ALLIANCE AREA according to Section 10.3.1.",
    "difficulty": 3,
    "category": "Field Setup",
    "season": "2025-2026",
    "tags": ["setup", "artifacts", "alliance area"],
    "source_page": "Section 10.3.1",
    "confidence": 10
  },
  {
    "section": "Section 10.5.3",
    "rule_name": "MOVEMENT RP Threshold",
    "question": "For non-championship events, what is the minimum combined LEAVE + BASE points needed for the MOVEMENT RP?",
    "options": [
      "13 points",
      "16 points",
      "21 points",
      "24 points"
    ],
    "correct_answer": 1,
    "explanation": "The MOVEMENT RP threshold for all other events (non-championship) is 16 points according to Table 10-3.",
    "difficulty": 4,
    "category": "Scoring",
    "season": "2025-2026",
    "tags": ["ranking points", "movement", "threshold"],
    "source_page": "Section 10.5.3",
    "confidence": 10
  },
  {
    "section": "Section 10.5.3",
    "rule_name": "PATTERN RP Threshold",
    "question": "What is the PATTERN RP threshold for non-championship events?",
    "options": [
      "12 points",
      "15 points",
      "18 points",
      "21 points"
    ],
    "correct_answer": 2,
    "explanation": "The PATTERN RP threshold for all other events is 18 points per Table 10-3.",
    "difficulty": 4,
    "category": "Scoring",
    "season": "2025-2026",
    "tags": ["ranking points", "pattern", "threshold"],
    "source_page": "Section 10.5.3",
    "confidence": 10
  },
  {
    "section": "Section 10.5.4",
    "rule_name": "Maximum BASE Score",
    "question": "What is the maximum possible BASE score for one ALLIANCE (both ROBOTS fully returned)?",
    "options": [
      "20 points",
      "25 points",
      "30 points",
      "35 points"
    ],
    "correct_answer": 2,
    "explanation": "2 ROBOTS fully returned = 10 + 10 = 20 points, plus 10 point bonus for both = 30 total points per Table 10-2.",
    "difficulty": 5,
    "category": "Scoring",
    "season": "2025-2026",
    "tags": ["base", "scoring", "calculation"],
    "source_page": "Section 10.5.4",
    "confidence": 10
  },
  {
    "section": "Section 9.8.2",
    "rule_name": "RAMP Overflow Behavior",
    "question": "What happens when a 10th ARTIFACT is successfully launched into a full RAMP?",
    "options": [
      "It becomes CLASSIFIED and pushes another out",
      "It becomes OVERFLOW",
      "It doesn't score at all",
      "The match is paused to clear the RAMP"
    ],
    "correct_answer": 1,
    "explanation": "When the RAMP already has 9 CLASSIFIED ARTIFACTS, newly entered ARTIFACTS will OVERFLOW per Section 9.8.2.",
    "difficulty": 4,
    "category": "Scoring",
    "season": "2025-2026",
    "tags": ["ramp", "overflow", "classifier"],
    "source_page": "Section 9.8.2",
    "confidence": 10
  },
  {
    "section": "Section 10.6.1",
    "rule_name": "YELLOW CARD Persistence",
    "question": "When are YELLOW CARDS cleared during an event?",
    "options": [
      "After each match",
      "At the end of each day",
      "At the conclusion of Practice, Qualification, and division Playoff MATCHES",
      "They are never cleared"
    ],
    "correct_answer": 2,
    "explanation": "All YELLOW CARDS are cleared at the conclusion of Practice, Qualification, and division Playoff MATCHES per Section 10.6.1.",
    "difficulty": 5,
    "category": "Penalties",
    "season": "2025-2026",
    "tags": ["yellow card", "penalties", "persistence"],
    "source_page": "Section 10.6.1",
    "confidence": 10
  },
  {
    "section": "Section 9.8.3",
    "rule_name": "GATE Closing Time",
    "question": "According to the manual, is the GATE not closing immediately when released considered an ARENA FAULT?",
    "options": [
      "Yes, always an ARENA FAULT",
      "No, not an ARENA FAULT",
      "Only if it takes more than 5 seconds",
      "Referee discretion"
    ],
    "correct_answer": 1,
    "explanation": "The GATE not closing immediately when released is NOT considered an ARENA FAULT per the note in Section 9.8.3.",
    "difficulty": 5,
    "category": "Field Setup",
    "season": "2025-2026",
    "tags": ["gate", "arena fault", "field mechanics"],
    "source_page": "Section 9.8.3",
    "confidence": 10
  },
  {
    "section": "Section 10.8",
    "rule_name": "SCORING ELEMENT Return",
    "question": "What happens to SCORING ELEMENTS that leave the FIELD during play?",
    "options": [
      "They are immediately replaced",
      "They remain out of play",
      "They are returned to the closest DRIVE TEAM member at the earliest safe opportunity",
      "They result in a penalty"
    ],
    "correct_answer": 2,
    "explanation": "SCORING ELEMENTS that leave the FIELD are returned to the closest DRIVE TEAM member at the earliest safe opportunity by FIELD STAFF per Section 10.8.",
    "difficulty": 4,
    "category": "Game Rules",
    "season": "2025-2026",
    "tags": ["scoring elements", "field", "game flow"],
    "source_page": "Section 10.8",
    "confidence": 10
  },
  {
    "section": "Section 10.5.2",
    "rule_name": "PATTERN Scoring Timing",
    "question": "When is TELEOP PATTERN scoring assessed?",
    "options": [
      "Immediately at the end of TELEOP",
      "During the match continuously",
      "When all ROBOTS and ARTIFACTS have come to rest following the match",
      "30 seconds after match end"
    ],
    "correct_answer": 2,
    "explanation": "TELEOP PATTERN scoring is assessed when all ROBOTS and ARTIFACTS have come to rest following the conclusion of the MATCH per Section 10.5.",
    "difficulty": 5,
    "category": "Scoring",
    "season": "2025-2026",
    "tags": ["pattern", "scoring", "timing"],
    "source_page": "Section 10.5.2",
    "confidence": 10
  },
  {
    "section": "Section 9.3",
    "rule_name": "GATE ZONE Dimensions",
    "question": "What are the dimensions of the GATE ZONE?",
    "options": [
      "2.75 in. wide by 10 in. long",
      "3.75 in. wide by 12 in. long",
      "4.75 in. wide by 14 in. long",
      "5.75 in. wide by 16 in. long"
    ],
    "correct_answer": 0,
    "explanation": "The GATE ZONE is 2.75 in. (7.00 cm) wide by 10 in. (25.40 cm) long according to Section 9.3.",
    "difficulty": 5,
    "category": "Field Setup",
    "season": "2025-2026",
    "tags": ["gate zone", "dimensions", "field"],
    "source_page": "Section 9.3",
    "confidence": 10
  },
  {
    "section": "Section 10.5.1",
    "rule_name": "DEPOT Contact Scoring",
    "question": "An ARTIFACT is in the DEPOT but touching a ROBOT at match end. Does it score?",
    "options": [
      "No, contact nullifies the score",
      "Yes, it still scores for the DEPOT owner",
      "Only if the ROBOT belongs to the DEPOT owner",
      "Referee discretion"
    ],
    "correct_answer": 1,
    "explanation": "An ARTIFACT over a DEPOT in contact with a ROBOT from either ALLIANCE still qualifies for DEPOT points per the note in Section 10.5.1.",
    "difficulty": 6,
    "category": "Scoring",
    "season": "2025-2026",
    "tags": ["depot", "scoring", "robot contact"],
    "source_page": "Section 10.5.1",
    "confidence": 10
  },
  {
    "section": "Section 9.3",
    "rule_name": "SECRET TUNNEL ZONE",
    "question": "What is the approximate length of the SECRET TUNNEL ZONE?",
    "options": [
      "36.5 inches",
      "42.5 inches",
      "46.5 inches",
      "52.5 inches"
    ],
    "correct_answer": 2,
    "explanation": "The SECRET TUNNEL ZONE is approximately 46.5 in. (118.10 cm) long per Section 9.3.",
    "difficulty": 5,
    "category": "Field Setup",
    "season": "2025-2026",
    "tags": ["secret tunnel", "dimensions", "field"],
    "source_page": "Section 9.3",
    "confidence": 10
  },
  {
    "section": "Section 10.5.4",
    "rule_name": "AUTO Scoring Calculation",
    "question": "During AUTO, an ALLIANCE scores 2 CLASSIFIED ARTIFACTS and both ROBOTS LEAVE. What's their AUTO score?",
    "options": [
      "9 points",
      "10 points",
      "12 points",
      "15 points"
    ],
    "correct_answer": 2,
    "explanation": "2 CLASSIFIED × 3 points = 6 points, plus 2 ROBOTS LEAVING × 3 points = 6 points, total = 12 points.",
    "difficulty": 5,
    "category": "Scoring",
    "season": "2025-2026",
    "tags": ["auto", "scoring", "calculation"],
    "source_page": "Section 10.5.4",
    "confidence": 10
  },
  {
    "section": "Section 9.10",
    "rule_name": "OBELISK AprilTags",
    "question": "Which AprilTag IDs are located on the OBELISK faces?",
    "options": [
      "20, 24, 25",
      "21, 22, 23",
      "19, 20, 21",
      "22, 23, 24"
    ],
    "correct_answer": 1,
    "explanation": "AprilTags with IDs 21, 22, and 23 are located on each rectangular face of the OBELISK per Section 9.10.",
    "difficulty": 4,
    "category": "Field Setup",
    "season": "2025-2026",
    "tags": ["apriltag", "obelisk", "identification"],
    "source_page": "Section 9.10",
    "confidence": 10
  },
  {
    "section": "Section 10.3.1",
    "rule_name": "Pre-load Contact",
    "question": "What is required for pre-loaded ARTIFACTS on a ROBOT?",
    "options": [
      "They must be inside the ROBOT",
      "They must be in direct contact with the ROBOT",
      "They must be secured with a mechanism",
      "They must be from the opponent's ALLIANCE AREA"
    ],
    "correct_answer": 1,
    "explanation": "Pre-loaded ARTIFACTS must be in direct contact with the ROBOT according to Section 10.3.1.",
    "difficulty": 4,
    "category": "Game Rules",
    "season": "2025-2026",
    "tags": ["preload", "setup", "artifacts"],
    "source_page": "Section 10.3.1",
    "confidence": 10
  },
  {
    "section": "Section 10.1",
    "rule_name": "TELEOP Duration",
    "question": "How long does the TELEOP period last?",
    "options": [
      "1 minute 30 seconds",
      "2 minutes",
      "2 minutes 30 seconds",
      "3 minutes"
    ],
    "correct_answer": 1,
    "explanation": "The TELEOP period is 2 minutes (2:00) long as stated in Section 10.1.",
    "difficulty": 1,
    "category": "Game Rules",
    "season": "2025-2026",
    "tags": ["teleop", "timing", "match"],
    "source_page": "Section 10.1",
    "confidence": 10
  },
  {
    "section": "Section 10.5.2",
    "rule_name": "PATTERN Index Matching",
    "question": "For MOTIF PGP, what color ARTIFACT must be in position 5 on the RAMP to score PATTERN points?",
    "options": [
      "Purple",
      "Green",
      "Either color",
      "Depends on ALLIANCE color"
    ],
    "correct_answer": 1,
    "explanation": "For PGP motif repeated, position 5 would be the middle of the second repetition, which is Green per Figure 10-4.",
    "difficulty": 6,
    "category": "Scoring",
    "season": "2025-2026",
    "tags": ["pattern", "motif", "scoring calculation"],
    "source_page": "Section 10.5.2",
    "confidence": 10
  },
  {
    "section": "Section 9.12",
    "rule_name": "Final Countdown Signal",
    "question": "At what time remaining does the 'Train Whistle' sound?",
    "options": [
      "30 seconds",
      "20 seconds",
      "10 seconds",
      "5 seconds"
    ],
    "correct_answer": 1,
    "explanation": "The Train Whistle sounds at 0:20 (20 seconds remaining) according to Table 9-1.",
    "difficulty": 3,
    "category": "Game Rules",
    "season": "2025-2026",
    "tags": ["audio cues", "timing", "endgame"],
    "source_page": "Section 9.12",
    "confidence": 10
  },
  {
    "section": "Section 10.6",
    "rule_name": "RED CARD Result",
    "question": "What happens when a team receives a RED CARD in a Qualification match?",
    "options": [
      "They receive half points for the match",
      "They receive 0 MATCH points and 0 RANKING POINTS",
      "They are removed from the event",
      "They receive a 50 point penalty"
    ],
    "correct_answer": 1,
    "explanation": "A RED CARD results in DISQUALIFICATION, meaning 0 MATCH points and 0 RANKING POINTS in a Qualification match per Table 10-4.",
    "difficulty": 4,
    "category": "Penalties",
    "season": "2025-2026",
    "tags": ["red card", "disqualification", "penalties"],
    "source_page": "Section 10.6",
    "confidence": 10
  },
  {
  "section": "Section 11.4.4, G420",
  "rule_name": "Combat Robotics Violation",
  "question": "During a match, the red alliance robot extends its arm to grab a scoring element but accidentally drives forward, causing the arm to penetrate inside the blue robot's chassis and disconnect a wire. The blue robot can no longer move. What penalty should be assessed?",
  "options": [
    "MINOR FOUL to red",
    "MAJOR FOUL to red",
    "MAJOR FOUL and YELLOW CARD to red",
    "MAJOR FOUL and RED CARD to red"
  ],
  "correct_answer": 3,
  "explanation": "Per G420, initiating contact that functionally impairs an opponent robot inside their chassis results in MAJOR FOUL and YELLOW CARD. Since the opponent is unable to drive, it escalates to MAJOR FOUL and RED CARD.",
  "difficulty": 8,
  "category": "Penalties",
  "season": "2025-2026",
  "tags": ["combat", "damage", "penalties", "red card"],
  "source_page": "Section 11, Page 96",
  "confidence": 10
},
{
  "section": "Section 11.4.1, G402",
  "rule_name": "AUTO Interference",
  "question": "During AUTO, a red robot launches an artifact that misses their goal, bounces off the goal structure, rolls across to the blue side and disrupts 3 pre-staged artifacts. How many MAJOR FOULS should red receive?",
  "options": [
    "0 - no penalty since it was deflected",
    "1 MAJOR FOUL",
    "2 MAJOR FOULS",
    "3 MAJOR FOULS"
  ],
  "correct_answer": 0,
  "explanation": "Per G402 Example 2, launched artifacts that are deflected by field elements and then disrupt opponent's artifacts are not penalized, as this was not a direct launch at opponent artifacts.",
  "difficulty": 9,
  "category": "AUTO Rules",
  "season": "2025-2026",
  "tags": ["auto", "interference", "deflection", "artifacts"],
  "source_page": "Section 11, Page 91",
  "confidence": 10
},
{
  "section": "Section 11.4.5, G422",
  "rule_name": "PIN Duration",
  "question": "Blue robot pins red robot against the field wall. After 2 seconds, blue backs away 2.5 feet. Red doesn't move. After 4 seconds of separation, blue approaches and pins red again for 2 more seconds. What penalties are assessed?",
  "options": [
    "No penalty - PIN was legally broken",
    "1 MINOR FOUL for exceeding 3 seconds total",
    "2 MINOR FOULS for 6 seconds of pinning",
    "MAJOR FOUL for continuous pinning"
  ],
  "correct_answer": 0,
  "explanation": "Per G422, the PIN count ends when robots separate by 2+ feet for more than 3 seconds. Since they were separated for 4 seconds, the PIN count reset and the second PIN was a new count under 3 seconds.",
  "difficulty": 9,
  "category": "Robot Interaction",
  "season": "2025-2026",
  "tags": ["pinning", "separation", "timing", "reset"],
  "source_page": "Section 11, Page 97",
  "confidence": 10
},
{
  "section": "Section 11.4.3, G408",
  "rule_name": "Control Limits",
  "question": "A robot is carrying 3 artifacts in its hopper. While driving, it accidentally bulldozes through 2 artifacts on the ground, and an opponent's launched artifact bounces off its bumper. How many artifacts is it controlling?",
  "options": [
    "3 - only the ones in the hopper",
    "5 - hopper plus bulldozed ones",
    "6 - all artifacts it touched",
    "4 - hopper plus one bulldozed"
  ],
  "correct_answer": 0,
  "explanation": "Per G408, bulldozing (inadvertent contact while moving) and deflecting (being hit by artifacts) are explicitly not considered CONTROL. Only the 3 artifacts in the hopper count.",
  "difficulty": 8,
  "category": "Scoring Elements",
  "season": "2025-2026",
  "tags": ["control", "bulldozing", "artifacts", "limits"],
  "source_page": "Section 11, Page 93",
  "confidence": 10
},
{
  "section": "Section 11.4.4, G415",
  "rule_name": "Vertical Expansion Timing",
  "question": "With 25 seconds left in the match, a robot in the launch zone extends to 35 inches tall to score. With 19 seconds left, it moves out of the launch zone while still extended. What happens?",
  "options": [
    "No penalty - it was legal when extended",
    "MINOR FOUL - exceeded height limit outside launch zone",
    "MAJOR FOUL - strategic benefit from over-expansion",
    "DISABLED - dangerous configuration"
  ],
  "correct_answer": 2,
  "explanation": "Per G415, robots can only extend above 18 inches during the final 20 seconds AND when not in launch zones. At 19 seconds, it violated both conditions while gaining scoring advantage, resulting in MAJOR FOUL.",
  "difficulty": 9,
  "category": "Robot Rules",
  "season": "2025-2026",
  "tags": ["expansion", "height", "timing", "launch zone"],
  "source_page": "Section 11, Page 95",
  "confidence": 10
},
{
  "section": "Section 11.4.5, G424",
  "rule_name": "Gate Zone Protection",
  "question": "Red robot is in blue's gate zone operating the gate. Blue robot is in their own secret tunnel zone which overlaps with their gate zone. Red makes contact with blue. What penalty?",
  "options": [
    "MINOR FOUL to red per G424",
    "MINOR FOUL to blue per G425",
    "No penalty - exception applies",
    "MINOR FOUL to both teams"
  ],
  "correct_answer": 2,
  "explanation": "Per G424.A exception, a robot in their own alliance's gate zone AND in opponent's secret tunnel zone is not protected under G424. G425 would apply instead if red was in blue's secret tunnel.",
  "difficulty": 10,
  "category": "Protected Zones",
  "season": "2025-2026",
  "tags": ["gate zone", "secret tunnel", "exceptions", "contact"],
  "source_page": "Section 11, Page 98",
  "confidence": 10
},
{
  "section": "Section 11.4.2, G403",
  "rule_name": "AUTO to TELEOP Transition",
  "question": "A robot's AUTO program ends with the arm moving upward. Due to momentum, the arm continues moving for 0.5 seconds into the transition period before stopping. The team then presses INIT for TELEOP, causing a motor to twitch. What penalties?",
  "options": [
    "No penalty for momentum, MAJOR FOUL for twitch",
    "MAJOR FOUL for each movement",
    "No penalties - both are allowed",
    "Warning for momentum, MAJOR FOUL for twitch"
  ],
  "correct_answer": 0,
  "explanation": "Per G403, movement from inertia after AUTO ends is not a violation. However, if INIT causes actuator movement during transition, it violates G403 and receives a MAJOR FOUL.",
  "difficulty": 8,
  "category": "Match Phases",
  "season": "2025-2026",
  "tags": ["transition", "auto", "teleop", "movement"],
  "source_page": "Section 11, Page 92",
  "confidence": 10
},
{
  "section": "Section 11.3, G301",
  "rule_name": "Match Delays",
  "question": "In playoffs, a team's previous match ended at 2:00 PM. Their next match is scheduled for 2:06 PM. At 2:08 PM, they arrive at the field and begin setting up. The head referee starts a timer at 2:09 PM. What happens at 2:11 PM if they're still not ready?",
  "options": [
    "MINOR FOUL",
    "MAJOR FOUL",
    "DISABLED",
    "No penalty - still within grace period"
  ],
  "correct_answer": 2,
  "explanation": "Per G301, in playoffs after verbal warning/major foul is issued, teams have 2 minutes to become match ready. At 2:11 PM (2 minutes after 2:09 PM timer start), the robot is DISABLED.",
  "difficulty": 9,
  "category": "Pre-Match",
  "season": "2025-2026",
  "tags": ["delays", "playoffs", "timing", "disabled"],
  "source_page": "Section 11, Page 87",
  "confidence": 10
},
{
  "section": "Section 11.4.5, G421",
  "rule_name": "Tipping Violation",
  "question": "Blue robot has fallen over and is attempting to right itself using its arm against the ground. Red robot, trying to grab a nearby artifact, makes frame contact with blue causing it to tip back over. Red immediately backs away. What penalty?",
  "options": [
    "No penalty - unintentional contact",
    "MAJOR FOUL and YELLOW CARD",
    "MAJOR FOUL only",
    "MAJOR FOUL and RED CARD"
  ],
  "correct_answer": 1,
  "explanation": "Per G421 example B, making frame contact with a robot attempting to right itself and causing it to fall is a violation, resulting in MAJOR FOUL and YELLOW CARD even if not continuous.",
  "difficulty": 8,
  "category": "Robot Interaction",
  "season": "2025-2026",
  "tags": ["tipping", "contact", "yellow card", "righting"],
  "source_page": "Section 11, Page 97",
  "confidence": 10
},
{
  "section": "Section 11.4.3, G406",
  "rule_name": "Artifact Ejection",
  "question": "During a heated match, red robot rapidly spins to change direction, and its extended mechanism flings 2 artifacts completely out of the field. One was intentional to clear space, one was accidental. What penalty?",
  "options": [
    "2 MAJOR FOULS - one per artifact",
    "1 MAJOR FOUL - only for intentional",
    "2 MINOR FOULS",
    "1 MAJOR FOUL and 1 warning"
  ],
  "correct_answer": 1,
  "explanation": "Per G406, only intentionally ejecting artifacts from the field results in a MAJOR FOUL per artifact. Accidental ejections during normal gameplay are not penalized.",
  "difficulty": 7,
  "category": "Scoring Elements",
  "season": "2025-2026",
  "tags": ["ejection", "artifacts", "intentional", "field"],
  "source_page": "Section 11, Page 93",
  "confidence": 10
},
{
  "section": "Section 11.4.4, G416",
  "rule_name": "Launch Zone Requirement",
  "question": "A robot straddles the launch line with its back wheels inside the launch zone and front wheels outside. It launches 3 artifacts, 2 of which enter the goal. What penalty?",
  "options": [
    "No penalty - overlapping line is legal",
    "3 MINOR FOULS",
    "2 MAJOR FOULS, 1 MINOR FOUL",
    "3 MAJOR FOULS"
  ],
  "correct_answer": 2,
  "explanation": "Per G416, robots may launch when overlapping a launch line. This is legal, but scoring in the goal from outside the zone would result in 2 MAJOR FOULS for the scored artifacts, 1 MINOR for the miss.",
  "difficulty": 9,
  "category": "Scoring",
  "season": "2025-2026",
  "tags": ["launching", "launch zone", "overlap", "scoring"],
  "source_page": "Section 11, Page 95",
  "confidence": 9
},
{
  "section": "Section 11.4.5, G423",
  "rule_name": "Shutting Down Gameplay",
  "question": "Blue robot parks directly in front of red's gate for 5 seconds, completely blocking access. After backing away for 2 seconds, it returns to block for another 4 seconds. How many MINOR FOULS?",
  "options": [
    "1 MINOR FOUL",
    "2 MINOR FOULS",
    "3 MINOR FOULS",
    "4 MINOR FOULS"
  ],
  "correct_answer": 2,
  "explanation": "Per G423, blocking major gameplay elements results in MINOR FOUL plus additional MINOR every 3 seconds. First block: 1 MINOR (0-3 sec) + 1 MINOR (3-5 sec). Second block: 1 MINOR (0-3 sec). Total: 3 MINOR FOULS.",
  "difficulty": 8,
  "category": "Strategic Violations",
  "season": "2025-2026",
  "tags": ["blocking", "gate", "timing", "fouls"],
  "source_page": "Section 11, Page 98",
  "confidence": 10
},
{
  "section": "Section 11.4.4, G417",
  "rule_name": "Opponent Gate Contact",
  "question": "Red robot launches an artifact that bounces off the field wall and rolls into blue's gate mechanism. Blue's gate jams and cannot open for the rest of the match. What happens?",
  "options": [
    "MAJOR FOUL to red only",
    "MAJOR FOUL to red and blue gets PATTERN RP",
    "No penalty - indirect contact",
    "YELLOW CARD to red for damage"
  ],
  "correct_answer": 1,
  "explanation": "Per G417, robots may not contact opposing alliance's gate directly or transitively through a scoring element. Violation results in MAJOR FOUL and opposing alliance is awarded the PATTERN RP.",
  "difficulty": 7,
  "category": "Gate Rules",
  "season": "2025-2026",
  "tags": ["gate", "contact", "pattern", "RP"],
  "source_page": "Section 11, Page 95",
  "confidence": 10
},
{
  "section": "Section 11.4.1, G401",
  "rule_name": "AUTO Interaction",
  "question": "During randomization, a team member notices their robot is misaligned. They reach over and adjust the robot's position. The match then starts and the robot launches an artifact into the goal during AUTO. What happens?",
  "options": [
    "MINOR FOUL only",
    "MAJOR FOUL only",
    "MAJOR FOUL and no AUTO PATTERN points",
    "Match doesn't start until fixed"
  ],
  "correct_answer": 2,
  "explanation": "Per G401, interacting with robot after randomization begins results in MAJOR FOUL plus alliance is not eligible for PATTERN points in AUTO if robot launches artifact that enters goal before end of AUTO.",
  "difficulty": 8,
  "category": "AUTO Rules",
  "season": "2025-2026",
  "tags": ["auto", "interaction", "pattern", "launching"],
  "source_page": "Section 11, Page 91",
  "confidence": 10
},
{
  "section": "Section 11.4.5, G427",
  "rule_name": "Base Zone End Game",
  "question": "With 15 seconds left, red robot enters blue's base zone to grab artifacts. Blue robot enters to defend and makes contact with red. What penalty and scoring outcome?",
  "options": [
    "MINOR FOUL to blue",
    "MAJOR FOUL to blue, red awarded base points",
    "No penalty - not in final 20 seconds",
    "MAJOR FOUL to red for entering base zone"
  ],
  "correct_answer": 1,
  "explanation": "Per G427, during last 20 seconds, contact with opponent in their base zone results in MAJOR FOUL and opponent is awarded fully returned to BASE points regardless of actual position.",
  "difficulty": 8,
  "category": "End Game",
  "season": "2025-2026",
  "tags": ["base zone", "end game", "contact", "scoring"],
  "source_page": "Section 11, Page 100",
  "confidence": 10
},
{
  "section": "Section 11.4.3, G407",
  "rule_name": "Damaging Scoring Elements",
  "question": "A robot with sharp edges repeatedly gouges artifacts while collecting them. After a verbal warning in match 3, it continues damaging artifacts in match 5. The head referee observes likely continued damage. What happens?",
  "options": [
    "MAJOR FOUL only",
    "MAJOR FOUL and DISABLED",
    "DISABLED only",
    "RED CARD"
  ],
  "correct_answer": 1,
  "explanation": "Per G407, after verbal warning, repeated damage results in MAJOR FOUL. If head referee determines further damage is likely, robot is also DISABLED and corrective action required before competing again.",
  "difficulty": 7,
  "category": "Field Elements",
  "season": "2025-2026",
  "tags": ["damage", "artifacts", "disabled", "repeated"],
  "source_page": "Section 11, Page 93",
  "confidence": 10
},
{
  "section": "Section 11.4.4, G418",
  "rule_name": "Artifacts on Ramps",
  "question": "Blue robot is operating their gate when their mechanism accidentally brushes against 2 artifacts sitting on their own ramp. They quickly score in the goal. Later, they deliberately push an artifact off the opponent's ramp. Total penalties?",
  "options": [
    "No penalties - exception for gate operation",
    "1 MAJOR FOUL for opponent ramp",
    "2 MAJOR FOULS for own ramp",
    "3 MAJOR FOULS total"
  ],
  "correct_answer": 1,
  "explanation": "Per G418, inconsequential contact while operating gate is excepted. However, contacting artifacts on opponent's ramp (even their own) outside this exception is MAJOR FOUL per artifact. Only the opponent ramp contact counts.",
  "difficulty": 9,
  "category": "Ramp Rules",
  "season": "2025-2026",
  "tags": ["ramp", "artifacts", "gate", "exception"],
  "source_page": "Section 11, Page 96",
  "confidence": 10
},
{
  "section": "Section 11.4.4, G419",
  "rule_name": "Direct Ramp Scoring",
  "question": "Red robot attempts a difficult shot at the goal but intentionally aims low, causing the artifact to roll directly onto the ramp scoring position without entering the goal first. What penalty?",
  "options": [
    "No penalty if it scores",
    "MINOR FOUL",
    "MAJOR FOUL",
    "DISQUALIFICATION"
  ],
  "correct_answer": 2,
  "explanation": "Per G419, robots may not intentionally place or launch artifacts directly onto the ramp. The game intent is scoring through the goal top only. This violation is a MAJOR FOUL.",
  "difficulty": 7,
  "category": "Scoring",
  "season": "2025-2026",
  "tags": ["ramp", "scoring", "direct", "goal"],
  "source_page": "Section 11, Page 96",
  "confidence": 10
},
{
  "section": "Section 11.2, G211",
  "rule_name": "Egregious Violations",
  "question": "A robot pins an opponent for 18 seconds continuously despite referee warnings. The head referee has already issued standard G422 penalties. What additional action should be taken?",
  "options": [
    "Continue adding MINOR FOULS only",
    "MAJOR FOUL for excessive pinning",
    "YELLOW or RED CARD at head referee discretion",
    "Automatic DISQUALIFICATION"
  ],
  "correct_answer": 2,
  "explanation": "Per G211, a single PIN in excess of 15 seconds is listed as egregious behavior. Head referee may assign YELLOW or RED CARD for egregious violations beyond standard penalties.",
  "difficulty": 8,
  "category": "Egregious Behavior",
  "season": "2025-2026",
  "tags": ["pinning", "egregious", "card", "excessive"],
  "source_page": "Section 11, Page 86",
  "confidence": 10
},
{
  "section": "Section 11.4.5, G426",
  "rule_name": "Loading Zone Protection",
  "question": "Blue robot is completely in red's loading zone collecting artifacts. Red robot is outside but reaches its arm into the loading zone, making contact with blue robot through an artifact. What penalty?",
  "options": [
    "No penalty - red is outside zone",
    "MINOR FOUL to red",
    "MINOR FOUL to blue",
    "MAJOR FOUL to red"
  ],
  "correct_answer": 1,
  "explanation": "Per G426, contact with opponent while EITHER robot is in opponent's loading zone is prohibited, regardless of who initiates. Red made transitive contact through artifact while blue was in red's loading zone.",
  "difficulty": 8,
  "category": "Protected Zones",
  "season": "2025-2026",
  "tags": ["loading zone", "contact", "transitive", "protection"],
  "source_page": "Section 11, Page 100",
  "confidence": 10
},
{
  "section": "Section 11.3, G304",
  "rule_name": "Starting Configuration",
  "question": "At match start, blue robot is touching their goal, positioned over a launch line, but their alliance partner notices the robot's arm extends 2 inches beyond the field perimeter wall. What happens?",
  "options": [
    "Match starts with MINOR FOUL",
    "Match doesn't start - quick adjustment allowed",
    "DISABLED immediately",
    "Match starts with MAJOR FOUL"
  ],
  "correct_answer": 1,
  "explanation": "Per G304, robots must be fully contained within field perimeter. If there's a quick remedy, match won't start until fixed. If not quickly fixable, robot is DISABLED.",
  "difficulty": 7,
  "category": "Pre-Match",
  "season": "2025-2026",
  "tags": ["starting", "configuration", "perimeter", "setup"],
  "source_page": "Section 11, Page 89",
  "confidence": 10
},
{
  "section": "Section 11.4.4, G414",
  "rule_name": "Horizontal Expansion",
  "question": "A robot expands to 19 inches horizontally to block opponents, but gets hit and damaged, causing it to expand to 21 inches. It continues playing without using the over-expansion strategically. What penalty?",
  "options": [
    "MINOR FOUL",
    "MAJOR FOUL",
    "No penalty - damage exception",
    "DISABLED"
  ],
  "correct_answer": 2,
  "explanation": "Per G414 exception A, if over-expansion is due to damage and not used for strategic benefit, no penalty is assessed. Robot can continue playing as long as expansion isn't used strategically.",
  "difficulty": 8,
  "category": "Robot Rules",
  "season": "2025-2026",
  "tags": ["expansion", "damage", "exception", "horizontal"],
  "source_page": "Section 11, Page 95",
  "confidence": 10
},
{
  "section": "Section 11.4.3, G405",
  "rule_name": "Misuse of Scoring Elements",
  "question": "Red robot stacks 5 artifacts against blue's ramp to create a barrier, preventing blue from accessing their gate area. How many MAJOR FOULS?",
  "options": [
    "1 MAJOR FOUL",
    "5 MAJOR FOULS",
    "No penalty - strategic play",
    "YELLOW CARD only"
  ],
  "correct_answer": 1,
  "explanation": "Per G405, deliberately using scoring elements to impede opponent access to field elements results in MAJOR FOUL per scoring element. All 5 artifacts used as barriers = 5 MAJOR FOULS.",
  "difficulty": 7,
  "category": "Scoring Elements",
  "season": "2025-2026",
  "tags": ["artifacts", "blocking", "misuse", "impediment"],
  "source_page": "Section 11, Page 92",
  "confidence": 10
},
{
  "section": "Section 11.4.4, G410",
  "rule_name": "Robot Stop Command",
  "question": "A referee instructs a team to disable their robot due to safety concerns. The driver hesitates for 5 seconds while trying to score one more artifact, then stops. What penalty?",
  "options": [
    "VERBAL WARNING",
    "MINOR FOUL",
    "MAJOR FOUL",
    "MAJOR FOUL plus RED CARD"
  ],
  "correct_answer": 2,
  "explanation": "Per G410, teams must press stop when instructed by referee. Greater-than-momentary delay (5 seconds) results in MAJOR FOUL. If it had been continuous refusal, it would add RED CARD.",
  "difficulty": 7,
  "category": "Safety",
  "season": "2025-2026",
  "tags": ["disable", "safety", "stop", "delay"],
  "source_page": "Section 11, Page 94",
  "confidence": 10
},
{
  "section": "Section 11.4.2, G404",
  "rule_name": "End of TELEOP Movement",
  "question": "At the match end buzzer, a robot's arm is moving upward with momentum. It continues moving for 1 second, drops an artifact that rolls and enters the goal. The driver had already set down their controller. What penalty?",
  "options": [
    "No penalty - momentum allowed",
    "MINOR FOUL only",
    "MAJOR FOUL - artifact entered goal",
    "DISQUALIFICATION"
  ],
  "correct_answer": 2,
  "explanation": "Per G404, robots must have no powered movement after TELEOP ends. While momentum is allowed, if robot launches artifact that enters goal after match ends, it's a MAJOR FOUL regardless of intent.",
  "difficulty": 8,
  "category": "Match Phases",
  "season": "2025-2026",
  "tags": ["teleop", "end", "momentum", "scoring"],
  "source_page": "Section 11, Page 92",
  "confidence": 10
},
{
  "section": "Section 11.4.5, G425",
  "rule_name": "Secret Tunnel Zone",
  "question": "Blue robot is waiting in red's secret tunnel zone for artifacts. Red robot enters their own secret tunnel zone to collect artifacts and makes contact with blue. Who gets penalized?",
  "options": [
    "MINOR FOUL to red",
    "MINOR FOUL to blue",
    "No penalty - red can defend their zone",
    "MINOR FOUL to both"
  ],
  "correct_answer": 0,
  "explanation": "Per G425, robots may not contact opponents while in opponent's secret tunnel zone, regardless of who initiates. Red contacted blue while in blue's (the opponent's) secret tunnel zone.",
  "difficulty": 9,
  "category": "Protected Zones",
  "season": "2025-2026",
  "tags": ["secret tunnel", "contact", "zone", "defense"],
  "source_page": "Section 11, Page 99",
  "confidence": 10
},
{
  "section": "Section 11.4.4, G413",
  "rule_name": "Arena Interaction",
  "question": "While attempting to open their gate, a robot's mechanism accidentally grabs and holds the gate lever for 2 seconds before releasing. Later, it deliberately hangs from the goal structure momentarily. What penalties?",
  "options": [
    "No penalties - gate operation is allowed",
    "1 MAJOR FOUL for hanging",
    "1 MAJOR FOUL plus YELLOW CARD for hanging",
    "2 MAJOR FOULS"
  ],
  "correct_answer": 2,
  "explanation": "Per G413, grabbing gate mechanism even accidentally violates the rule. Deliberately hanging from goal structure is MAJOR FOUL plus YELLOW CARD if greater-than-momentary. Both actions penalized.",
  "difficulty": 8,
  "category": "Field Elements",
  "season": "2025-2026",
  "tags": ["arena", "grabbing", "gate", "hanging"],
  "source_page": "Section 11, Page 95",
  "confidence": 9
},
{
  "section": "Section 11.4.4, G409",
  "rule_name": "Robot Control",
  "question": "A robot wildly spins while holding 3 artifacts, flinging one into the audience area and hitting a spectator's leg. The referee immediately takes action. What happens?",
  "options": [
    "MINOR FOUL and continue play",
    "MAJOR FOUL only",
    "DISABLED and VERBAL WARNING",
    "DISABLED and YELLOW CARD if repeated"
  ],
  "correct_answer": 2,
  "explanation": "Per G409, robot or controlled elements contacting humans outside field results in DISABLED and VERBAL WARNING. First offense is verbal warning unless repeated or subsequent violations occur.",
  "difficulty": 7,
  "category": "Safety",
  "season": "2025-2026",
  "tags": ["control", "safety", "spectator", "disabled"],
  "source_page": "Section 11, Page 94",
  "confidence": 10
},
{
  "section": "Section 11.3, G303",
  "rule_name": "Match Readiness",
  "question": "During inspection before playoffs, LRI finds a robot's sharp edge that wasn't present in initial inspection. The team claims it's match-ready. What must happen?",
  "options": [
    "Match proceeds with warning",
    "Quick fix with tape allowed",
    "DISABLED and must re-inspect",
    "RED CARD for non-compliance"
  ],
  "correct_answer": 3,
  "explanation": "Per G303, if robot modified after inspection is not compliant with I305 and participates, it's a RED CARD. Robot must be compliant with all robot rules to be match-ready.",
  "difficulty": 8,
  "category": "Inspection",
  "season": "2025-2026",
  "tags": ["inspection", "compliance", "modification", "red card"],
  "source_page": "Section 11, Page 89",
  "confidence": 10
},
{
  "section": "Section 11.2, G210",
  "rule_name": "Forcing Rule Violations",
  "question": "Blue robot pushes red robot from 3 tiles away directly into blue's loading zone. Red had no reasonable way to avoid entering. What penalties are assessed?",
  "options": [
    "MINOR FOUL to red for entering",
    "MINOR FOUL to blue, nothing to red",
    "MAJOR FOUL to blue, nothing to red",
    "MINOR FOUL to both teams"
  ],
  "correct_answer": 2,
  "explanation": "Per G210 example B, pushing opponent from far away into your own protected zone is forcing a violation. Blue gets MAJOR FOUL for repeated/intentional forcing, red gets no penalty.",
  "difficulty": 9,
  "category": "Strategic Violations",
  "season": "2025-2026",
  "tags": ["forcing", "violations", "loading zone", "pushing"],
  "source_page": "Section 11, Page 86",
  "confidence": 10
},
{
  "section": "Section 11.4.4, G412",
  "rule_name": "Field Damage",
  "question": "A robot's sharp intake mechanism tears a tile during match 3. In match 5, the same mechanism damages another tile. The head referee believes more damage is likely. What happens?",
  "options": [
    "VERBAL WARNING only",
    "DISABLED only",
    "YELLOW CARD and continue playing",
    "DISABLED and YELLOW CARD"
  ],
  "correct_answer": 3,
  "explanation": "Per G412, first damage gets verbal warning. Subsequent damage during event gets YELLOW CARD. If head referee infers additional damage likely, robot is DISABLED. Both apply here.",
  "difficulty": 8,
  "category": "Field Elements",
  "season": "2025-2026",
  "tags": ["damage", "field", "tiles", "disabled"],
  "source_page": "Section 11, Page 94",
  "confidence": 10
},
{
  "section": "Section 11.2, G206",
  "rule_name": "Collusion for RPs",
  "question": "Blue and red alliances agree before the match that each will disrupt the other's gate in violation of G417, ensuring both alliances get the PATTERN RP. What happens when discovered?",
  "options": [
    "Match continues, no RPs awarded",
    "YELLOW CARD to both, no PATTERN or GOAL RPs",
    "RED CARD to both alliances",
    "DISQUALIFICATION of all teams"
  ],
  "correct_answer": 1,
  "explanation": "Per G206, teams colluding to purposefully violate rules for RPs receive YELLOW CARD and the alliance is ineligible for both PATTERN and GOAL RPs.",
  "difficulty": 7,
  "category": "Conduct",
  "season": "2025-2026",
  "tags": ["collusion", "ranking points", "yellow card", "pattern"],
  "source_page": "Section 11, Page 85",
  "confidence": 10
},
{
  "section": "Section 11.4.4, G411",
  "rule_name": "Robot Identification",
  "question": "During an intense match, both robot signs fall off a robot. The head referee cannot determine the team number or alliance color. This is the team's second occurrence this event after a verbal warning. What penalty?",
  "options": [
    "No penalty - signs fell naturally",
    "VERBAL WARNING again",
    "MINOR FOUL",
    "MAJOR FOUL"
  ],
  "correct_answer": 2,
  "explanation": "Per G411, if robot identification becomes indeterminate, first offense is verbal warning. Subsequent violations during the event result in MINOR FOUL.",
  "difficulty": 6,
  "category": "Robot Rules",
  "season": "2025-2026",
  "tags": ["identification", "signs", "alliance", "visibility"],
  "source_page": "Section 11, Page 94",
  "confidence": 10
},
{
  "section": "Section 11.3, G302",
  "rule_name": "Field Equipment",
  "question": "A team brings a 7-foot tall signaling device to help their human player. During the match, they use it to signal their robot. What happens?",
  "options": [
    "Legal - signaling devices allowed",
    "Match doesn't start until removed",
    "YELLOW CARD if used during match",
    "MINOR FOUL per use"
  ],
  "correct_answer": 2,
  "explanation": "Per G302.B, equipment cannot extend more than 6'6\" above tiles. If discovered or used inappropriately during match (after match starts), it results in YELLOW CARD.",
  "difficulty": 7,
  "category": "Pre-Match",
  "season": "2025-2026",
  "tags": ["equipment", "height", "signaling", "yellow card"],
  "source_page": "Section 11, Page 88",
  "confidence": 10
},
{
  "section": "Section 11.2, G203-G205",
  "rule_name": "Match Manipulation",
  "question": "Team A, ranked #1, tells their alliance partner Team B to not participate in their qualification match so Team C (ranked #3) doesn't gain ranking points. Team B agrees and doesn't play. What penalties?",
  "options": [
    "VERBAL WARNING to Team A only",
    "RED CARD to Team A, VERBAL WARNING to Team B",
    "VERBAL WARNING to both, RED CARD if repeated",
    "RED CARD to both teams immediately"
  ],
  "correct_answer": 2,
  "explanation": "Per G203/G204, first offense of match throwing/coercion is VERBAL WARNING to both teams. RED CARD for subsequent violations. Team A violated G203 (encouraging), Team B violated G204 (accepting).",
  "difficulty": 9,
  "category": "Conduct",
  "season": "2025-2026",
  "tags": ["throwing", "manipulation", "ranking", "coercion"],
  "source_page": "Section 11, Page 84-85",
  "confidence": 10
},
{
  "section": "Section 13.3, T301",
  "rule_name": "Match Replays",
  "question": "During a match, the field timer display fails completely. Red alliance was winning 45-30 when it failed. Red alliance requests a replay. What happens?",
  "options": [
    "No replay - score stands as is",
    "Automatic replay",
    "Replay only if head referee agrees it affected outcome",
    "Continue match without timer"
  ],
  "correct_answer": 2,
  "explanation": "Per T301, timer display failure is an arena fault, but replay only occurs if head referee determines it affected match outcome AND affected alliance requests it.",
  "difficulty": 8,
  "category": "Tournament",
  "season": "2025-2026",
  "tags": ["replay", "arena fault", "timer", "outcome"],
  "source_page": "Section 13, Page 138",
  "confidence": 10
},
{
  "section": "Section 11.3, G305",
  "rule_name": "OpMode Selection",
  "question": "A team doesn't have an AUTO program but still needs to comply with match start procedures. They select their TELEOP OpMode and try to start the match. What happens?",
  "options": [
    "Match starts normally",
    "Match won't start - must select AUTO",
    "DISABLED for non-compliance",
    "MINOR FOUL but match continues"
  ],
  "correct_answer": 1,
  "explanation": "Per G305, teams must select and INIT an OpMode. If AUTO OpMode selected, 30-second timer must be enabled. Teams without AUTO should create default AUTO OpMode for compliance.",
  "difficulty": 7,
  "category": "Pre-Match",
  "season": "2025-2026",
  "tags": ["OpMode", "AUTO", "initialization", "match start"],
  "source_page": "Section 11, Page 90",
  "confidence": 10
},
{
  "section": "Section 11.4.1, G402",
  "rule_name": "AUTO Territory",
  "question": "During AUTO, red robot crosses to blue side and accidentally bumps a blue robot that's partially on red's side. Red then disrupts 1 pre-staged artifact on blue's side while retreating. Total penalties?",
  "options": [
    "No penalties - blue was partially on red side",
    "1 MAJOR FOUL for artifact only",
    "2 MAJOR FOULS total",
    "1 MINOR FOUL for contact"
  ],
  "correct_answer": 1,
  "explanation": "Per G402, contact with opponent partially on red side is legal. However, disrupting pre-staged artifact on opponent's side during AUTO is MAJOR FOUL regardless of intent.",
  "difficulty": 9,
  "category": "AUTO Rules",
  "season": "2025-2026",
  "tags": ["auto", "territory", "contact", "artifacts"],
  "source_page": "Section 11, Page 91",
  "confidence": 10
},
{
  "section": "Section 11.2, G209",
  "rule_name": "Robot Integrity",
  "question": "A robot's defensive strategy involves deploying a tethered 'net' mechanism that it can later retract. During defense, the tether breaks and the net is left on the field. What penalty?",
  "options": [
    "No penalty - unintentional",
    "MINOR FOUL",
    "MAJOR FOUL",
    "RED CARD"
  ],
  "correct_answer": 3,
  "explanation": "Per G209, robots may not intentionally detach or leave parts on field. Even though the break was unintentional, the mechanism was designed to deploy, making this a RED CARD violation.",
  "difficulty": 9,
  "category": "Robot Rules",
  "season": "2025-2026",
  "tags": ["detachment", "parts", "red card", "mechanism"],
  "source_page": "Section 11, Page 86",
  "confidence": 10
},
{
  "section": "Section 13.6, T601",
  "rule_name": "Qualification Disqualification",
  "question": "In qualifications, Team A and Team B are alliance partners. Team A receives a disqualification for repeated safety violations. What happens to Team B's ranking?",
  "options": [
    "Team B also receives 0 ranking points",
    "Team B's ranking points calculated normally",
    "Team B gets automatic win",
    "Match doesn't count for Team B"
  ],
  "correct_answer": 1,
  "explanation": "Per T601, during qualification matches, a team disqualification has no effect on their alliance partner. Team B's points are calculated normally.",
  "difficulty": 7,
  "category": "Tournament",
  "season": "2025-2026",
  "tags": ["disqualification", "qualifications", "alliance", "ranking"],
  "source_page": "Section 13, Page 142",
  "confidence": 10
},
{
  "section": "Section 11.2, G201",
  "rule_name": "Code of Conduct",
  "question": "After a controversial call, a drive team member throws their controller at the field wall in frustration, though not at any person. This is their first offense. What happens?",
  "options": [
    "No penalty - didn't hit anyone",
    "VERBAL WARNING",
    "YELLOW CARD immediately",
    "RED CARD for violence"
  ],
  "correct_answer": 1,
  "explanation": "Per G201, teams must be civil and respectful. First offense typically receives VERBAL WARNING. Throwing objects (even not at people) is inappropriate behavior warranting warning.",
  "difficulty": 6,
  "category": "Conduct",
  "season": "2025-2026",
  "tags": ["conduct", "behavior", "warning", "throwing"],
  "source_page": "Section 11, Page 84",
  "confidence": 10
},
{
  "section": "Section 11.4.5, G420",
  "rule_name": "Functional Impairment",
  "question": "Blue robot is tipped over. Red robot, while maneuvering around it, accidentally backs into blue's exposed electronics, disconnecting the battery. Blue cannot be repaired in time for their next match. What penalty?",
  "options": [
    "No penalty - blue was already disabled",
    "MAJOR FOUL only",
    "MAJOR FOUL and YELLOW CARD",
    "MAJOR FOUL and RED CARD"
  ],
  "correct_answer": 1,
  "explanation": "Per G420, damage to tipped/disabled opponent that's not perceived as deliberate is not a violation. Since contact was accidental and blue was already tipped, no penalty.",
  "difficulty": 9,
  "category": "Robot Interaction",
  "season": "2025-2026",
  "tags": ["damage", "tipped", "battery", "accidental"],
  "source_page": "Section 11, Page 96",
  "confidence": 10
},
{
  "section": "Section 13.7, T705",
  "rule_name": "Playoff Disqualifications",
  "question": "In playoffs, both alliances commit card-worthy violations simultaneously. The head referee cannot determine which happened first. What is the match result?",
  "options": [
    "Red alliance wins by default",
    "Blue alliance wins by default",
    "Match is replayed",
    "Match results in a tie"
  ],
  "correct_answer": 3,
  "explanation": "Per T705.C, if both alliances are simultaneously disqualified in playoffs and head referee cannot determine chronological order, the match results in a tie.",
  "difficulty": 8,
  "category": "Tournament",
  "season": "2025-2026",
  "tags": ["playoffs", "disqualification", "simultaneous", "tie"],
  "source_page": "Section 13, Page 143",
  "confidence": 10
},
{
  "section": "Section 11.4.6, G428",
  "rule_name": "Drive Team Areas",
  "question": "During a match, a human player steps 6 inches outside their alliance area to retrieve a scoring element that rolled out of the field. They immediately return. This is their second time this event. What penalty?",
  "options": [
    "No penalty - retrieving game elements",
    "VERBAL WARNING",
    "MINOR FOUL",
    "MAJOR FOUL"
  ],
  "correct_answer": 2,
  "explanation": "Per G428, drive team must remain in designated area. First violation is verbal warning. Subsequent violations during event receive MINOR FOUL, even if retrieving elements.",
  "difficulty": 7,
  "category": "Human Player",
  "season": "2025-2026",
  "tags": ["drive team", "alliance area", "human", "boundaries"],
  "source_page": "Section 11, Page 100",
  "confidence": 10
},
{
  "section": "Section 11.1, G101",
  "rule_name": "Field Entry",
  "question": "A drive team member enters the field during the match to stop their robot that's damaging field elements. What penalty is assessed?",
  "options": [
    "VERBAL WARNING only",
    "MINOR FOUL",
    "MAJOR FOUL",
    "Covered under G211 as egregious"
  ],
  "correct_answer": 3,
  "explanation": "Per G101, entering field during match is an egregious violation covered by G211, not standard G101 penalty. This would result in YELLOW or RED CARD at referee discretion.",
  "difficulty": 8,
  "category": "Safety",
  "season": "2025-2026",
  "tags": ["field entry", "safety", "egregious", "match"],
  "source_page": "Section 11, Page 83",
  "confidence": 10
},
{
  "section": "Section 13.2, T206",
  "rule_name": "Back-to-Back Matches",
  "question": "Team A plays in qualification match 15 which ends at 2:30 PM with results posted at 2:31 PM. They're scheduled for match 16 at 2:35 PM. When does their T206 break end for G301 purposes?",
  "options": [
    "2:35 PM",
    "2:36 PM",
    "2:38 PM",
    "2:40 PM"
  ],
  "correct_answer": 1,
  "explanation": "Per T206, qualification matches have 5-minute minimum break from when results are posted. 2:31 PM + 5 minutes = 2:36 PM is when their break ends for G301 timing.",
  "difficulty": 7,
  "category": "Tournament",
  "season": "2025-2026",
  "tags": ["timing", "back-to-back", "breaks", "qualification"],
  "source_page": "Section 13, Page 137",
  "confidence": 10
},
{
  "section": "Section 11.2, G212",
  "rule_name": "Exclusion Prevention",
  "question": "Team A tells Team B that they should instruct their alliance partner Team C to not participate in their upcoming qualification match to 'save energy for playoffs.' Team B refuses but Team A persists. What penalty?",
  "options": [
    "VERBAL WARNING to Team A",
    "YELLOW CARD to Team A",
    "RED CARD to Team A if Team C doesn't play",
    "No penalty unless Team C agrees"
  ],
  "correct_answer": 1,
  "explanation": "Per G212, teams may not encourage another team to exclude their robot from qualification match. This immediately warrants YELLOW CARD. RED CARD only if the robot doesn't participate.",
  "difficulty": 8,
  "category": "Conduct",
  "season": "2025-2026",
  "tags": ["exclusion", "participation", "yellow card", "encouragement"],
  "source_page": "Section 11, Page 87",
  "confidence": 10
},
{
  "section": "Section 13.2, T202",
  "rule_name": "Robot Disabled Status",
  "question": "A robot stops moving during a match due to battery disconnection. The team tells the referee their robot is disabled. Is the robot officially DISABLED?",
  "options": [
    "Yes - robot cannot move",
    "Yes - team declared it",
    "No - referee must declare it",
    "Yes - automatic for battery issues"
  ],
  "correct_answer": 2,
  "explanation": "Per T202, a robot is only considered DISABLED once a referee has declared it disabled during a match. Team declaration or robot failure alone doesn't make it officially DISABLED.",
  "difficulty": 6,
  "category": "Tournament",
  "season": "2025-2026",
  "tags": ["disabled", "referee", "declaration", "status"],
  "source_page": "Section 13, Page 135",
  "confidence": 10
},
{
  "section": "Section 11.2, G207",
  "rule_name": "Restricted Area Access",
  "question": "A team member with a media badge stands behind the opposing alliance station and uses hand signals to communicate with their drive team during the match. What penalty?",
  "options": [
    "No penalty - has proper badge",
    "VERBAL WARNING first offense",
    "YELLOW CARD immediately",
    "MINOR FOUL"
  ],
  "correct_answer": 1,
  "explanation": "Per G207, team members with restricted area access may not assist or use signaling devices during match. First violation receives VERBAL WARNING, subsequent violations get YELLOW CARD.",
  "difficulty": 7,
  "category": "Conduct",
  "season": "2025-2026",
  "tags": ["restricted", "signaling", "media", "communication"],
  "source_page": "Section 11, Page 85",
  "confidence": 10
},
{
  "section": "Section 13.7.1",
  "rule_name": "Alliance Selection",
  "question": "During alliance selection, Alliance 3 captain invites Alliance 5 captain. Alliance 5 accepts. What happens to the team that was ranked 6th?",
  "options": [
    "Remains ranked 6th",
    "Becomes Alliance 5 captain",
    "Becomes Alliance 4 captain",
    "Cannot be selected anymore"
  ],
  "correct_answer": 1,
  "explanation": "Per alliance selection process, when an alliance lead accepts invitation from another alliance lead, all lower alliance leads are promoted 1 spot. Rank 6 becomes Alliance 5 captain.",
  "difficulty": 8,
  "category": "Tournament",
  "season": "2025-2026",
  "tags": ["alliance", "selection", "promotion", "captain"],
  "source_page": "Section 13, Page 144",
  "confidence": 10
},
{
  "section": "Section 11.4.3, G408",
  "rule_name": "Excessive Control",
  "question": "A robot is observed controlling 5 artifacts simultaneously three different times during a match, receiving minor fouls each time. What additional penalty applies?",
  "options": [
    "No additional penalty",
    "MAJOR FOUL for repetition",
    "YELLOW CARD for excessive",
    "RED CARD for repeated violation"
  ],
  "correct_answer": 2,
  "explanation": "Per G408, excessive violations include controlling 5+ artifacts or frequent (3+ times) greater-than-momentary control of 4+ artifacts, resulting in YELLOW CARD beyond minor fouls.",
  "difficulty": 8,
  "category": "Scoring Elements",
  "season": "2025-2026",
  "tags": ["control", "excessive", "artifacts", "yellow card"],
  "source_page": "Section 11, Page 93",
  "confidence": 10
},
{
  "section": "Section 13.2, T201",
  "rule_name": "Head Referee Authority",
  "question": "After a match, teams disagree with a head referee's call and show video evidence from multiple angles proving the call was incorrect. What can be done?",
  "options": [
    "Head referee must reverse the call",
    "Event Director can overrule",
    "Head referee ruling is final",
    "FIRST HQ can review and change"
  ],
  "correct_answer": 2,
  "explanation": "Per T201, head referee rulings are final. No event staff, including head referee, will review video/photos from any source under any circumstances. Rulings cannot be overruled.",
  "difficulty": 7,
  "category": "Tournament",
  "season": "2025-2026",
  "tags": ["referee", "authority", "video", "final"],
  "source_page": "Section 13, Page 135",
  "confidence": 10
},
{
  "section": "Section 11.1, G102",
  "rule_name": "Arena Element Care",
  "question": "A frustrated human player leans heavily on the field perimeter, causing it to deflect slightly while bracing themselves during an intense match moment. This is their third time doing this after two verbal warnings. What penalty?",
  "options": [
    "No penalty - bracing is allowed",
    "Another VERBAL WARNING",
    "YELLOW CARD",
    "RED CARD"
  ],
  "correct_answer": 2,
  "explanation": "Per G102, drive team may brace field perimeter but should not cause deflection. After verbal warning, subsequent violations receive YELLOW CARD.",
  "difficulty": 7,
  "category": "Field Elements",
  "season": "2025-2026",
  "tags": ["field", "perimeter", "deflection", "yellow card"],
  "source_page": "Section 11, Page 83",
  "confidence": 10
},
{
  "section": "Section 13.2, T205",
  "rule_name": "Field Measurement Period",
  "question": "During the pre-match field measurement period, a team runs their AUTO program to test sensor calibration, causing their robot to drive across the field. What happens?",
  "options": [
    "Allowed for calibration purposes",
    "VERBAL WARNING",
    "Team removed from field",
    "MINOR FOUL"
  ],
  "correct_answer": 1,
  "explanation": "Per T205, during measurement/calibration, robots cannot move chassis under own power around field. This violation receives VERBAL WARNING, with egregious violations escalating under G211.",
  "difficulty": 6,
  "category": "Pre-Match",
  "season": "2025-2026",
  "tags": ["calibration", "measurement", "driving", "field"],
  "source_page": "Section 13, Page 136",
  "confidence": 10
}
      ]

      if (newQuestions.length === 0) {
        setError('❌ Please add your questions to the newQuestions array first!')
        return
      }

      console.log(`Inserting ${newQuestions.length} new questions...`)

      // Remove confidence field and format for database with ALL required fields
      const questionsForDB = newQuestions.map(q => ({
        question: q.question,
        options: q.options,
        correct_answer: q.correct_answer,
        difficulty: q.difficulty.toString(),
        section: q.section,
        rule_name: q.rule_name || 'General Rule',
        season: q.season || '2025-2026',
        explanation: q.explanation || 'No explanation provided',
        category: q.category || 'General',
        tags: q.tags || [],
        source_page: q.source_page || q.section
      }))

      const { data, error } = await supabase
        .from('quiz_questions')
        .insert(questionsForDB)
        .select()

      if (error) {
        setError(`Question insertion error: ${error.message}`)
      } else {
        setError(`✅ Successfully inserted ${data.length} new questions! Total pool now larger for daily selection.`)
      }
    } catch (err: any) {
      setError(`Question insertion exception: ${err.message}`)
    }
  }

  const setupTomorrowsQuestions = async () => {
    if (!user) {
      setError('No user logged in')
      return
    }

    try {
      // This will trigger the database function to select 15 new questions for tomorrow
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowDate = tomorrow.toISOString().split('T')[0]

      // Call the function to get tomorrow's questions (this will create them if they don't exist)
      const { data, error } = await supabase
        .rpc('get_daily_ranked_questions', { target_date: tomorrowDate })

      if (error) {
        setError(`Setup error: ${error.message}`)
      } else {
        setError(`✅ Tomorrow's ranked set ready! ${data.length} questions selected for ${tomorrowDate}`)
      }
    } catch (err: any) {
      setError(`Setup exception: ${err.message}`)
    }
  }

  const insertQuizQuestions = async () => {
    if (!user) {
      setError('No user logged in')
      return
    }

    try {
      // Your 100 questions array goes here - replace this sample with your actual questions
      const questions = [
  {
    "section": "Game Manual Part 1, Section 12, R101",
    "rule_name": "Starting Configuration Size Limit",
    "question": "What is the maximum size allowed for a robot in its starting configuration?",
    "options": [
      "12 inches cubed",
      "18 inches cubed",
      "20 inches cubed",
      "24 inches cubed"
    ],
    "correct_answer": 1,
    "explanation": "R101 states that in the STARTING CONFIGURATION, the ROBOT must be fully self-contained within an 18-inch wide, by 18-inch long, by 18-inch-high volume.",
    "difficulty": 2,
    "category": "Robot Rules",
    "season": "2025-2026",
    "tags": ["size", "starting", "configuration"],
    "source_page": "Section 12.1, R101"
  },
  {
    "section": "Game Manual Part 1, Section 12, R103",
    "rule_name": "Robot Weight Limit",
    "question": "What is the weight limit for FTC robots?",
    "options": [
      "40 pounds",
      "42 pounds",
      "50 pounds",
      "No explicit weight limit"
    ],
    "correct_answer": 3,
    "explanation": "R103 explicitly states there is no weight limit for FIRST Tech Challenge ROBOTS, though teams should consider various factors like field damage and battery consumption.",
    "difficulty": 3,
    "category": "Robot Rules",
    "season": "2025-2026",
    "tags": ["weight", "limit", "robot"],
    "source_page": "Section 12.1, R103"
  },
  {
    "section": "Game Manual Part 1, Section 12, R503",
    "rule_name": "Motor and Servo Limits",
    "question": "A team wants to build a robot with maximum actuation. What is the maximum number of motors and servos they can use?",
    "options": [
      "6 motors and 8 servos",
      "8 motors and 8 servos",
      "8 motors and 10 servos",
      "10 motors and 12 servos"
    ],
    "correct_answer": 2,
    "explanation": "R503 states that a ROBOT may not have more than 8 motors and 10 servos from the allowable actuator lists for all MECHANISMS used in all configurations.",
    "difficulty": 3,
    "category": "Robot Rules",
    "season": "2025-2026",
    "tags": ["motors", "servos", "limits"],
    "source_page": "Section 12.5, R503"
  },
  {
    "section": "Game Manual Part 1, Section 12, R601",
    "rule_name": "Robot Battery Requirements",
    "question": "How many 12V NiMH main batteries can a robot use during competition?",
    "options": [
      "1 battery only",
      "2 batteries maximum",
      "3 batteries maximum",
      "Unlimited with proper fusing"
    ],
    "correct_answer": 0,
    "explanation": "R601 states the ROBOT battery must be 1 and only 1 approved 12V NiMH main battery for the control system and actuation during competition.",
    "difficulty": 2,
    "category": "Power Distribution",
    "season": "2025-2026",
    "tags": ["battery", "power", "main"],
    "source_page": "Section 12.6, R601"
  },
  {
    "section": "Game Manual Part 1, Section 12, R207",
    "rule_name": "Pneumatics Prohibition",
    "question": "Which of the following is allowed on an FTC robot?",
    "options": [
      "Pneumatic cylinders for lifting",
      "Gas springs for suspension",
      "Air-filled (pneumatic) wheels",
      "Compressed air for cleaning"
    ],
    "correct_answer": 2,
    "explanation": "R207 prohibits all closed air devices except air-filled (pneumatic) wheels, which are explicitly exempt from this rule.",
    "difficulty": 4,
    "category": "Robot Rules",
    "season": "2025-2026",
    "tags": ["pneumatics", "air", "prohibited"],
    "source_page": "Section 12.2, R207"
  },
  {
    "section": "Game Manual Part 1, Section 12, R401",
    "rule_name": "Robot Sign Requirements",
    "question": "How many robot signs must be displayed on a robot, and what is their minimum angular separation?",
    "options": [
      "1 sign, no angle requirement",
      "2 signs, at least 45 degrees apart",
      "2 signs, at least 90 degrees apart",
      "3 signs, 120 degrees apart"
    ],
    "correct_answer": 2,
    "explanation": "R401 requires ROBOT SIGNS be placed in at least two separate locations, on opposite or adjacent surfaces, ≥90 degrees apart.",
    "difficulty": 4,
    "category": "Robot Rules",
    "season": "2025-2026",
    "tags": ["signs", "identification", "placement"],
    "source_page": "Section 12.4, R401"
  },
  {
    "section": "Game Manual Part 1, Section 12, R104",
    "rule_name": "Component Detachment Rule",
    "question": "Team Alpha designs a robot that can intentionally drop a small mechanism to block opponents. Is this legal?",
    "options": [
      "Yes, if the mechanism weighs less than 1 pound",
      "Yes, if it's for strategic gameplay",
      "No, robots may not intentionally detach components",
      "Yes, but only in the endgame"
    ],
    "correct_answer": 2,
    "explanation": "R104 explicitly states that robots may not be designed to intentionally detach COMPONENTS.",
    "difficulty": 3,
    "category": "Robot Rules",
    "season": "2025-2026",
    "tags": ["detachment", "components", "prohibited"],
    "source_page": "Section 12.1, R104"
  },
  {
    "section": "Game Manual Part 1, Section 12, R502",
    "rule_name": "Servo Power Requirements",
    "question": "What is the maximum mechanical output power allowed for a servo at 6V?",
    "options": [
      "4 watts",
      "6 watts",
      "8 watts",
      "10 watts"
    ],
    "correct_answer": 2,
    "explanation": "R502 specifies that servos must have mechanical output power ≤ 8 watts at 6V to be legal.",
    "difficulty": 5,
    "category": "Robot Rules",
    "season": "2025-2026",
    "tags": ["servo", "power", "specifications"],
    "source_page": "Section 12.5, R502"
  },
  {
    "section": "Game Manual Part 1, Section 12, R701",
    "rule_name": "Robot Controller Options",
    "question": "Which configuration is NOT a legal robot controller setup?",
    "options": [
      "REV Control Hub alone",
      "Smartphone with REV Expansion Hub",
      "REV Control Hub with one additional Expansion Hub",
      "Two REV Expansion Hubs without a Control Hub"
    ],
    "correct_answer": 3,
    "explanation": "R701 requires either a REV Control Hub OR a smartphone with Expansion Hub as the controller. Two Expansion Hubs alone cannot control a robot.",
    "difficulty": 5,
    "category": "Control System",
    "season": "2025-2026",
    "tags": ["controller", "control hub", "expansion"],
    "source_page": "Section 12.7, R701"
  },
  {
    "section": "Game Manual Part 1, Section 12, R203",
    "rule_name": "Hazardous Materials and Devices",
    "question": "A team wants to use 36h11 AprilTag imagery on their robot for decoration. Is this allowed?",
    "options": [
      "Yes, for decoration only",
      "Yes, if it's not functional",
      "No, it's prohibited as it could interfere with vision systems",
      "Yes, with referee approval"
    ],
    "correct_answer": 2,
    "explanation": "R203 explicitly prohibits imagery that utilizes or closely mimics 36h11 AprilTags as it could interfere with other robots' vision systems.",
    "difficulty": 6,
    "category": "Safety",
    "season": "2025-2026",
    "tags": ["AprilTags", "interference", "prohibited"],
    "source_page": "Section 12.2, R203"
  },
  {
    "section": "Game Manual Part 1, Section 12, R615",
    "rule_name": "Wire Gauge Requirements",
    "question": "What is the minimum wire gauge required for the 12V main battery power connections?",
    "options": [
      "22 AWG",
      "20 AWG",
      "18 AWG",
      "16 AWG"
    ],
    "correct_answer": 2,
    "explanation": "R615 specifies that 12V Main Battery Power requires a minimum of 18 AWG wire.",
    "difficulty": 5,
    "category": "Power Distribution",
    "season": "2025-2026",
    "tags": ["wire", "gauge", "battery"],
    "source_page": "Section 12.6, R615"
  },
  {
    "section": "Game Manual Part 1, Section 12, R101",
    "rule_name": "Starting Configuration Exceptions",
    "question": "A team's zip tie extends 0.3 inches beyond the 18-inch starting configuration. Is this legal?",
    "options": [
      "Yes, zip ties have unlimited extension",
      "No, nothing can extend beyond 18 inches",
      "No, only 0.25 inches is allowed for flexible materials",
      "Yes, if it's for safety"
    ],
    "correct_answer": 2,
    "explanation": "R101 allows minor protrusions up to 0.25 inches by flexible materials like zip ties. 0.3 inches exceeds this limit.",
    "difficulty": 6,
    "category": "Robot Rules",
    "season": "2025-2026",
    "tags": ["starting", "configuration", "protrusions"],
    "source_page": "Section 12.1, R101"
  },
  {
    "section": "Game Manual Part 1, Section 12, R301",
    "rule_name": "COTS Major Mechanisms",
    "question": "Which COTS major mechanism is explicitly allowed?",
    "options": [
      "Complete arm assembly for game tasks",
      "Purpose-built scoring mechanism",
      "COTS drive chassis",
      "Pre-assembled intake system"
    ],
    "correct_answer": 2,
    "explanation": "R301 prohibits COTS MAJOR MECHANISMS designed to complete game tasks, except for COTS drive chassis and official Starterbots mechanisms.",
    "difficulty": 5,
    "category": "Robot Rules",
    "season": "2025-2026",
    "tags": ["COTS", "mechanisms", "chassis"],
    "source_page": "Section 12.3, R301"
  },
  {
    "section": "Game Manual Part 1, Section 12, R502",
    "rule_name": "Servo Stall Current Limit",
    "question": "What is the maximum stall current allowed for a standard servo at 6V?",
    "options": [
      "2 amps",
      "3 amps",
      "4 amps",
      "5 amps"
    ],
    "correct_answer": 2,
    "explanation": "R502 Table 12-2 shows that standard servos must have a stall current ≤ 4 amps at 6V.",
    "difficulty": 5,
    "category": "Robot Rules",
    "season": "2025-2026",
    "tags": ["servo", "current", "specifications"],
    "source_page": "Section 12.5, R502"
  },
  {
    "section": "Game Manual Part 1, Section 12, R403",
    "rule_name": "Team Number Display",
    "question": "What is the required height range for team numbers on robot signs?",
    "options": [
      "1.75 to 2.75 inches",
      "2.0 to 2.5 inches",
      "2.25 inches exactly",
      "1.75 to 2.75 inches (2.25 +/- 0.5 inches)"
    ],
    "correct_answer": 3,
    "explanation": "R403 requires team numbers to be 2.25 in. (+/-0.5 in.) tall, which means between 1.75 and 2.75 inches.",
    "difficulty": 6,
    "category": "Robot Rules",
    "season": "2025-2026",
    "tags": ["team number", "signs", "dimensions"],
    "source_page": "Section 12.4, R403"
  },
  {
    "section": "Game Manual Part 1, Section 12, R604",
    "rule_name": "Battery Charging Rate",
    "question": "What is the maximum average charge current allowed for robot batteries?",
    "options": [
      "1 amp",
      "2 amps",
      "3 amps",
      "5 amps"
    ],
    "correct_answer": 2,
    "explanation": "R604 states that battery chargers may not exceed a 3-amp average charge current.",
    "difficulty": 4,
    "category": "Power Distribution",
    "season": "2025-2026",
    "tags": ["battery", "charging", "safety"],
    "source_page": "Section 12.6, R604"
  },
  {
    "section": "Game Manual Part 1, Section 12, R717",
    "rule_name": "Laser Requirements",
    "question": "A team wants to use a Class II visible laser pointer for alignment. Is this allowed?",
    "options": [
      "Yes, if part of a sensor",
      "Yes, for alignment purposes",
      "No, only Class I non-visible lasers are allowed",
      "Yes, with safety goggles"
    ],
    "correct_answer": 2,
    "explanation": "R717 requires lasers to be Class I AND non-visible spectrum AND part of a sensor. A Class II visible laser violates all these requirements.",
    "difficulty": 7,
    "category": "Safety",
    "season": "2025-2026",
    "tags": ["laser", "safety", "sensors"],
    "source_page": "Section 12.7, R717"
  },
  {
    "section": "Game Manual Part 1, Section 12, R303",
    "rule_name": "COTS Degrees of Freedom",
    "question": "Which COTS mechanism violates the single degree of freedom rule?",
    "options": [
      "Linear slide kit",
      "Mecanum wheel",
      "Two-axis gimbal",
      "Single speed gearbox"
    ],
    "correct_answer": 2,
    "explanation": "R303 limits COTS to single degree of freedom. A two-axis gimbal has multiple degrees of freedom and would be prohibited.",
    "difficulty": 6,
    "category": "Robot Rules",
    "season": "2025-2026",
    "tags": ["COTS", "DoF", "mechanisms"],
    "source_page": "Section 12.3, R303"
  },
  {
    "section": "Game Manual Part 1, Section 12, R602",
    "rule_name": "USB Battery Pack Limits",
    "question": "What is the maximum capacity allowed for COTS USB battery packs on the robot?",
    "options": [
      "50Wh",
      "75Wh",
      "100Wh",
      "150Wh"
    ],
    "correct_answer": 2,
    "explanation": "R602 allows COTS USB battery packs with a capacity of 100Wh or less (27,000mAh at 3.7V).",
    "difficulty": 5,
    "category": "Power Distribution",
    "season": "2025-2026",
    "tags": ["battery", "USB", "capacity"],
    "source_page": "Section 12.6, R602"
  },
  {
    "section": "Game Manual Part 1, Section 12, R201",
    "rule_name": "Field Damage Prevention",
    "question": "Team Beta wants to use AndyMark am-2256 high traction wheels on their drivetrain. Is this allowed?",
    "options": [
      "Yes, they're COTS parts",
      "No, they're known to damage tiles when used on drivetrains",
      "Yes, with referee approval",
      "Yes, if speed is limited"
    ],
    "correct_answer": 1,
    "explanation": "R201 specifically mentions high traction wheels (am-2256) as examples known to damage tiles when used directly on the floor.",
    "difficulty": 5,
    "category": "Robot Rules",
    "season": "2025-2026",
    "tags": ["wheels", "field damage", "traction"],
    "source_page": "Section 12.2, R201"
  },
  {
    "section": "Game Manual Part 1, Section 12, R505",
    "rule_name": "Motor Port Limits",
    "question": "How many motors can be connected to a single motor port on a REV Control Hub?",
    "options": [
      "1 motor only",
      "2 motors maximum",
      "3 motors maximum",
      "4 motors maximum"
    ],
    "correct_answer": 1,
    "explanation": "R505 Table 12-3 specifies a load limit of 2 Motors per Port for REV Control Hub motor ports.",
    "difficulty": 4,
    "category": "Control System",
    "season": "2025-2026",
    "tags": ["motors", "control hub", "ports"],
    "source_page": "Section 12.5, R505"
  },
  {
    "section": "Game Manual Part 1, Section 12, R708",
    "rule_name": "Robot Network Access",
    "question": "During a match, which devices can connect to the robot controller Wi-Fi network?",
    "options": [
      "Programming laptop for debugging",
      "Coach's tablet for strategy",
      "Only robot controller and driver station",
      "Any team device"
    ],
    "correct_answer": 2,
    "explanation": "R708 states during a MATCH, only the ROBOT CONTROLLER and DRIVER STATION may use the network. Other devices must be disconnected.",
    "difficulty": 4,
    "category": "Control System",
    "season": "2025-2026",
    "tags": ["Wi-Fi", "network", "match"],
    "source_page": "Section 12.7, R708"
  },
  {
    "section": "Game Manual Part 1, Section 12, R611",
    "rule_name": "Robot Frame Grounding",
    "question": "When checking electrical isolation of the robot frame, what minimum resistance should be measured?",
    "options": [
      "50Ω",
      "100Ω",
      "120Ω",
      "150Ω"
    ],
    "correct_answer": 2,
    "explanation": "R611 states compliance can be checked by observing a >120Ω resistance between power terminals and any point on the robot frame.",
    "difficulty": 7,
    "category": "Power Distribution",
    "season": "2025-2026",
    "tags": ["grounding", "resistance", "electrical"],
    "source_page": "Section 12.6, R611"
  },
  {
    "section": "Game Manual Part 1, Section 12, R504",
    "rule_name": "Motor Modifications",
    "question": "Which modification to a motor is explicitly allowed?",
    "options": [
      "Rewinding the motor for more torque",
      "Adding cooling fans to the motor case",
      "Trimming electrical leads to length",
      "Drilling ventilation holes"
    ],
    "correct_answer": 2,
    "explanation": "R504 allows electrical leads to be trimmed to length as necessary, but prohibits modifying the integral mechanical and electrical system.",
    "difficulty": 5,
    "category": "Robot Rules",
    "season": "2025-2026",
    "tags": ["motors", "modifications", "allowed"],
    "source_page": "Section 12.5, R504"
  },
  {
    "section": "Game Manual Part 1, Section 12, R616",
    "rule_name": "Wire Color Coding",
    "question": "Which wire color is NOT allowed for positive (+12VDC) connections?",
    "options": [
      "Red",
      "Yellow",
      "Blue",
      "Brown"
    ],
    "correct_answer": 2,
    "explanation": "R616 specifies blue is for negative connections only. Positive connections must be red, yellow, white, brown, or black-with-stripe.",
    "difficulty": 4,
    "category": "Power Distribution",
    "season": "2025-2026",
    "tags": ["wiring", "color code", "electrical"],
    "source_page": "Section 12.6, R616"
  },
  {
    "section": "Game Manual Part 1, Section 12, R102",
    "rule_name": "Starting Configuration Support",
    "question": "A robot's arm is held in starting configuration by a servo. During inspection, the servo overheats after 3 minutes. What's the issue?",
    "options": [
      "Servos cannot be used for starting configuration",
      "The robot violates thermal failure prevention guidelines",
      "The inspection is taking too long",
      "The servo is defective"
    ],
    "correct_answer": 1,
    "explanation": "R102 warns that robots holding starting configuration for several minutes should limit thermal failure possibility, like motors stalled against hard stops.",
    "difficulty": 7,
    "category": "Robot Rules",
    "season": "2025-2026",
    "tags": ["starting configuration", "thermal", "servo"],
    "source_page": "Section 12.1, R102"
  },
  {
    "section": "Game Manual Part 1, Section 12, R703",
    "rule_name": "Vision Coprocessors",
    "question": "Which vision coprocessor can teams program with custom code?",
    "options": [
      "DFRobot HuskyLens",
      "Limelight 3A",
      "Pixy2",
      "OpenMV Cam"
    ],
    "correct_answer": 1,
    "explanation": "R703 specifically lists the Limelight 3A as a supported programmable vision coprocessor. OpenMV Cam is explicitly prohibited.",
    "difficulty": 6,
    "category": "Control System",
    "season": "2025-2026",
    "tags": ["vision", "coprocessor", "programming"],
    "source_page": "Section 12.7, R703"
  },
  {
    "section": "Game Manual Part 1, Section 12, R402",
    "rule_name": "Alliance Color Display",
    "question": "What is the minimum size requirement for the alliance color rectangle on robot signs?",
    "options": [
      "5.5 x 2.0 inches",
      "6.0 x 2.0 inches",
      "6.5 x 2.5 inches",
      "7.0 x 3.0 inches"
    ],
    "correct_answer": 2,
    "explanation": "R402 requires a rectangle with solid red or blue background at least 6.5 in. by 2.5 in. in size.",
    "difficulty": 4,
    "category": "Robot Rules",
    "season": "2025-2026",
    "tags": ["robot signs", "alliance", "dimensions"],
    "source_page": "Section 12.4, R402"
  },
  {
    "section": "Game Manual Part 1, Section 12, R205",
    "rule_name": "Field Contamination",
    "question": "A team uses coffee beans as ballast in a sealed container. During a match, the container cracks and spills. What rule is violated?",
    "options": [
      "R103 - Weight limits",
      "R205 - Field contamination",
      "R605 - Battery ballast",
      "No violation if sealed"
    ],
    "correct_answer": 1,
    "explanation": "R205 prohibits materials that if unintentionally released would delay matches, specifically mentioning loose ballast like coffee beans.",
    "difficulty": 5,
    "category": "Robot Rules",
    "season": "2025-2026",
    "tags": ["ballast", "contamination", "field"],
    "source_page": "Section 12.2, R205"
  },
  {
    "section": "Game Manual Part 1, Section 12, R307",
    "rule_name": "Work Outside Pit Hours",
    "question": "During a tournament, can a team work on their robot at their hotel after pits close?",
    "options": [
      "No, all work must occur in the pits",
      "Yes, teams may work outside pit hours during an event",
      "Only with event director permission",
      "Only for software changes"
    ],
    "correct_answer": 1,
    "explanation": "R307 explicitly allows teams to work on their ROBOT outside of pit hours during an event they're attending.",
    "difficulty": 4,
    "category": "Tournament Rules",
    "season": "2025-2026",
    "tags": ["work", "pits", "event"],
    "source_page": "Section 12.3, R307"
  },
  {
    "section": "Game Manual Part 1, Section 12, R714",
    "rule_name": "USB Device Connections",
    "question": "Which device CANNOT be connected via USB to the robot control system?",
    "options": [
      "Logitech C270 webcam",
      "USB hub",
      "Arduino microcontroller",
      "REV Expansion Hub"
    ],
    "correct_answer": 2,
    "explanation": "R714 only allows webcams, vision sensors, USB hubs/switches, and REV Expansion Hub. Arduino microcontrollers are not permitted.",
    "difficulty": 5,
    "category": "Control System",
    "season": "2025-2026",
    "tags": ["USB", "connections", "prohibited"],
    "source_page": "Section 12.7, R714"
  },
  {
    "section": "Game Manual Part 1, Section 12, R609",
    "rule_name": "Main Power Switch",
    "question": "How many main power switches must control the robot battery power?",
    "options": [
      "None required",
      "Exactly one",
      "At least one",
      "Maximum of two"
    ],
    "correct_answer": 1,
    "explanation": "R609 states exactly one main power switch must control all power provided by the robot battery pack.",
    "difficulty": 3,
    "category": "Power Distribution",
    "season": "2025-2026",
    "tags": ["power switch", "battery", "control"],
    "source_page": "Section 12.6, R609"
  },
  {
    "section": "Game Manual Part 1, Section 12, R208",
    "rule_name": "Downforce Mechanisms",
    "question": "Team Gamma designs a fan system to create suction for better traction. Is this legal?",
    "options": [
      "Yes, if powered by USB battery",
      "Yes, for cooling only",
      "No, airflow for downward suction is prohibited",
      "Yes, with power limits"
    ],
    "correct_answer": 2,
    "explanation": "R208 explicitly prohibits mechanisms using generated airflow to provide downward suction to increase downforce.",
    "difficulty": 4,
    "category": "Robot Rules",
    "season": "2025-2026",
    "tags": ["downforce", "suction", "prohibited"],
    "source_page": "Section 12.2, R208"
  },
  {
    "section": "Game Manual Part 1, Section 12, R506",
    "rule_name": "Relay Usage",
    "question": "Can a team use an electromagnetic relay to control their intake motor?",
    "options": [
      "Yes, for safety disconnection",
      "Yes, if current rated properly",
      "No, relays are prohibited",
      "Yes, with inspector approval"
    ],
    "correct_answer": 2,
    "explanation": "R506 explicitly prohibits the use of relays and electromagnets, including for electrical actuation.",
    "difficulty": 5,
    "category": "Power Distribution",
    "season": "2025-2026",
    "tags": ["relay", "electromagnet", "prohibited"],
    "source_page": "Section 12.5, R506"
  },
  {
    "section": "Game Manual Part 1, Section 12, R304",
    "rule_name": "Pre-Kickoff Fabrication",
    "question": "A team wants to use a custom gearbox they built last season. Is this allowed?",
    "options": [
      "No, all parts must be built after Kickoff",
      "Yes, fabricated items created before Kickoff are permitted",
      "Only with modification",
      "Only COTS parts from previous seasons"
    ],
    "correct_answer": 1,
    "explanation": "R304 explicitly permits FABRICATED ITEMS created before Kickoff to be used.",
    "difficulty": 3,
    "category": "Robot Rules",
    "season": "2025-2026",
    "tags": ["fabrication", "reuse", "pre-season"],
    "source_page": "Section 12.3, R304"
  },
  {
    "section": "Game Manual Part 1, Section 12, R718",
    "rule_name": "Android Device Configuration",
    "question": "What must be done to the REV Control Hub's Wi-Fi settings?",
    "options": [
      "Use default password for consistency",
      "Disable Wi-Fi for security",
      "Change password to non-default",
      "Enable WPA3 encryption"
    ],
    "correct_answer": 2,
    "explanation": "R718 requires REV Control Hub users to change the Wi-Fi password to a non-default password.",
    "difficulty": 4,
    "category": "Control System",
    "season": "2025-2026",
    "tags": ["Control Hub", "Wi-Fi", "configuration"],
    "source_page": "Section 12.7, R718"
  },
  {
    "section": "Game Manual Part 1, Section 12, R306",
    "rule_name": "Scoring Element Usage",
    "question": "Can a team use a replica of the current season's scoring element as part of their robot's structure?",
    "options": [
      "Yes, if it's clearly marked",
      "Yes, for testing purposes only",
      "No, scoring elements cannot be used for robot construction",
      "Yes, if it's a different color"
    ],
    "correct_answer": 2,
    "explanation": "R306 prohibits current season SCORING ELEMENTS or replicas from being used as part of ROBOT construction.",
    "difficulty": 4,
    "category": "Robot Rules",
    "season": "2025-2026",
    "tags": ["scoring elements", "construction", "prohibited"],
    "source_page": "Section 12.3, R306"
  },
  {
    "section": "Game Manual Part 1, Section 12, R707",
    "rule_name": "Device Naming Convention",
    "question": "Team 12345 has two spare driver stations. How should the second spare be named?",
    "options": [
      "12345-DS-2",
      "12345-B-DS",
      "12345-DS-B",
      "12345-SPARE-DS"
    ],
    "correct_answer": 1,
    "explanation": "R707 specifies spare devices should be named with format <team number>-<letter>-RC/DS (e.g., 12345-B-DS).",
    "difficulty": 5,
    "category": "Control System",
    "season": "2025-2026",
    "tags": ["naming", "driver station", "configuration"],
    "source_page": "Section 12.7, R707"
  },
  {
    "section": "Game Manual Part 1, Section 12, R502",
    "rule_name": "Linear Servo Requirements",
    "question": "What is the maximum stall current allowed for a linear servo at 6V?",
    "options": [
      "1 amp",
      "2 amps",
      "4 amps",
      "No limit specified"
    ],
    "correct_answer": 0,
    "explanation": "R502 Table 12-2 specifies linear servos must have stall current ≤ 1 amp at 6V.",
    "difficulty": 5,
    "category": "Robot Rules",
    "season": "2025-2026",
    "tags": ["linear servo", "current", "specifications"],
    "source_page": "Section 12.5, R502"
  },
  {
    "section": "Game Manual Part 1, Section 12, R610",
    "rule_name": "Fuse Replacement",
    "question": "A 20A fuse blows repeatedly. What can the team legally do?",
    "options": [
      "Replace with a 25A fuse",
      "Short out the fuse temporarily",
      "Replace with a 15A fuse",
      "Use a self-resetting breaker"
    ],
    "correct_answer": 2,
    "explanation": "R610 allows fuses to be replaced with smaller ratings but prohibits higher ratings, shorting out, or self-resetting breakers.",
    "difficulty": 4,
    "category": "Power Distribution",
    "season": "2025-2026",
    "tags": ["fuse", "replacement", "safety"],
    "source_page": "Section 12.6, R610"
  },
  {
    "section": "Game Manual Part 1, Section 12, R613",
    "rule_name": "Custom Circuit Voltage",
    "question": "A team builds a custom LED controller. What's the maximum regulated voltage it can output?",
    "options": [
      "5V for any purpose",
      "12V for LEDs only",
      "5V normally, but higher for LEDs",
      "3.3V maximum"
    ],
    "correct_answer": 2,
    "explanation": "R613 states custom circuits shall not exceed 5V regulated output, except if solely used for powering LEDs.",
    "difficulty": 6,
    "category": "Power Distribution",
    "season": "2025-2026",
    "tags": ["custom circuit", "voltage", "LEDs"],
    "source_page": "Section 12.6, R613"
  },
  {
    "section": "Game Manual Part 1, Section 12, R203",
    "rule_name": "Flashing Light Restrictions",
    "question": "A team wants decorative lights that flash at 3Hz. What will likely happen?",
    "options": [
      "Automatic approval",
      "No restrictions on flashing",
      "Additional scrutiny and possible disable request",
      "Immediate disqualification"
    ],
    "correct_answer": 2,
    "explanation": "R203 notes flashing lights greater than 2Hz will invite additional scrutiny and teams may be asked to disable or modify them.",
    "difficulty": 6,
    "category": "Safety",
    "season": "2025-2026",
    "tags": ["lights", "flashing", "safety"],
    "source_page": "Section 12.2, R203"
  },
  {
    "section": "Game Manual Part 1, Section 12, R617",
    "rule_name": "USB Hub Power",
    "question": "How can a powered USB hub be legally powered on the robot?",
    "options": [
      "Direct from main battery",
      "From motor ports",
      "From 5V auxiliary port on Control/Expansion Hub or USB battery pack",
      "From servo ports"
    ],
    "correct_answer": 2,
    "explanation": "R617 states powered USB hubs can only be powered by approved COTS USB battery packs or the 5V auxiliary port on Control/Expansion Hub.",
    "difficulty": 5,
    "category": "Power Distribution",
    "season": "2025-2026",
    "tags": ["USB hub", "power", "auxiliary"],
    "source_page": "Section 12.6, R617"
  },
  {
    "section": "Game Manual Part 1, Section 12, R204",
    "rule_name": "Scoring Element Removal",
    "question": "A robot's intake mechanism jams with a scoring element while powered. What must be possible?",
    "options": [
      "Remote release mechanism required",
      "Must allow removal when powered off",
      "Referee will handle removal",
      "Element can remain stuck"
    ],
    "correct_answer": 1,
    "explanation": "R204 requires robots to allow removal of scoring elements from the robot while powered off.",
    "difficulty": 4,
    "category": "Robot Rules",
    "season": "2025-2026",
    "tags": ["scoring elements", "removal", "powered off"],
    "source_page": "Section 12.2, R204"
  },
  {
    "section": "Game Manual Part 1, Section 12, R716",
    "rule_name": "GoPro Usage",
    "question": "A team mounts a GoPro for match recording. What setting must be configured?",
    "options": [
      "4K resolution enabled",
      "Wireless capability turned off",
      "Loop recording on",
      "Image stabilization on"
    ],
    "correct_answer": 1,
    "explanation": "R716 allows self-contained recording devices like GoPro only if wireless capability is turned off.",
    "difficulty": 3,
    "category": "Control System",
    "season": "2025-2026",
    "tags": ["GoPro", "recording", "wireless"],
    "source_page": "Section 12.7, R716"
  },
  {
    "section": "Game Manual Part 1, Section 12, R619",
    "rule_name": "Power Mixing Rules",
    "question": "Can the +5V from a REV Expansion Hub power an I2C device connected to a REV Control Hub?",
    "options": [
      "Yes, they're compatible",
      "No, power cannot be mixed between devices",
      "Yes, with proper wiring",
      "Only for sensors"
    ],
    "correct_answer": 1,
    "explanation": "R619 prohibits using power from one regulation device on devices connected to another regulation device.",
    "difficulty": 7,
    "category": "Power Distribution",
    "season": "2025-2026",
    "tags": ["power", "mixing", "regulation devices"],
    "source_page": "Section 12.6, R619"
  },
  {
    "section": "Game Manual Part 1, Section 12, R712",
    "rule_name": "Control System Modifications",
    "question": "Which modification to a REV Control Hub is allowed?",
    "options": [
      "Drilling ventilation holes",
      "Replacing the enclosure",
      "Adding thermal interface material",
      "Rewiring internal connections"
    ],
    "correct_answer": 2,
    "explanation": "R712 allows thermal interface material to improve heat conduction but prohibits drilling, custom enclosures, or rewiring.",
    "difficulty": 5,
    "category": "Control System",
    "season": "2025-2026",
    "tags": ["modifications", "Control Hub", "thermal"],
    "source_page": "Section 12.7, R712"
  },
  {
    "section": "Game Manual Part 1, Section 12, R302",
    "rule_name": "Raw Material Modification",
    "question": "Which is considered a legal raw material that can be modified?",
    "options": [
      "Complete servo assembly",
      "Sheet aluminum stock",
      "Finished gearbox",
      "Motor controller"
    ],
    "correct_answer": 1,
    "explanation": "R302 lists sheet stock as an example of raw materials that can be modified. Complete assemblies are not raw materials.",
    "difficulty": 4,
    "category": "Robot Rules",
    "season": "2025-2026",
    "tags": ["raw materials", "modification", "fabrication"],
    "source_page": "Section 12.3, R302"
  },
  {
    "section": "Game Manual Part 1, Section 12, R206",
    "rule_name": "Scoring Element Damage",
    "question": "A robot's intake consistently tears small pieces off scoring elements. Is this legal?",
    "options": [
      "Yes, wear and tear is expected",
      "No, routinely tearing pieces violates R206",
      "Yes, if unintentional",
      "Only minor scratching is prohibited"
    ],
    "correct_answer": 1,
    "explanation": "R206 allows reasonable wear like scratching but prohibits gouging or routinely tearing off pieces of scoring elements.",
    "difficulty": 5,
    "category": "Robot Rules",
    "season": "2025-2026",
    "tags": ["scoring elements", "damage", "intake"],
    "source_page": "Section 12.2, R206"
  },
  {
    "section": "Game Manual Part 1, Section 12, R608",
    "rule_name": "Non-Battery Energy Storage",
    "question": "Which energy storage method is explicitly allowed on robots?",
    "options": [
      "Compressed gas cylinders",
      "Flywheel energy storage",
      "Springs and rubber bands",
      "Capacitor banks"
    ],
    "correct_answer": 2,
    "explanation": "R608 allows energy storage by deformation of robot parts including springs, rubber bands, and surgical tubing.",
    "difficulty": 4,
    "category": "Robot Rules",
    "season": "2025-2026",
    "tags": ["energy", "storage", "springs"],
    "source_page": "Section 12.6, R608"
  },
  {
    "section": "Game Manual Part 1, Section 12, R505",
    "rule_name": "SPARKmini Load Limit",
    "question": "How many motors can a single REV SPARKmini control?",
    "options": [
      "1 motor only",
      "2 motors per device",
      "3 motors maximum",
      "4 motors with splitter"
    ],
    "correct_answer": 1,
    "explanation": "R505 Table 12-3 specifies REV SPARKmini has a load limit of 2 Motors per Device.",
    "difficulty": 4,
    "category": "Power Distribution",
    "season": "2025-2026",
    "tags": ["SPARKmini", "motors", "load limit"],
    "source_page": "Section 12.5, R505"
  },
  {
    "section": "Game Manual Part 1, Section 12, R704",
    "rule_name": "Android Phone Requirements",
    "question": "What is the minimum Android version required for legal smartphones?",
    "options": [
      "Android 6 (Marshmallow)",
      "Android 7 (Nougat)",
      "Android 8 (Oreo)",
      "Android 9 (Pie)"
    ],
    "correct_answer": 1,
    "explanation": "R704 states Android smartphone devices must minimally be running Android 7 (Nougat) operating system.",
    "difficulty": 3,
    "category": "Control System",
    "season": "2025-2026",
    "tags": ["Android", "smartphone", "version"],
    "source_page": "Section 12.7, R704"
  },
  {
    "section": "Game Manual Part 1, Section 12, R711",
    "rule_name": "Robot Controller Visibility",
    "question": "What must be visible on the robot controller for inspection?",
    "options": [
      "Serial number only",
      "Team number label",
      "Diagnostic lights or device screen",
      "USB connections"
    ],
    "correct_answer": 2,
    "explanation": "R711 requires the robot controller be mounted so diagnostic lights or device screen are visible for inspection.",
    "difficulty": 4,
    "category": "Control System",
    "season": "2025-2026",
    "tags": ["robot controller", "inspection", "visibility"],
    "source_page": "Section 12.7, R711"
  },
  {
    "section": "Game Manual Part 1, Section 12, R403",
    "rule_name": "Team Number Stacking",
    "question": "Team 1355 wants to display their number vertically as '1' above '355'. Is this allowed?",
    "options": [
      "Yes, for space saving",
      "No, numbers may not be vertically stacked",
      "Yes, if each digit is correct size",
      "Only for 5-digit teams"
    ],
    "correct_answer": 1,
    "explanation": "R403 explicitly states that team numbers may not be vertically stacked, as shown in Figure 12-7.",
    "difficulty": 5,
    "category": "Robot Rules",
    "season": "2025-2026",
    "tags": ["team number", "stacking", "robot signs"],
    "source_page": "Section 12.4, R403"
  },
  {
    "section": "Game Manual Part 1, Section 12, R615",
    "rule_name": "Signal Level Wire Size",
    "question": "What is the minimum wire gauge for I2C connections?",
    "options": [
      "18 AWG",
      "22 AWG",
      "24 AWG",
      "28 AWG"
    ],
    "correct_answer": 3,
    "explanation": "R615 specifies SIGNAL LEVEL circuits including I2C require minimum 28 AWG wire.",
    "difficulty": 6,
    "category": "Power Distribution",
    "season": "2025-2026",
    "tags": ["wire gauge", "I2C", "signal level"],
    "source_page": "Section 12.6, R615"
  },
  {
    "section": "Game Manual Part 1, Section 12, R501",
    "rule_name": "Motor Gearbox Usage",
    "question": "A team removes the gearbox from a legal gearmotor and uses a different gearbox. Is this allowed?",
    "options": [
      "No, motors must stay as purchased",
      "Yes, motors may be used with any compatible gearbox",
      "Only with same brand gearbox",
      "Only if gear ratio is maintained"
    ],
    "correct_answer": 1,
    "explanation": "R501 notes legal gearmotors may be used with or without provided gearbox, and/or with any other compatible gearbox.",
    "difficulty": 5,
    "category": "Robot Rules",
    "season": "2025-2026",
    "tags": ["motors", "gearbox", "modification"],
    "source_page": "Section 12.5, R501"
  },
  {
    "section": "Game Manual Part 1, Section 12, R202",
    "rule_name": "Sharp Edge Safety",
    "question": "During inspection, a sharp metal edge is found on a robot's frame. What must the team do?",
    "options": [
      "Sign a waiver",
      "Add warning labels",
      "Remove or protect the sharp edge",
      "Nothing if it faces inward"
    ],
    "correct_answer": 2,
    "explanation": "R202 requires that protrusions and exposed surfaces shall not pose hazards, requiring sharp edges to be addressed.",
    "difficulty": 3,
    "category": "Safety",
    "season": "2025-2026",
    "tags": ["sharp edges", "safety", "inspection"],
    "source_page": "Section 12.2, R202"
  },
  {
    "section": "Game Manual Part 1, Section 12, R305",
    "rule_name": "Software Reuse",
    "question": "Can a team use robot code they developed for last year's game?",
    "options": [
      "No, all code must be new",
      "Yes, software created before Kickoff is permitted",
      "Only with major modifications",
      "Only library code"
    ],
    "correct_answer": 1,
    "explanation": "R305 explicitly permits ROBOT software and designs created before Kickoff.",
    "difficulty": 3,
    "category": "Robot Rules",
    "season": "2025-2026",
    "tags": ["software", "reuse", "pre-season"],
    "source_page": "Section 12.3, R305"
  },
  {
    "section": "Game Manual Part 1, Section 12, R612",
    "rule_name": "Electrical Inspection",
    "question": "Power regulating devices are covered by a panel during matches. Is this legal?",
    "options": [
      "No, they must always be visible",
      "Yes, if removable for inspection",
      "No, unless transparent",
      "Yes, for protection"
    ],
    "correct_answer": 1,
    "explanation": "R612 requires devices be visible for inspection but notes this doesn't require visibility in starting configuration if viewable during inspection.",
    "difficulty": 5,
    "category": "Power Distribution",
    "season": "2025-2026",
    "tags": ["inspection", "visibility", "power devices"],
    "source_page": "Section 12.6, R612"
  },
  {
    "section": "Game Manual Part 1, Section 12, R706",
    "rule_name": "Wi-Fi Bandwidth",
    "question": "What type of continuous streaming is explicitly prohibited over the robot Wi-Fi?",
    "options": [
      "Telemetry data",
      "Debug information",
      "Video stream",
      "Control data"
    ],
    "correct_answer": 2,
    "explanation": "R706 allows streaming of control data, debugging, and telemetry but explicitly states no continuous video stream is allowed.",
    "difficulty": 4,
    "category": "Control System",
    "season": "2025-2026",
    "tags": ["Wi-Fi", "streaming", "bandwidth"],
    "source_page": "Section 12.7, R706"
  },
  {
    "section": "Game Manual Part 1, Section 12, R614",
    "rule_name": "Servo Power Module Requirements",
    "question": "How must the REV Servo Power Module be powered?",
    "options": [
      "USB power from Control Hub",
      "Separate 6V battery",
      "Screw terminals from main battery only",
      "XT30 connectors"
    ],
    "correct_answer": 2,
    "explanation": "R614 Table 12-7 states REV Servo Power Module must be powered using screw terminals by the robot main battery only.",
    "difficulty": 6,
    "category": "Power Distribution",
    "season": "2025-2026",
    "tags": ["servo power", "wiring", "battery"],
    "source_page": "Section 12.6, R614"
  },
  {
    "section": "Game Manual Part 1, Section 12, R303",
    "rule_name": "Universal Joint Exception",
    "question": "Why are universal joints exempt from the single degree of freedom rule?",
    "options": [
      "They're commonly used",
      "They transfer motion between misaligned components",
      "They're low cost",
      "They're required for drivetrains"
    ],
    "correct_answer": 1,
    "explanation": "R303 exempts items that transfer motion between misaligned components like universal joints and flexible shaft couplers.",
    "difficulty": 6,
    "category": "Robot Rules",
    "season": "2025-2026",
    "tags": ["universal joint", "DoF", "exceptions"],
    "source_page": "Section 12.3, R303"
  },
  {
    "section": "Game Manual Part 1, Section 12, R605",
    "rule_name": "Battery as Ballast",
    "question": "A team wants to add an unused 12V battery for weight balance. Is this allowed?",
    "options": [
      "Yes, if disconnected",
      "Yes, for balance only",
      "No, extra batteries are prohibited as ballast",
      "Yes, with safety cover"
    ],
    "correct_answer": 2,
    "explanation": "R605 explicitly states no batteries other than those allowed for power are allowed on the robot, even as ballast.",
    "difficulty": 4,
    "category": "Power Distribution",
    "season": "2025-2026",
    "tags": ["battery", "ballast", "prohibited"],
    "source_page": "Section 12.6, R605"
  },
  {
    "section": "Game Manual Part 1, Section 12, R618",
    "rule_name": "Custom Circuit Restrictions",
    "question": "A team wants to add a voltage monitoring circuit between the battery and main switch. Is this allowed?",
    "options": [
      "No, cannot alter power pathways",
      "Yes, if high impedance monitoring",
      "Only with FTA approval",
      "Only for safety purposes"
    ],
    "correct_answer": 1,
    "explanation": "R618 allows high impedance voltage monitoring circuitry if the effect on power pathways is inconsequential.",
    "difficulty": 7,
    "category": "Power Distribution",
    "season": "2025-2026",
    "tags": ["custom circuit", "monitoring", "power pathway"],
    "source_page": "Section 12.6, R618"
  },
  {
    "section": "Game Manual Part 1, Section 12, VENDOR",
    "rule_name": "VENDOR Definition",
    "question": "A team's sponsor company, wholly owned by team parents, wants to sell parts to the team. Is this a legitimate VENDOR?",
    "options": [
      "Yes, if incorporated",
      "Yes, with tax ID",
      "No, cannot be wholly owned by team affiliates",
      "Yes, if selling to other teams too"
    ],
    "correct_answer": 2,
    "explanation": "VENDOR criteria B states it cannot be a 'wholly owned subsidiary' of a FIRST team or collection of teams.",
    "difficulty": 7,
    "category": "Robot Rules",
    "season": "2025-2026",
    "tags": ["VENDOR", "COTS", "ownership"],
    "source_page": "Section 12, VENDOR definition"
  },
  {
    "section": "Game Manual Part 1, Section 12, R709",
    "rule_name": "Wireless Communication",
    "question": "Which is NOT considered wireless communication under R709?",
    "options": [
      "Bluetooth module",
      "Infrared beam-break sensor",
      "Radio transmitter",
      "Wi-Fi adapter"
    ],
    "correct_answer": 1,
    "explanation": "R709 explicitly notes that non-RF sensors like beam-break or IR sensors detecting field elements are not wireless communication devices.",
    "difficulty": 5,
    "category": "Control System",
    "season": "2025-2026",
    "tags": ["wireless", "sensors", "communication"],
    "source_page": "Section 12.7, R709"
  },
  {
    "section": "Game Manual Part 1, Section 12, R901",
    "rule_name": "Driver Station Requirements",
    "question": "What must the operator console have for controlling the robot?",
    "options": [
      "Two driver station devices for redundancy",
      "One approved Android driver station device",
      "Any tablet with FTC app",
      "Laptop with USB controller"
    ],
    "correct_answer": 1,
    "explanation": "R901 states the operator console may only have one approved android-based driver station device connected and powered on.",
    "difficulty": 3,
    "category": "Control System",
    "season": "2025-2026",
    "tags": ["driver station", "operator console", "Android"],
    "source_page": "Section 12.9, R901"
  }
]

      console.log(`Inserting ${questions.length} questions...`)

      const { data, error } = await supabase
        .from('quiz_questions')
        .insert(questions)
        .select()

      console.log('Question insertion result:', data)
      console.log('Question insertion error:', error)

      if (error) {
        setError(`Question insertion error: ${error.message}`)
      } else {
        setError(`✅ Successfully inserted ${data.length} questions! ${questions.length - data.length > 0 ? `(${questions.length - data.length} questions may have been skipped due to duplicates or constraints)` : ''}`)
      }
    } catch (err: any) {
      setError(`Question insertion exception: ${err.message}`)
    }
  }

  const testQuizSubmission = async () => {
    if (!user) {
      setError('No user logged in')
      return
    }

    try {
      const testAttempt = {
        user_id: user.id,
        season: 'DECODE',
        score: 2,
        total_questions: 3,
        questions_answered: [
          { question_id: '1', user_answer: 2, correct_answer: 2, is_correct: true },
          { question_id: '2', user_answer: 1, correct_answer: 0, is_correct: false },
          { question_id: '3', user_answer: 2, correct_answer: 2, is_correct: true }
        ],
        time_taken: 45,
        is_guest: false
      }

      console.log('Submitting test quiz attempt:', testAttempt)

      const { data, error } = await supabase
        .from('quiz_attempts')
        .insert(testAttempt)
        .select()

      console.log('Test submission result:', data)
      console.log('Test submission error:', error)

      if (error) {
        setError(`Test submission error: ${error.message}`)
      } else {
        setError('Test submission successful!')
        await checkQuizAttempts(user.id)
        // Trigger leaderboard refresh
        window.dispatchEvent(new CustomEvent('quizCompleted'))
      }
    } catch (err: any) {
      setError(`Test submission exception: ${err.message}`)
    }
  }

  if (loading) {
    return <div className="p-4 text-white">Loading debug info...</div>
  }

  return (
    <div className="p-6 bg-gray-900 text-white rounded-lg max-w-4xl">
      <h2 className="text-2xl font-bold mb-4">Quiz Debug Information</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Current User</h3>
          <pre className="bg-gray-800 p-3 rounded text-sm overflow-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Quiz Attempts ({quizAttempts.length})</h3>
          <pre className="bg-gray-800 p-3 rounded text-sm overflow-auto max-h-64">
            {JSON.stringify(quizAttempts, null, 2)}
          </pre>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Leaderboard View Sample</h3>
          <pre className="bg-gray-800 p-3 rounded text-sm overflow-auto max-h-64">
            {JSON.stringify(leaderboardViews, null, 2)}
          </pre>
        </div>

        <div>
          <button
            onClick={insertNewQuestions}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded text-white mr-2 mb-2"
          >
            Insert New 100+ Questions
          </button>
          <button
            onClick={setupTomorrowsQuestions}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded text-white mr-2 mb-2"
          >
            Setup Tomorrow's Ranked Set
          </button>
        </div>

        <div>
          <button
            onClick={debugAttemptData}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-white mr-2"
          >
            Debug Attempt Data
          </button>
          <button
            onClick={addDateTrackingToAttempts}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white mr-2"
          >
            Fix Date Tracking
          </button>
          <button
            onClick={checkTodaysRankedAttempt}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white mr-2"
          >
            Check Today's Attempts
          </button>
          <button
            onClick={checkTodaysSpecificAttempt}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded text-white mr-2"
          >
            Detailed Today's Check
          </button>
          <button
            onClick={checkQuestionCount}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded text-white mr-2"
          >
            Check Question Count
          </button>
          <button
            onClick={insertQuizQuestions}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-white"
          >
            Insert Quiz Questions (Old)
          </button>
        </div>

        <div>
          <button
            onClick={testQuizSubmission}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
          >
            Test Quiz Submission
          </button>
        </div>

        <div>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('quizCompleted'))}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white ml-2"
          >
            Trigger Leaderboard Refresh
          </button>
        </div>
      </div>
    </div>
  )
}
