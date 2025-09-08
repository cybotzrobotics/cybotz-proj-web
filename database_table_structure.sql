-- Check the actual structure of quiz_questions table
DESCRIBE quiz_questions;

-- Alternative way to see column types
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'quiz_questions' 
ORDER BY ordinal_position;
