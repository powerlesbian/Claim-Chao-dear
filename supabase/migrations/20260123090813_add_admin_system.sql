/*
  # Add Admin System

  ## Summary
  Adds admin role system to allow super admins to access and manage all data in the application.

  ## New Tables
  - `profiles`
    - `id` (uuid, primary key) - References auth.users, unique identifier for each user
    - `email` (text) - User's email address
    - `is_admin` (boolean) - Whether the user has admin privileges
    - `created_at` (timestamptz) - When the profile was created

  ## Security Changes
  - Add RLS policies allowing admins to view/edit all subscriptions
  - Add RLS policies for profiles table
  - Users can view their own profile
  - Admins can view all profiles
  - Only admins can update admin status

  ## Notes
  - By default, users are not admins
  - First user can be manually set as admin via SQL
  - Admins can see and manage all subscription data
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create index for faster admin queries
CREATE INDEX IF NOT EXISTS profiles_is_admin_idx ON profiles(is_admin) WHERE is_admin = true;

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy: Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Policy: Admins can update any profile
CREATE POLICY "Admins can update profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Add admin policies for subscriptions table
-- Policy: Admins can view all subscriptions
CREATE POLICY "Admins can view all subscriptions"
  ON subscriptions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Policy: Admins can insert any subscription
CREATE POLICY "Admins can insert any subscription"
  ON subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Policy: Admins can update any subscription
CREATE POLICY "Admins can update any subscription"
  ON subscriptions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Policy: Admins can delete any subscription
CREATE POLICY "Admins can delete any subscription"
  ON subscriptions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, is_admin)
  VALUES (NEW.id, NEW.email, false);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();