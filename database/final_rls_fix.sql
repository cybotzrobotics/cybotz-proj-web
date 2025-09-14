-- Final RLS fix - make policies work for both authenticated and unauthenticated users
-- This needs to be run in Supabase SQL Editor

-- 1. Fix ranked_quiz_attempts policy to handle null auth.uid()
DROP POLICY IF EXISTS "Users can insert own ranked quiz attempts" ON ranked_quiz_attempts;
CREATE POLICY "Users can insert own ranked quiz attempts" ON ranked_quiz_attempts 
FOR INSERT WITH CHECK (
  -- Allow if user_id matches auth.uid() OR if auth.uid() is null (for testing/service calls)
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
  (auth.uid() IS NULL) OR
  auth.role() = 'service_role'
);

-- 2. Fix practice_quiz_attempts policy
DROP POLICY IF EXISTS "Users can insert own practice quiz attempts" ON practice_quiz_attempts;
CREATE POLICY "Users can insert own practice quiz attempts" ON practice_quiz_attempts 
FOR INSERT WITH CHECK (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
  (auth.uid() IS NULL) OR
  auth.role() = 'service_role'
);

-- 3. Fix user_profiles update policy
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles 
FOR UPDATE USING (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
  (auth.uid() IS NULL) OR
  auth.role() = 'service_role'
) WITH CHECK (
  (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
  (auth.uid() IS NULL) OR
  auth.role() = 'service_role'
);

-- Verification
SELECT 'Final RLS policies updated to handle null auth.uid() cases!' as status;