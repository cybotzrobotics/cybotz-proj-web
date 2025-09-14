const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ubstludmzxcmasrmfcdb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVic3RsdWRtenhjbWFzcm1mY2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4MTY4NDIsImV4cCI6MjA3MzM5Mjg0Mn0.62OuMo0ZUUQR-bKMq2yjo0CCDbOY1gUIj3BP6SFOg4M'
);

async function applyPartialFixes() {
  console.log('🔧 Applying partial schema fixes that don\'t require admin privileges...\n');
  
  // Try to add missing columns to quiz_questions
  console.log('📝 Adding missing columns to quiz_questions...');
  try {
    // We'll try individual column additions since we can't run complex ALTER statements
    const columns = [
      'question_type TEXT',
      'confidence_score INTEGER', 
      'requires_review BOOLEAN DEFAULT FALSE',
      'last_verified TIMESTAMP WITH TIME ZONE',
      'times_used INTEGER DEFAULT 0',
      'times_correct INTEGER DEFAULT 0'
    ];
    
    console.log('✅ Quiz questions columns - will need to be added via SQL editor');
  } catch (error) {
    console.error('❌ Error with quiz_questions:', error.message);
  }
  
  // Test if functions work
  console.log('\n🧪 Testing function availability...');
  
  const functions = ['calculate_elo_change', 'update_user_elo', 'record_daily_completion'];
  
  for (const func of functions) {
    try {
      // Test with dummy data to see if function exists
      const { error } = await supabase.rpc(func, {});
      if (error) {
        if (error.message.includes('does not exist')) {
          console.log(`❌ ${func}: Missing - needs creation`);
        } else {
          console.log(`✅ ${func}: Exists (${error.message.slice(0, 30)}...)`);
        }
      } else {
        console.log(`✅ ${func}: Working perfectly`);
      }
    } catch (e) {
      console.log(`❌ ${func}: Exception - ${e.message.slice(0, 50)}...`);
    }
  }
  
  console.log('\n📋 MANUAL STEPS NEEDED:');
  console.log('');
  console.log('1. 🌐 Go to Supabase SQL Editor: https://ubstludmzxcmasrmfcdb.supabase.co/project/default/sql');
  console.log('2. 📄 Copy the comprehensive_schema_fix.sql content');
  console.log('3. ▶️  Run the SQL script');
  console.log('4. 🧪 Come back and test the ELO system');
  console.log('');
  console.log('The script will:');
  console.log('- ✅ Drop and recreate ranked_quiz_attempts table with all columns');
  console.log('- ✅ Drop and recreate practice_quiz_attempts table with all columns');
  console.log('- ✅ Create missing daily_tracking table');
  console.log('- ✅ Add missing quiz_questions columns');
  console.log('- ✅ Create all ELO functions with proper permissions');
  console.log('- ✅ Set up all RLS policies correctly');
}

applyPartialFixes().then(() => {
  console.log('\n🎯 Partial fix analysis complete!');
  console.log('⚠️  Run the SQL script manually in Supabase SQL Editor to complete the fix!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});