require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkAllTeams() {
  try {
    // Check all teams in the current leaderboard
    const { data: currentLeaderboard, error: lbError } = await supabase
      .from('team_leaderboard')
      .select('*')
      .order('rank');
    
    if (lbError) {
      console.error('Error fetching current leaderboard:', lbError);
      return;
    }
    
    console.log('Current team_leaderboard (all teams):');
    console.log(JSON.stringify(currentLeaderboard, null, 2));
    
    // Now check the actual user_profiles count for each team
    const { data: teamCounts, error: countError } = await supabase
      .from('user_profiles')
      .select('team_number')
      .not('team_number', 'is', null);
    
    if (countError) {
      console.error('Error fetching user profiles:', countError);
      return;
    }
    
    // Count users per team
    const teamCountMap = {};
    teamCounts.forEach(profile => {
      teamCountMap[profile.team_number] = (teamCountMap[profile.team_number] || 0) + 1;
    });
    
    console.log('\nActual user counts per team (from user_profiles):');
    Object.entries(teamCountMap).forEach(([teamNumber, count]) => {
      console.log(`Team ${teamNumber}: ${count} users`);
    });
    
    // Compare with what the leaderboard shows
    console.log('\nComparison (Leaderboard vs Actual):');
    currentLeaderboard.forEach(team => {
      const actualCount = teamCountMap[team.team_number] || 0;
      const leaderboardCount = team.team_size;
      const match = actualCount === leaderboardCount ? '✓' : '✗';
      console.log(`Team ${team.team_number}: Leaderboard=${leaderboardCount}, Actual=${actualCount} ${match}`);
    });
    
  } catch (err) {
    console.error('Script error:', err);
  }
}

checkAllTeams();