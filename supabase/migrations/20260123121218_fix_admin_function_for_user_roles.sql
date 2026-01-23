/*
  # Fix Admin Function to Use user_roles Table

  ## Summary
  Updates the is_admin() function to check the user_roles table instead of profiles table,
  fixing 500 errors on subscriptions and user_roles queries.

  ## Changes
  1. Drop and recreate is_admin() function to use user_roles table
  2. Function checks if user has 'admin' role in user_roles table

  ## Security
  - SECURITY DEFINER prevents recursion issues
  - Only checks user_roles for current authenticated user
*/

-- Drop and recreate the is_admin function to use user_roles table
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
