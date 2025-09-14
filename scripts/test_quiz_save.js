const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ubstludmzxcmasrmfcdb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVic3RsdWRtenhjbWFzcm1mY2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4MTY4NDIsImV4cCI6MjA3MzM5Mjg0Mn0.62OuMo0ZUUQR-bKMq2yjo0CCDbOY1gUIj3BP6SFOg4M'
);

async function testQuizSave() {
  console.log('🧪 Testing quiz attempt save to ranked_quiz_attempts...');
  
  // Get the user profile
  const { data: profiles, error: profileError } = await supabase
    .from('user_profiles')
    .select('user_id, username, elo_rating')
    .limit(1);
    
  if (profileError || !profiles.length) {
    console.error('❌ No user profile found:', profileError);
    return;
  }
  
  const userProfile = profiles[0];
  console.log(`👤 Testing with user: ${userProfile.username} (ELO: ${userProfile.elo_rating})`);
  
  // Create a test quiz attempt
  const testAttempt = {
    user_id: userProfile.user_id,
    season: '2025-2026',
    score: 7,
    total_questions: 10,
    questions_answered: [
      {
        question_id: '123e4567-e89b-12d3-a456-426614174000',
        user_answer: 1,
        correct_answer: 1,
        is_correct: true
      }
    ],
    time_taken: 180,
    accuracy: 70,
    date_attempted: new Date().toISOString().split('T')[0],
    is_guest: false
  };
  
  const { data: attemptData, error: attemptError } = await supabase
    .from('ranked_quiz_attempts')
    .insert(testAttempt)
    .select();
    
  if (attemptError) {
    console.error('❌ Error saving test quiz attempt:', attemptError);
    return;
  }
  
  console.log('✅ Test quiz attempt saved:', attemptData[0].id);
  
  // Now test the ELO update
  console.log('🔄 Testing ELO update...');
  const { data: eloData, error: eloError } = await supabase
    .rpc('update_user_elo', {
      user_uuid: userProfile.user_id,
      quiz_attempt_id: attemptData[0].id,
      questions_data: testAttempt.questions_answered
    });
    
  if (eloError) {
    console.error('❌ ELO update failed:', eloError);
  } else {
    console.log('✅ ELO update succeeded:', eloData);
  }
  
  // Clean up - delete the test attempt
  const { error: deleteError } = await supabase
    .from('ranked_quiz_attempts')
    .delete()
    .eq('id', attemptData[0].id);
    
  if (deleteError) {
    console.error('⚠️ Could not clean up test attempt:', deleteError);
  } else {
    console.log('🧹 Test attempt cleaned up');
  }
}

testQuizSave().then(() => {
  console.log('🎯 Quiz save test complete!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});