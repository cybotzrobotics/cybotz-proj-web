const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ubstludmzxcmasrmfcdb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVic3RsdWRtenhjbWFzcm1mY2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4MTY4NDIsImV4cCI6MjA3MzM5Mjg0Mn0.62OuMo0ZUUQR-bKMq2yjo0CCDbOY1gUIj3BP6SFOg4M'
);

async function checkSchemaStatus() {
  console.log('🔍 Checking current schema status after fix...\n');
  
  // Check if tables actually have columns now
  const tables = ['ranked_quiz_attempts', 'practice_quiz_attempts', 'daily_tracking'];
  
  for (const table of tables) {
    console.log(`\n📋 Checking ${table}:`);
    
    try {
      // Try to insert a dummy row to see the actual schema
      const { error } = await supabase.from(table).insert({}).select();
      
      if (error) {
        console.log(`❌ Insert test failed: ${error.message}`);
        
        // Check if it's an RLS error vs schema error
        if (error.message.includes('row-level security')) {
          console.log('   🔒 RLS policy issue detected');
        } else if (error.message.includes('violates not-null constraint')) {
          console.log('   ✅ Table has columns (not-null constraint means columns exist)');
        } else if (error.message.includes('column')) {
          console.log('   ❌ Column-related issue');
        }
      }
    } catch (e) {
      console.log(`❌ Exception: ${e.message}`);
    }
  }
  
  // Check functions
  console.log('\n🔧 Checking functions:');
  
  try {
    const { error } = await supabase.rpc('calculate_elo_change', {
      current_elo: 1000,
      is_correct: true,
      difficulty: 'medium'
    });
    
    if (error) {
      console.log(`❌ calculate_elo_change: ${error.message}`);
    } else {
      console.log('✅ calculate_elo_change: Working');
    }
  } catch (e) {
    console.log(`❌ calculate_elo_change exception: ${e.message}`);
  }
  
  // Check daily questions
  console.log('\n📊 Checking daily questions:');
  
  try {
    const { data, error } = await supabase.rpc('get_daily_ranked_questions');
    
    if (error) {
      console.log(`❌ get_daily_ranked_questions: ${error.message}`);
    } else {
      console.log(`✅ get_daily_ranked_questions: ${data.length} questions`);
    }
  } catch (e) {
    console.log(`❌ get_daily_ranked_questions exception: ${e.message}`);
  }
}

checkSchemaStatus().then(() => {
  console.log('\n🎯 Schema status check complete!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});