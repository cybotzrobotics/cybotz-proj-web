-- Fix RLS policies for profiles table to allow profile creation

-- Add missing INSERT policy for profiles
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Also add a trigger to automatically create profiles when users sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, elo_rating, peak_elo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    1000,
    1000
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create profiles for existing users who don't have them
INSERT INTO profiles (id, username, full_name, elo_rating, peak_elo, team_number)
SELECT DISTINCT 
  rqa.user_id,
  'User_' || SUBSTRING(rqa.user_id::text, 1, 8),
  'Quiz Participant',
  1000,
  1000,
  1
FROM ranked_quiz_attempts rqa
LEFT JOIN profiles p ON p.id = rqa.user_id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Verify the fix
SELECT 'Profile creation fix applied!' as status;
SELECT COUNT(*) as profiles_count FROM profiles;
SELECT COUNT(*) as leaderboard_count FROM individual_leaderboard;
