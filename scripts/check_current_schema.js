const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ubstludmzxcmasrmfcdb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVic3RsdWRtenhjbWFzcm1mY2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4MTY4NDIsImV4cCI6MjA3MzM5Mjg0Mn0.62OuMo0ZUUQR-bKMq2yjo0CCDbOY1gUIj3BP6SFOg4M'
);

async function checkCurrentSchema() {
  console.log('🔍 Checking current database schema...\n');
  
  // Check tables
  const tables = [
    'ftc_teams',
    'quiz_questions', 
    'user_profiles',
    'quiz_attempts',
    'ranked_quiz_attempts',
    'practice_quiz_attempts',
    'daily_ranked_questions',
    'daily_tracking',
    'team_leaderboard'
  ];
  
  console.log('📋 TABLES:');
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        const columns = data[0] ? Object.keys(data[0]) : [];
        console.log(`✅ ${table}: ${columns.length} columns - ${columns.slice(0, 5).join(', ')}${columns.length > 5 ? '...' : ''}`);
      }
    } catch (e) {
      console.log(`❌ ${table}: Exception - ${e.message}`);
    }
  }
  
  console.log('\n🔧 FUNCTIONS:');
  // Check key functions
  const functions = [
    'get_daily_ranked_questions',
    'calculate_elo_change', 
    'update_user_elo',
    'record_daily_completion',
    'get_team_leaderboard',
    'create_user_profile'
  ];
  
  for (const func of functions) {
    try {
      const { data, error } = await supabase.rpc(func);
      if (error) {
        if (error.message.includes('function') && error.message.includes('does not exist')) {
          console.log(`❌ ${func}: Does not exist`);
        } else {
          console.log(`✅ ${func}: Exists (error: ${error.message.slice(0, 50)}...)`);
        }
      } else {
        console.log(`✅ ${func}: Exists and callable`);
      }
    } catch (e) {
      console.log(`❌ ${func}: Exception - ${e.message.slice(0, 50)}...`);
    }
  }
  
  console.log('\n📊 TABLE DETAILS:');
  
  // Get detailed info for key tables
  const keyTables = ['user_profiles', 'ranked_quiz_attempts'];
  
  for (const table of keyTables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (!error && data[0]) {
        console.log(`\n${table} columns:`, Object.keys(data[0]));
      }
    } catch (e) {
      console.log(`\n${table}: Could not get details`);
    }
  }
}

checkCurrentSchema().then(() => {
  console.log('\n🎯 Schema check complete!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});