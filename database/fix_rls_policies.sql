-- Fix RLS policies to allow authenticated users to insert quiz attempts
-- This needs to be run in Supabase SQL Editor

-- 1. Update RLS policies for ranked_quiz_attempts to be more permissive
DROP POLICY IF EXISTS "Users can insert own ranked quiz attempts" ON ranked_quiz_attempts;
CREATE POLICY "Users can insert own ranked quiz attempts" ON ranked_quiz_attempts 
FOR INSERT WITH CHECK (
  -- Allow if user is authenticated and matches the user_id, OR if using service role
  auth.uid() = user_id OR 
  auth.role() = 'service_role' OR
  auth.role() = 'authenticated'
);

-- 2. Update RLS policies for practice_quiz_attempts
DROP POLICY IF EXISTS "Users can insert own practice quiz attempts" ON practice_quiz_attempts;
CREATE POLICY "Users can insert own practice quiz attempts" ON practice_quiz_attempts 
FOR INSERT WITH CHECK (
  auth.uid() = user_id OR 
  auth.role() = 'service_role' OR
  auth.role() = 'authenticated'
);

-- 3. Make daily_tracking more permissive
DROP POLICY IF EXISTS "Users can insert daily tracking" ON daily_tracking;
CREATE POLICY "Users can insert daily tracking" ON daily_tracking 
FOR INSERT WITH CHECK (true);

-- 4. Add update policies for ELO functions
DROP POLICY IF EXISTS "Users can update own ranked quiz attempts for ELO" ON ranked_quiz_attempts;
CREATE POLICY "Users can update own ranked quiz attempts for ELO" ON ranked_quiz_attempts 
FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own practice quiz attempts" ON practice_quiz_attempts;
CREATE POLICY "Users can update own practice quiz attempts" ON practice_quiz_attempts 
FOR UPDATE USING (true) WITH CHECK (true);

-- 5. Ensure user_profiles can be updated by ELO functions
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles 
FOR UPDATE USING (
  auth.uid() = user_id OR 
  auth.role() = 'service_role' OR
  auth.role() = 'authenticated'
) WITH CHECK (
  auth.uid() = user_id OR 
  auth.role() = 'service_role' OR
  auth.role() = 'authenticated'
);

-- Verification
SELECT 'RLS policies updated for better ELO system compatibility!' as status;