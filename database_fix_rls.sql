-- FTC Quiz App - Database Setup and Fix
-- Run this in your Supabase SQL Editor

-- First, let's check what columns actually exist
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'quiz_questions';

-- Drop existing RLS policies if they exist
DROP POLICY IF EXISTS "Anyone can read quiz questions" ON quiz_questions;
DROP POLICY IF EXISTS "Users can insert quiz questions" ON quiz_questions;
DROP POLICY IF EXISTS "Admins can manage quiz questions" ON quiz_questions;

-- Create permissive RLS policies for quiz_questions
CREATE POLICY "Anyone can read quiz questions" ON quiz_questions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert quiz questions" ON quiz_questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update quiz questions" ON quiz_questions FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete quiz questions" ON quiz_questions FOR DELETE USING (true);

-- Insert sample questions using the correct schema (with 'question' column)
INSERT INTO quiz_questions (season, question, options, correct_answer, explanation, category, difficulty) VALUES
('DECODE', 'How many points does a robot score for placing a Sample in the High Basket during Autonomous?', 
 '["6 points", "8 points", "10 points", "12 points"]', 2, 
 'According to the DECODE game manual, robots score 10 points for each Sample placed in the High Basket during the Autonomous period.', 
 'Scoring', 'medium'),

('DECODE', 'What is the maximum height a robot can extend during the match?', 
 '["42 inches", "48 inches", "54 inches", "60 inches"]', 0, 
 'The maximum robot height extension is 42 inches as specified in the robot design constraints section.', 
 'Robot Design', 'easy'),

('DECODE', 'During which period can robots score Specimen points in the High Chamber?', 
 '["Autonomous only", "TeleOp only", "Both Autonomous and TeleOp", "Neither period"]', 2, 
 'Specimens can be scored in the High Chamber during both Autonomous and TeleOp periods, with different point values.', 
 'Game Rules', 'hard'),

('DECODE', 'What happens when a robot touches the Submersible zone during Autonomous?', 
 '["Nothing happens", "2 point penalty", "Robot is disabled", "5 bonus points"]', 0, 
 'There is no penalty for entering the Submersible zone during Autonomous period.', 
 'Game Rules', 'medium'),

('DECODE', 'How many Sample elements are there on the field at the start of each match?', 
 '["8 samples", "12 samples", "16 samples", "20 samples"]', 1, 
 'There are 12 Sample elements placed on the field at the beginning of each match.', 
 'Field Setup', 'easy'),

('DECODE', 'What is the maximum number of robots allowed on an alliance?', 
 '["1 robot", "2 robots", "3 robots", "4 robots"]', 1, 
 'Each alliance consists of exactly 2 robots working together.', 
 'Game Rules', 'easy'),

('DECODE', 'How many points is a Specimen worth when scored in the High Chamber during TeleOp?', 
 '["6 points", "10 points", "15 points", "20 points"]', 0, 
 'A Specimen scored in the High Chamber during TeleOp is worth 6 points.', 
 'Scoring', 'medium'),

('DECODE', 'What is the penalty for a robot that extends beyond the 42-inch height limit?', 
 '["Warning only", "5 point penalty", "Minor penalty", "Major penalty"]', 2, 
 'Exceeding the height limit results in a Minor penalty.', 
 'Penalties', 'hard'),

('DECODE', 'During which period can alliances earn Ascent points?', 
 '["Autonomous only", "TeleOp only", "End Game only", "Both TeleOp and End Game"]', 2, 
 'Ascent points can only be earned during the End Game period.', 
 'Scoring', 'medium'),

('DECODE', 'What color are the Sample elements?', 
 '["Red and Blue", "Yellow and Purple", "Red and Yellow", "Blue and Yellow"]', 2, 
 'Sample elements are Red and Yellow colored.', 
 'Field Setup', 'easy')
ON CONFLICT DO NOTHING;

-- Also fix RLS policies for quiz_attempts if they're too restrictive
DROP POLICY IF EXISTS "Users can view own quiz attempts" ON quiz_attempts;
DROP POLICY IF EXISTS "Users can insert own quiz attempts" ON quiz_attempts;

CREATE POLICY "Anyone can read quiz attempts" ON quiz_attempts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert quiz attempts" ON quiz_attempts FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Verification query
SELECT COUNT(*) as total_questions, season FROM quiz_questions GROUP BY season;
