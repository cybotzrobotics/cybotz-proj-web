const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testDailyQuizRestriction() {
  console.log('=== TESTING DAILY QUIZ RESTRICTION ===');
  
  // Get a user who has taken a quiz today
  const { data: users } = await supabase
    .from('user_profiles')
    .select('user_id, username')
    .limit(3);
  
  if (!users || users.length === 0) {
    console.log('No users found');
    return;
  }
  
  const testUser = users[0]; // Test with first user
  console.log(`\nTesting with user: ${testUser.username} (${testUser.user_id})`);
  
  const today = new Date().toISOString().split('T')[0];
  
  // Check if they have a ranked attempt today
  const { data: rankedAttempts, error } = await supabase
    .from('ranked_quiz_attempts')
    .select('*')
    .eq('user_id', testUser.user_id)
    .eq('date_attempted', today)
    .eq('is_guest', false)
    .order('created_at', { ascending: false })
    .limit(1);
  
  console.log('\nRanked attempt check:');
  console.log('Data:', rankedAttempts);
  console.log('Error:', error);
  
  const rankedAttempt = rankedAttempts && rankedAttempts.length > 0 ? rankedAttempts[0] : null;
  
  if (rankedAttempt) {
    console.log('\n✅ USER HAS COMPLETED TODAY\'S RANKED QUIZ');
    console.log(`Score: ${rankedAttempt.score}/${rankedAttempt.total_questions}`);
    console.log(`Accuracy: ${rankedAttempt.accuracy}%`);
    if (rankedAttempt.elo_change) {
      console.log(`ELO Change: ${rankedAttempt.elo_before} → ${rankedAttempt.elo_after} (${rankedAttempt.elo_change > 0 ? '+' : ''}${rankedAttempt.elo_change})`);
    }
    console.log('\n⚠️  Should show "One ranked quiz per day!" message');
  } else {
    console.log('\n❌ USER HAS NOT COMPLETED TODAY\'S RANKED QUIZ');
    console.log('✅ Should be able to take ranked quiz');
  }
  
  // Test with all users
  console.log('\n=== ALL USERS STATUS ===');
  for (const user of users) {
    const { data: attempts } = await supabase
      .from('ranked_quiz_attempts')
      .select('score, total_questions, elo_change')
      .eq('user_id', user.user_id)
      .eq('date_attempted', today)
      .eq('is_guest', false)
      .order('created_at', { ascending: false })
      .limit(1);
    
    const attempt = attempts && attempts.length > 0 ? attempts[0] : null;
    
    if (attempt) {
      console.log(`✅ ${user.username}: Completed (${attempt.score}/${attempt.total_questions}, ELO: ${attempt.elo_change > 0 ? '+' : ''}${attempt.elo_change})`);
    } else {
      console.log(`❌ ${user.username}: Can take ranked quiz`);
    }
  }
}

testDailyQuizRestriction().catch(console.error);