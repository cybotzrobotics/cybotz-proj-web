-- Add missing columns to quiz_questions table to support CSV import
-- This will allow importing your 398 questions from the old database

ALTER TABLE quiz_questions 
ADD COLUMN IF NOT EXISTS question_type TEXT,
ADD COLUMN IF NOT EXISTS confidence_score INTEGER,
ADD COLUMN IF NOT EXISTS requires_review BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_verified TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS times_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS times_correct INTEGER DEFAULT 0;

-- Update the updated_at column if it doesn't exist
ALTER TABLE quiz_questions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes for the new columns for performance
CREATE INDEX IF NOT EXISTS idx_quiz_questions_question_type ON quiz_questions(question_type);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_requires_review ON quiz_questions(requires_review);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_times_used ON quiz_questions(times_used);

-- Add a trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_quiz_questions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_quiz_questions_updated_at ON quiz_questions;
CREATE TRIGGER trigger_update_quiz_questions_updated_at
  BEFORE UPDATE ON quiz_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_quiz_questions_updated_at();

-- Verification
SELECT 'Quiz questions table updated for CSV import!' as status;

-- Show the updated table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'quiz_questions'
ORDER BY ordinal_position;