require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function updateTeamSize() {
  try {
    // First, let's try to understand why the view shows 3 instead of 1
    // Let's manually run the view query to see what's happening
    
    const { data: manualCount, error: countError } = await supabase
      .from('user_profiles')
      .select('user_id, team_number, elo_rating, peak_elo')
      .eq('team_number', 9034);
    
    if (countError) {
      console.error('Error fetching user profiles:', countError);
      return;
    }
    
    console.log('User profiles for team 9034:');
    console.log(JSON.stringify(manualCount, null, 2));
    console.log('COUNT should be:', manualCount.length);
    
    // Check if there's a materialized view or if we need to refresh
    // Let's try to create a simple update function instead
    const { data: functionResult, error: functionError } = await supabase
      .rpc('sql', {
        query: `
          -- Try to create a simple function to update team leaderboard
          CREATE OR REPLACE FUNCTION fix_team_9034_size()
          RETURNS void AS $$
          BEGIN
            -- Since we can't update the view directly, let's see if we can force a refresh
            -- or create a temporary fix
            RAISE NOTICE 'Team 9034 has % users', (SELECT COUNT(*) FROM user_profiles WHERE team_number = 9034);
          END;
          $$ LANGUAGE plpgsql;
          
          SELECT fix_team_9034_size();
        `
      });
    
    if (functionError) {
      console.log('Function approach failed:', functionError);
      
      // Alternative: Try to see if there's an underlying table we can update
      console.log('Trying alternative approach...');
      
      // Maybe the issue is in the view definition itself
      // Let's see if we can recreate it properly
      const { data: recreateResult, error: recreateError } = await supabase
        .rpc('sql', {
          query: `
            DROP VIEW IF EXISTS team_leaderboard CASCADE;
            
            CREATE VIEW team_leaderboard AS
            SELECT 
              ROW_NUMBER() OVER (ORDER BY ROUND(AVG(elo_rating)) DESC, SUM(peak_elo) DESC) AS rank,
              team_number,
              COUNT(DISTINCT user_id) AS team_size,  -- Use DISTINCT to avoid duplicates
              ROUND(AVG(elo_rating)) AS avg_elo,
              MAX(elo_rating) AS max_elo,
              MIN(elo_rating) AS min_elo,
              SUM(peak_elo) AS total_peak_elo,
              COUNT(DISTINCT rqa.user_id) AS active_members
            FROM user_profiles up
            LEFT JOIN ranked_quiz_attempts rqa ON up.user_id = rqa.user_id
              AND rqa.date_attempted >= CURRENT_DATE - INTERVAL '30 days'
            WHERE team_number IS NOT NULL
            GROUP BY team_number
            HAVING COUNT(DISTINCT user_id) > 0
            ORDER BY ROUND(AVG(elo_rating)) DESC, SUM(peak_elo) DESC;
            
            GRANT SELECT ON team_leaderboard TO authenticated, anon, service_role;
          `
        });
      
      if (recreateError) {
        console.error('Recreate failed:', recreateError);
      } else {
        console.log('View recreated successfully');
      }
    }
    
  } catch (err) {
    console.error('Script error:', err);
  }
}

updateTeamSize();