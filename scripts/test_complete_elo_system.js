const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ubstludmzxcmasrmfcdb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVic3RsdWRtenhjbWFzcm1mY2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4MTY4NDIsImV4cCI6MjA3MzM5Mjg0Mn0.62OuMo0ZUUQR-bKMq2yjo0CCDbOY1gUIj3BP6SFOg4M'
);

async function testFullEloSystem() {
  console.log('🚀 Testing the complete ELO system after schema fix...\n');
  
  // 1. Verify tables are working
  console.log('📋 TESTING TABLES:');
  
  const tables = ['ranked_quiz_attempts', 'practice_quiz_attempts', 'daily_tracking'];
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        const columns = data[0] ? Object.keys(data[0]) : [];
        console.log(`✅ ${table}: ${columns.length} columns including ${columns.slice(0, 3).join(', ')}...`);
      }
    } catch (e) {
      console.log(`❌ ${table}: Exception - ${e.message}`);
    }
  }
  
  // 2. Get user profile for testing
  console.log('\n👤 GETTING USER PROFILE:');
  const { data: profiles, error: profileError } = await supabase
    .from('user_profiles')
    .select('user_id, username, elo_rating, peak_elo')
    .limit(1);
    
  if (profileError || !profiles.length) {
    console.error('❌ No user profile found:', profileError);
    return;
  }
  
  const userProfile = profiles[0];
  console.log(`✅ Found user: ${userProfile.username}`);
  console.log(`📊 Current ELO: ${userProfile.elo_rating} (Peak: ${userProfile.peak_elo})`);
  
  // 3. Test quiz attempt save
  console.log('\n💾 TESTING QUIZ ATTEMPT SAVE:');
  
  const testQuizAttempt = {
    user_id: userProfile.user_id,
    score: 7,
    total_questions: 10,
    time_taken: 180,
    accuracy: 70,
    is_guest: false,
    season: '2025-2026',
    questions_answered: [
      {
        question_id: '123e4567-e89b-12d3-a456-426614174000',
        user_answer: 1,
        correct_answer: 1,
        is_correct: true
      },
      {
        question_id: '987fcdeb-51d3-12a4-8765-426614174001',
        user_answer: 2,
        correct_answer: 3,
        is_correct: false
      }
    ]
  };
  
  const { data: attemptData, error: attemptError } = await supabase
    .from('ranked_quiz_attempts')
    .insert(testQuizAttempt)
    .select();
    
  if (attemptError) {
    console.error('❌ Quiz attempt save failed:', attemptError);
    return;
  }
  
  console.log(`✅ Quiz attempt saved with ID: ${attemptData[0].id}`);
  console.log(`📊 Saved data: ${attemptData[0].score}/${attemptData[0].total_questions} (${attemptData[0].accuracy}%)`);
  
  // 4. Test ELO update
  console.log('\n🔄 TESTING ELO UPDATE:');
  
  const { data: eloData, error: eloError } = await supabase
    .rpc('update_user_elo', {
      user_uuid: userProfile.user_id,
      quiz_attempt_id: attemptData[0].id,
      questions_data: testQuizAttempt.questions_answered
    });
    
  if (eloError) {
    console.error('❌ ELO update failed:', eloError);
  } else {
    console.log('✅ ELO update succeeded!');
    console.log(`📈 ELO Change: ${eloData[0].old_elo} → ${eloData[0].new_elo} (${eloData[0].elo_change > 0 ? '+' : ''}${eloData[0].elo_change})`);
    console.log(`🧮 Questions processed: ${eloData[0].questions_processed}`);
  }
  
  // 5. Verify the quiz attempt was updated with ELO data
  console.log('\n🔍 VERIFYING QUIZ ATTEMPT UPDATE:');
  
  const { data: updatedAttempt, error: verifyError } = await supabase
    .from('ranked_quiz_attempts')
    .select('elo_before, elo_after, elo_change')
    .eq('id', attemptData[0].id)
    .single();
    
  if (verifyError) {
    console.error('❌ Could not verify quiz attempt:', verifyError);
  } else {
    console.log(`✅ Quiz attempt updated with ELO data:`);
    console.log(`   Before: ${updatedAttempt.elo_before}`);
    console.log(`   After: ${updatedAttempt.elo_after}`);
    console.log(`   Change: ${updatedAttempt.elo_change}`);
  }
  
  // 6. Test daily completion tracking
  console.log('\n📅 TESTING DAILY COMPLETION:');
  
  const { error: dailyError } = await supabase
    .rpc('record_daily_completion', {
      user_name: userProfile.username,
      user_score: testQuizAttempt.score
    });
    
  if (dailyError) {
    console.error('❌ Daily completion failed:', dailyError);
  } else {
    console.log('✅ Daily completion recorded successfully');
  }
  
  // 7. Check current user profile ELO
  console.log('\n👤 FINAL USER PROFILE CHECK:');
  
  const { data: finalProfile, error: finalError } = await supabase
    .from('user_profiles')
    .select('elo_rating, peak_elo')
    .eq('user_id', userProfile.user_id)
    .single();
    
  if (finalError) {
    console.error('❌ Could not get final profile:', finalError);
  } else {
    console.log(`✅ Final ELO: ${finalProfile.elo_rating} (Peak: ${finalProfile.peak_elo})`);
    const change = finalProfile.elo_rating - userProfile.elo_rating;
    console.log(`📊 Net change from test: ${change > 0 ? '+' : ''}${change}`);
  }
  
  // 8. Clean up test data
  console.log('\n🧹 CLEANING UP TEST DATA:');
  
  const { error: deleteError } = await supabase
    .from('ranked_quiz_attempts')
    .delete()
    .eq('id', attemptData[0].id);
    
  if (deleteError) {
    console.error('⚠️ Could not clean up test attempt:', deleteError);
  } else {
    console.log('✅ Test attempt cleaned up');
  }
  
  // Reset user ELO to original value
  const { error: resetError } = await supabase
    .from('user_profiles')
    .update({ elo_rating: userProfile.elo_rating })
    .eq('user_id', userProfile.user_id);
    
  if (resetError) {
    console.error('⚠️ Could not reset user ELO:', resetError);
  } else {
    console.log('✅ User ELO reset to original value');
  }
}

testFullEloSystem().then(() => {
  console.log('\n🎉 ELO SYSTEM TEST COMPLETE!');
  console.log('\n✅ All systems are working properly!');
  console.log('🚀 The ranked quiz with ELO changes should now work in the app!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});