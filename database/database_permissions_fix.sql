-- Grant permissions for RPC calls
-- Run this if the functions exist but can't be called from frontend

GRANT EXECUTE ON FUNCTION get_daily_ranked_questions TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_ranked_questions TO anon;
GRANT EXECUTE ON FUNCTION get_practice_questions TO authenticated; 
GRANT EXECUTE ON FUNCTION get_practice_questions TO anon;
