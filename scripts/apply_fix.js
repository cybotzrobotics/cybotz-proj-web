const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function createLeaderboardView() {
  console.log('Creating individual_leaderboard view...');
  
  const sql = fs.readFileSync('./database/create_individual_leaderboard_view.sql', 'utf8');
  
  const { data, error } = await supabase.rpc('exec_sql', { 
    sql_query: sql 
  });
  
  if (error) {
    console.error('Error creating view:', error);
  } else {
    console.log('View created successfully!');
  }
  
  // Test the new view
  console.log('\nTesting the new view:');
  const { data: testData, error: testError } = await supabase
    .from('individual_leaderboard')
    .select('*')
    .limit(10);
  
  console.log('Test data:', testData);
  console.log('Test error:', testError);
}

createLeaderboardView().catch(console.error);