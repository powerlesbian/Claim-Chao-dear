/*
  # Fix User Roles RLS Infinite Recursion

  ## Summary
  Fixes infinite recursion error in user_roles table by simplifying RLS policies.
  The issue occurs when policies try to check admin status by querying the same
  table they're protecting, creating a circular dependency.

  ## Changes
  1. Drop all existing user_roles policies that cause recursion
  2. Create simple, non-recursive policies:
     - Users can always read their own role (no admin check needed)
     - Admins can read all roles using is_admin() function with SECURITY DEFINER
     - Only system can insert/update roles (admins must use admin functions)

  ## Security
  - Users maintain read access to their own role
  - Admin access uses SECURITY DEFINER function to bypass RLS during check
  - Insert/update restricted to service role for safety
*/

-- Drop all existing user_roles policies
DROP POLICY IF EXISTS "Users can read own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can read all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON user_roles;

-- Simple policy: Users can always read their own role (no recursion)
CREATE POLICY "Users can read own role"
  ON user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can read all roles using the SECURITY DEFINER function
-- This bypasses RLS during the admin check, preventing recursion
CREATE POLICY "Admins can read all roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (is_admin());

-- For insert/update, use service role or admin panel functions
-- This prevents recursion issues entirely
CREATE POLICY "Service role can insert roles"
  ON user_roles FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update roles"
  ON user_roles FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete roles"
  ON user_roles FOR DELETE
  TO service_role
  USING (true);