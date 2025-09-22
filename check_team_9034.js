require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkQuizAttempts() {
  try {
    // First, get the user_id for team 9034
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id, username, team_number')
      .eq('team_number', 9034)
      .single();
    
    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return;
    }
    
    console.log('User profile for team 9034:', profile);
    
    // Now check ranked_quiz_attempts for this user_id
    const { data: attempts, error } = await supabase
      .from('ranked_quiz_attempts')
      .select('*')
      .eq('user_id', profile.user_id)
      .order('date_attempted');
    
    if (error) {
      console.error('Error fetching quiz attempts:', error);
      return;
    }
    
    console.log('Ranked quiz attempts for user:', attempts.length);
    console.log(JSON.stringify(attempts, null, 2));
    
    // Now check what the actual view is doing
    const { data: viewData, error: viewError } = await supabase
      .from('team_leaderboard')
      .select('*')
      .eq('team_number', 9034);
    
    if (viewError) {
      console.error('View error:', viewError);
    } else {
      console.log('\nTeam leaderboard view data:');
      console.log(JSON.stringify(viewData, null, 2));
    }
    
  } catch (err) {
    console.error('Script error:', err);
  }
}

checkQuizAttempts();