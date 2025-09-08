-- Test the database functions directly
-- Run this in Supabase SQL editor to see what's happening

-- Test 1: Check if functions exist and can be called
SELECT 'Testing get_daily_ranked_questions function...' as test;

-- Test 2: Try calling the function
SELECT * FROM get_daily_ranked_questions() LIMIT 5;

-- Test 3: Check if daily_ranked_questions table has data
SELECT 'Checking daily_ranked_questions table...' as test;
SELECT COUNT(*) as daily_questions_count FROM daily_ranked_questions;
SELECT * FROM daily_ranked_questions LIMIT 5;

-- Test 4: Check if the function can access quiz_questions
SELECT 'Testing direct quiz_questions access...' as test;
SELECT COUNT(*) as total_questions FROM quiz_questions;
SELECT id, question FROM quiz_questions LIMIT 3;

-- Test 5: Test practice function too
SELECT 'Testing get_practice_questions function...' as test;
SELECT COUNT(*) as practice_count FROM get_practice_questions();

-- Test 6: Check current date
SELECT CURRENT_DATE as current_date;
