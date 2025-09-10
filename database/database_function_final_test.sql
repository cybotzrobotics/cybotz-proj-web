-- Test the recreated functions
-- Run this to verify they work and see what data they return

-- Test 1: Try calling the daily ranked function
SELECT 'Testing get_daily_ranked_questions...' as test;
SELECT * FROM get_daily_ranked_questions() LIMIT 3;

-- Test 2: Check if daily questions were generated
SELECT 'Checking daily_ranked_questions table...' as test;
SELECT COUNT(*) as count FROM daily_ranked_questions;
SELECT * FROM daily_ranked_questions LIMIT 3;

-- Test 3: Test practice function
SELECT 'Testing get_practice_questions...' as test;
SELECT COUNT(*) as practice_count FROM get_practice_questions();

-- Test 4: Check actual column types in quiz_questions
SELECT 'Checking quiz_questions column types...' as test;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'quiz_questions' 
AND column_name IN ('difficulty', 'tags', 'options')
ORDER BY ordinal_position;

-- Test 5: Look at actual data types in a sample row
SELECT 'Sample quiz_questions data...' as test;
SELECT 
  id,
  pg_typeof(difficulty) as difficulty_type,
  pg_typeof(tags) as tags_type,
  pg_typeof(options) as options_type,
  difficulty,
  tags,
  options
FROM quiz_questions 
LIMIT 1;
