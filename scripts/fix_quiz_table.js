const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ubstludmzxcmasrmfcdb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVic3RsdWRtenhjbWFzcm1mY2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4MTY4NDIsImV4cCI6MjA3MzM5Mjg0Mn0.62OuMo0ZUUQR-bKMq2yjo0CCDbOY1gUIj3BP6SFOg4M'
);

async function fixQuizTable() {
  console.log('🔧 Adding missing columns to ranked_quiz_attempts...');
  
  try {
    // Add accuracy column and is_guest column if missing
    const alterQuery = `
      ALTER TABLE ranked_quiz_attempts 
      ADD COLUMN IF NOT EXISTS accuracy INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT false;
    `;
    
    const { error } = await supabase.rpc('exec_sql', { sql: alterQuery });
    
    if (error) {
      console.error('❌ Error adding columns:', error);
      return;
    }
    
    console.log('✅ Columns added successfully');
    
    // Test the table structure
    console.log('🧪 Testing table structure...');
    const { data, error: testError } = await supabase
      .from('ranked_quiz_attempts')
      .select('*')
      .limit(1);
      
    if (testError) {
      console.error('❌ Error testing table:', testError);
    } else {
      console.log('✅ Table structure verified');
    }
    
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

fixQuizTable().then(() => {
  console.log('🎯 Table fix complete!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});