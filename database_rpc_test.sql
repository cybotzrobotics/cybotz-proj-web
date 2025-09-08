-- Test RPC call exactly like the frontend does
-- This simulates what the supabase.rpc() call should do

-- Test authenticated RPC call
SELECT rpc.get_daily_ranked_questions() FROM (SELECT 1) AS rpc;

-- Alternative test - call function directly as RPC
SELECT get_daily_ranked_questions();

-- Check function permissions
SELECT 
  proname as function_name,
  proacl as permissions
FROM pg_proc 
WHERE proname IN ('get_daily_ranked_questions', 'get_practice_questions');

-- Check if functions are in correct schema
SELECT 
  schemaname,
  proname as function_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE proname IN ('get_daily_ranked_questions', 'get_practice_questions');
