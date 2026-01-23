/*
  # Fix Infinite Recursion in Profiles RLS

  ## Summary
  Fixes the infinite recursion error caused by policies that query the profiles table while checking access to the profiles table.

  ## Changes
  1. Drop all existing policies on profiles table
  2. Create simpler policies that don't cause recursion
  3. Use a helper function to check admin status without recursion

  ## Security
  - Users can still only view their own profile
  - Admin checks are done via a SECURITY DEFINER function to avoid recursion
*/

-- Drop all existing policies on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;

-- Drop admin policies on subscriptions that also cause issues
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Admins can insert any subscription" ON subscriptions;
DROP POLICY IF EXISTS "Admins can update any subscription" ON subscriptions;
DROP POLICY IF EXISTS "Admins can delete any subscription" ON subscriptions;

-- Create a security definer function to check admin status
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy: Users can view their own profile (simple, no recursion)
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Recreate admin subscription policies using the function
CREATE POLICY "Admins can view all subscriptions"
  ON subscriptions
  FOR SELECT
  TO authenticated
  USING (is_admin() OR user_id = auth.uid());

CREATE POLICY "Admins can insert any subscription"
  ON subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin() OR user_id = auth.uid());

CREATE POLICY "Admins can update any subscription"
  ON subscriptions
  FOR UPDATE
  TO authenticated
  USING (is_admin() OR user_id = auth.uid())
  WITH CHECK (is_admin() OR user_id = auth.uid());

CREATE POLICY "Admins can delete any subscription"
  ON subscriptions
  FOR DELETE
  TO authenticated
  USING (is_admin() OR user_id = auth.uid());