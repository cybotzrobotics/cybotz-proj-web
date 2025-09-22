require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function debugTeam9034() {
  try {
    // Check the current user profile data
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('team_number', 9034);
    
    console.log('=== CURRENT USER PROFILE DATA ===');
    console.log(JSON.stringify(profile, null, 2));
    
    // Manually run what the team_stats CTE should calculate
    const { data: manualCalc, error: calcError } = await supabase
      .from('user_profiles')
      .select('team_number, elo_rating, peak_elo')
      .eq('team_number', 9034);
    
    if (!calcError && manualCalc.length > 0) {
      console.log('\\n=== MANUAL CALCULATION ===');
      console.log('Count:', manualCalc.length);
      console.log('ELO values:', manualCalc.map(p => p.elo_rating));
      console.log('Peak ELO values:', manualCalc.map(p => p.peak_elo));
      console.log('Average ELO should be:', manualCalc.reduce((sum, p) => sum + p.elo_rating, 0) / manualCalc.length);
      console.log('Total peak ELO should be:', manualCalc.reduce((sum, p) => sum + p.peak_elo, 0));
    }
    
    // Check current leaderboard
    const { data: currentLB, error: lbError } = await supabase
      .from('team_leaderboard')
      .select('*')
      .eq('team_number', 9034);
    
    console.log('\\n=== CURRENT LEADERBOARD ===');
    console.log(JSON.stringify(currentLB, null, 2));
    
  } catch (err) {
    console.error('Debug error:', err);
  }
}

debugTeam9034();