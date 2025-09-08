-- Quick database check script
-- Run this in Supabase SQL editor to see what's missing

-- Check if tables exist
SELECT 'daily_ranked_questions' as table_name, 
       CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'daily_ranked_questions') 
            THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 'practice_quiz_attempts' as table_name,
       CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'practice_quiz_attempts') 
            THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 'ranked_quiz_attempts' as table_name,
       CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ranked_quiz_attempts') 
            THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 'quiz_attempts' as table_name,
       CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'quiz_attempts') 
            THEN 'EXISTS' ELSE 'MISSING' END as status;

-- Check if functions exist
SELECT 'get_daily_ranked_questions' as function_name,
       CASE WHEN EXISTS (SELECT FROM information_schema.routines WHERE routine_name = 'get_daily_ranked_questions') 
            THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 'get_practice_questions' as function_name,
       CASE WHEN EXISTS (SELECT FROM information_schema.routines WHERE routine_name = 'get_practice_questions') 
            THEN 'EXISTS' ELSE 'MISSING' END as status;

-- Check if quiz_questions table has data
SELECT 'quiz_questions_count' as check_name, COUNT(*)::text as status FROM quiz_questions;
