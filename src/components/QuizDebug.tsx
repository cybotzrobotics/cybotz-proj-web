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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
    "season": "2024-2025",
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
        season: 'Into The Deep',
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
            onClick={checkQuestionCount}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded text-white mr-2"
          >
            Check Question Count
          </button>
          <button
            onClick={insertQuizQuestions}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-white"
          >
            Insert Quiz Questions
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
