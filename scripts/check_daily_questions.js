const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ubstludmzxcmasrmfcdb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVic3RsdWRtenhjbWFzcm1mY2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4MTY4NDIsImV4cCI6MjA3MzM5Mjg0Mn0.62OuMo0ZUUQR-bKMq2yjo0CCDbOY1gUIj3BP6SFOg4M'
);

async function fixDailyQuestions() {
  // First, clear today's questions so they regenerate
  console.log('🧹 Clearing today\'s questions for regeneration...');
  const today = new Date().toISOString().split('T')[0];
  
  const { error: deleteError } = await supabase
    .from('daily_ranked_questions')
    .delete()
    .eq('date', today);
  
  if (deleteError) {
    console.error('❌ Error clearing today\'s questions:', deleteError);
    // Continue anyway, might not have permissions
  } else {
    console.log('✅ Today\'s questions cleared');
  }
  
  // Test how many questions we get now
  console.log('🧪 Testing current question count...');
  const { data: questions, error: testError } = await supabase.rpc('get_daily_ranked_questions');
  
  if (testError) {
    console.error('❌ Error getting questions:', testError);
    return;
  }
  
  console.log(`📊 Current question count: ${questions.length}`);
  console.log('📋 Question positions:', questions.map(q => q.question_position).sort((a, b) => a - b));
  
  if (questions.length === 15) {
    console.log('⚠️  Still showing 15 questions - the function needs to be updated on the database side');
    console.log('💡 The function update requires service role permissions');
  } else if (questions.length === 10) {
    console.log('✅ Perfect! Now showing 10 questions per day');
  } else {
    console.log(`🤔 Unexpected count: ${questions.length} questions`);
  }
}

fixDailyQuestions().then(() => {
  console.log('🎯 Daily questions check complete!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});