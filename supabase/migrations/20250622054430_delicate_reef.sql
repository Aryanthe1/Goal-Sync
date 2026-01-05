/*
  # GoalSync Database Schema

  1. New Tables
    - `profiles` - User profile information
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, unique)
      - `full_name` (text, nullable)
      - `created_at` (timestamp)
    
    - `goals` - Weekly goals
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `title` (text)
      - `description` (text, nullable)
      - `target_days` (integer)
      - `week_start` (date)
      - `created_at` (timestamp)
    
    - `daily_completions` - Daily goal completion tracking
      - `id` (uuid, primary key)
      - `goal_id` (uuid, references goals)
      - `user_id` (uuid, references profiles)
      - `date` (date)
      - `completed` (boolean)
      - `created_at` (timestamp)
    
    - `burnout_checkins` - Daily wellness check-ins
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `date` (date)
      - `stress_level` (integer 1-5)
      - `sleep_hours` (numeric)
      - `mood_level` (integer 1-5)
      - `time_spent_hours` (numeric)
      - `burnout_score` (numeric)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access their own data
    - Create trigger for automatic profile creation
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create goals table
CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  target_days integer NOT NULL DEFAULT 5,
  week_start date NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- Create daily_completions table
CREATE TABLE IF NOT EXISTS daily_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid REFERENCES goals(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(goal_id, date)
);

ALTER TABLE daily_completions ENABLE ROW LEVEL SECURITY;

-- Create burnout_checkins table
CREATE TABLE IF NOT EXISTS burnout_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  stress_level integer CHECK (stress_level >= 1 AND stress_level <= 5) NOT NULL,
  sleep_hours numeric CHECK (sleep_hours >= 0 AND sleep_hours <= 24) NOT NULL,
  mood_level integer CHECK (mood_level >= 1 AND mood_level <= 5) NOT NULL,
  time_spent_hours numeric CHECK (time_spent_hours >= 0 AND time_spent_hours <= 24) NOT NULL,
  burnout_score numeric CHECK (burnout_score >= 0 AND burnout_score <= 10) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE burnout_checkins ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Goals policies
CREATE POLICY "Users can read own goals"
  ON goals
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Daily completions policies
CREATE POLICY "Users can manage own completions"
  ON daily_completions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Burnout checkins policies
CREATE POLICY "Users can manage own checkins"
  ON burnout_checkins
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to automatically create profile
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();