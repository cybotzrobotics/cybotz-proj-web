const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ubstludmzxcmasrmfcdb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVic3RsdWRtenhja21hc3JtZmNkYiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzM3NjU3MDI5LCJleHAiOjIwNTMyMzMwMjl9.L9OQrcE1N4OG4KWmP4Tl4IfJTnvOl6YHEJsGFT1AMHY'
);

async function fixDailyQuestions() {
  console.log('🔄 Updating get_daily_ranked_questions to 10 questions...');
  
  // Update the function to use 10 questions
  const updateFunctionSQL = `
    CREATE OR REPLACE FUNCTION get_daily_ranked_questions(target_date DATE DEFAULT CURRENT_DATE)
    RETURNS TABLE (
      question_position INTEGER,
      id UUID,
      section TEXT,
      rule_name TEXT,
      question TEXT,
      options JSONB,
      correct_answer INTEGER,
      explanation TEXT,
      difficulty TEXT,
      category TEXT,
      season TEXT,
      tags JSONB,
      source_page TEXT,
      confidence INTEGER
    ) AS $$
    BEGIN
      -- Check if we have questions for this date
      IF NOT EXISTS (SELECT 1 FROM daily_ranked_questions WHERE date = target_date) THEN
        -- Generate new daily questions by selecting 10 random questions (reduced from 15)
        INSERT INTO daily_ranked_questions (date, question_id, question_position)
        SELECT 
          target_date,
          q.id,
          ROW_NUMBER() OVER (ORDER BY RANDOM())
        FROM quiz_questions q
        WHERE q.id NOT IN (
          -- Exclude questions used in the last 7 days
          SELECT drq.question_id 
          FROM daily_ranked_questions drq 
          WHERE drq.date > target_date - INTERVAL '7 days'
          AND drq.date < target_date
        )
        ORDER BY RANDOM()
        LIMIT 10; -- Changed from 15 to 10 questions per day
      END IF;

      -- Return the questions for the date
      RETURN QUERY
      SELECT 
        drq.question_position,
        q.id,
        COALESCE(q.section, '') as section,
        COALESCE(q.rule_name, '') as rule_name,
        COALESCE(q.question, '') as question,
        COALESCE(q.options, '[]'::jsonb) as options,
        COALESCE(q.correct_answer, 0) as correct_answer,
        COALESCE(q.explanation, '') as explanation,
        COALESCE(q.difficulty, 'medium') as difficulty,
        COALESCE(q.category, '') as category,
        COALESCE(q.season, '2025-2026') as season,
        COALESCE(q.tags, '[]'::jsonb) as tags,
        COALESCE(q.source_page, '') as source_page,
        COALESCE(q.confidence, 80) as confidence
      FROM daily_ranked_questions drq
      JOIN quiz_questions q ON q.id = drq.question_id
      WHERE drq.date = target_date
      ORDER BY drq.question_position;
    END;
    $$ LANGUAGE plpgsql;
  `;
  
  const { error: functionError } = await supabase.rpc('exec_sql', { 
    sql: updateFunctionSQL 
  });
  
  if (functionError) {
    console.error('❌ Error updating function:', functionError);
    return;
  }
  
  console.log('✅ Function updated to 10 questions per day');
  
  // Clear today's questions so they regenerate with 10
  console.log('🧹 Clearing today\'s questions for regeneration...');
  const { error: deleteError } = await supabase
    .from('daily_ranked_questions')
    .delete()
    .eq('date', new Date().toISOString().split('T')[0]);
  
  if (deleteError) {
    console.error('❌ Error clearing today\'s questions:', deleteError);
    return;
  }
  
  console.log('✅ Today\'s questions cleared');
  
  // Test the new function
  console.log('🧪 Testing new 10-question function...');
  const { data: newQuestions, error: testError } = await supabase.rpc('get_daily_ranked_questions');
  
  if (testError) {
    console.error('❌ Error testing function:', testError);
    return;
  }
  
  console.log(`✅ Success! Generated ${newQuestions.length} questions for today`);
  console.log('📊 Question positions:', newQuestions.map(q => q.question_position).sort((a, b) => a - b));
}

fixDailyQuestions().then(() => {
  console.log('🎉 Daily questions fix complete!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});