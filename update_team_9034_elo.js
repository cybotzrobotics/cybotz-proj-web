require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function updateTeam9034ELO() {
  try {
    // Update both elo_rating and peak_elo to 1060
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ 
        elo_rating: 1060,
        peak_elo: 1060 
      })
      .eq('team_number', 9034)
      .select();
    
    if (error) {
      console.error('Error updating ELO:', error);
      return;
    }
    
    console.log('Successfully updated team 9034 user profile:');
    console.log(JSON.stringify(data, null, 2));
    
    // Check the leaderboard after update
    const { data: leaderboard, error: lbError } = await supabase
      .from('team_leaderboard')
      .select('*')
      .eq('team_number', 9034);
    
    if (!lbError) {
      console.log('\\nTeam leaderboard after update:');
      console.log(JSON.stringify(leaderboard, null, 2));
    }
    
  } catch (err) {
    console.error('Script error:', err);
  }
}

updateTeam9034ELO();