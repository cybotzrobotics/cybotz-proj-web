require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function fixTeamLeaderboard() {
  try {
    // Delete the old quiz attempts that were retries (keep only the most recent one)
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('team_number', 9034)
      .single();
    
    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return;
    }
    
    console.log('User ID for team 9034:', profile.user_id);
    
    // Get all attempts sorted by date (newest first)
    const { data: attempts, error: attemptsError } = await supabase
      .from('ranked_quiz_attempts')
      .select('id, created_at, elo_after')
      .eq('user_id', profile.user_id)
      .order('created_at', { ascending: false });
    
    if (attemptsError) {
      console.error('Error fetching attempts:', attemptsError);
      return;
    }
    
    console.log('All attempts:', attempts);
    
    if (attempts.length > 1) {
      // Keep the most recent attempt (first in the array) and delete the others
      const attemptsToDelete = attempts.slice(1).map(a => a.id);
      
      console.log('Deleting old retry attempts:', attemptsToDelete);
      
      const { error: deleteError } = await supabase
        .from('ranked_quiz_attempts')
        .delete()
        .in('id', attemptsToDelete);
      
      if (deleteError) {
        console.error('Error deleting old attempts:', deleteError);
      } else {
        console.log('Successfully deleted', attemptsToDelete.length, 'old retry attempts');
        
        // Now check the team leaderboard again
        const { data: newLeaderboard, error: lbError } = await supabase
          .from('team_leaderboard')
          .select('*')
          .eq('team_number', 9034);
        
        if (!lbError) {
          console.log('Updated team leaderboard:', JSON.stringify(newLeaderboard, null, 2));
        }
      }
    } else {
      console.log('Only one attempt found, no cleanup needed');
    }
    
  } catch (err) {
    console.error('Script error:', err);
  }
}

fixTeamLeaderboard();