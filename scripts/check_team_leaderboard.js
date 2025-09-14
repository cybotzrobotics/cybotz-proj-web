const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkTeamLeaderboard() {
  console.log('=== CHECKING TEAM LEADERBOARD ===');
  
  // Check if team_leaderboard view exists
  console.log('1. Checking team_leaderboard view:');
  const { data: teamData, error: teamError } = await supabase
    .from('team_leaderboard')
    .select('*')
    .limit(5);
  
  console.log('Team leaderboard data:', teamData);
  console.log('Team leaderboard error:', teamError);
  
  // Check what teams we have in user_profiles
  console.log('\n2. Checking teams from user_profiles:');
  const { data: profileData, error: profileError } = await supabase
    .from('user_profiles')
    .select('team_number, team_name, elo_rating, peak_elo, username')
    .order('team_number');
  
  console.log('User profiles by team:', profileData);
  
  if (profileData && profileData.length > 0) {
    console.log('\n3. Team summary:');
    const teams = {};
    
    profileData.forEach(user => {
      const teamKey = user.team_number;
      if (!teams[teamKey]) {
        teams[teamKey] = {
          team_number: teamKey,
          team_name: user.team_name,
          members: [],
          elo_ratings: []
        };
      }
      teams[teamKey].members.push(user.username);
      teams[teamKey].elo_ratings.push(user.elo_rating);
    });
    
    Object.values(teams).forEach(team => {
      const avgElo = Math.round(team.elo_ratings.reduce((a, b) => a + b, 0) / team.elo_ratings.length);
      console.log(`Team ${team.team_number} (${team.team_name}): ${team.members.length} members, Avg ELO: ${avgElo}`);
      console.log(`  Members: ${team.members.join(', ')}`);
    });
  }
}

checkTeamLeaderboard().catch(console.error);