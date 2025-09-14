const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testLeaderboard() {
  console.log('=== TESTING LEADERBOARD LOGIC ===');
  
  try {
    // Get all user profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('user_id, username, full_name, team_number, team_name, elo_rating, peak_elo');

    if (profilesError) throw profilesError;

    console.log(`Found ${profiles.length} user profiles`);

    // Build leaderboard data
    const leaderboardData = [];

    for (const profile of profiles) {
      // Get quiz stats for this user
      const { data: quizAttempts, error: quizError } = await supabase
        .from('ranked_quiz_attempts')
        .select('score, accuracy, time_taken, created_at')
        .eq('user_id', profile.user_id)
        .eq('is_guest', false);

      if (quizError) {
        console.error('Error fetching quiz attempts for', profile.username, quizError);
        continue;
      }

      // Calculate stats
      const attempts = quizAttempts.length;
      const bestScore = attempts > 0 ? Math.max(...quizAttempts.map(q => q.score)) : 0;
      const bestAccuracy = attempts > 0 ? Math.max(...quizAttempts.map(q => q.accuracy)) : 0;
      const validTimes = quizAttempts.filter(q => q.time_taken != null).map(q => q.time_taken);
      const bestTime = validTimes.length > 0 ? Math.min(...validTimes) : 0;
      const lastAttempt = attempts > 0 ? quizAttempts[quizAttempts.length - 1].created_at : null;

      // Only include users who have made at least one attempt
      if (attempts > 0) {
        leaderboardData.push({
          id: profile.user_id,
          username: profile.username,
          full_name: profile.full_name,
          team_number: profile.team_number,
          team_name: profile.team_name,
          best_score: bestScore,
          best_accuracy: bestAccuracy,
          best_time: bestTime,
          attempts: attempts,
          last_attempt: lastAttempt,
          rank: 0 // Will be set after sorting
        });
      }
    }

    // Sort by best score (descending), then by best accuracy (descending), then by best time (ascending)
    leaderboardData.sort((a, b) => {
      if (a.best_score !== b.best_score) return b.best_score - a.best_score;
      if (a.best_accuracy !== b.best_accuracy) return b.best_accuracy - a.best_accuracy;
      return a.best_time - b.best_time;
    });

    // Assign ranks
    leaderboardData.forEach((player, index) => {
      player.rank = index + 1;
    });

    console.log('\n=== LEADERBOARD RESULTS ===');
    console.log(`Total players with attempts: ${leaderboardData.length}`);
    
    leaderboardData.forEach((player, index) => {
      console.log(`${index + 1}. ${player.username} - Score: ${player.best_score}, Accuracy: ${player.best_accuracy}%, Attempts: ${player.attempts}`);
    });

    if (leaderboardData.length === 0) {
      console.log('⚠️  No players found with quiz attempts. Users need to complete ranked quizzes to appear on leaderboard.');
    } else {
      console.log('✅ Leaderboard data generated successfully!');
    }

  } catch (error) {
    console.error('❌ Error testing leaderboard:', error);
  }
}

testLeaderboard().catch(console.error);