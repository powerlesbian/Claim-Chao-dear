/*
  # Migrate Admin System to User Roles

  ## Summary
  Removes old profile-based admin system and ensures all RLS policies use the user_roles table.

  ## Changes
  1. Drop all old admin policies that reference profiles.is_admin
  2. Ensure subscriptions policies only check user_roles table
  3. Clean up duplicate policies

  ## Security
  - All admin checks now use user_roles.role = 'admin'
  - No more references to profiles.is_admin
  - Maintains existing security while simplifying the system
*/

-- Drop old profile-based admin policies from subscriptions
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Admins can insert any subscription" ON subscriptions;
DROP POLICY IF EXISTS "Admins can update any subscription" ON subscriptions;
DROP POLICY IF EXISTS "Admins can delete any subscription" ON subscriptions;

-- Drop old profile-based policies from profiles table
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;

-- Update profiles policies to use user_roles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Note: The subscriptions admin policies are already created in the previous migration
-- (Admin view all subscriptions, Admin update all subscriptions, Admin delete all subscriptions)
-- which correctly use user_roles table
