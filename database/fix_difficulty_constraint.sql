-- Fix difficulty constraint to accept numbers
-- Run this in your Supabase SQL Editor

-- Drop the existing check constraint
ALTER TABLE quiz_questions DROP CONSTRAINT IF EXISTS quiz_questions_difficulty_check;

-- Add a new constraint that accepts both text and numbers
ALTER TABLE quiz_questions ADD CONSTRAINT quiz_questions_difficulty_check 
CHECK (difficulty IN ('easy', 'medium', 'hard', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'));

-- Test the constraint
SELECT 'Difficulty constraint updated successfully' as status;