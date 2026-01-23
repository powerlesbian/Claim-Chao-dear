/*
  # Add Admin Role Management Functions

  ## Summary
  Creates secure functions for admins to manage user roles without triggering
  RLS recursion. These functions use SECURITY DEFINER to bypass RLS checks.

  ## Changes
  1. Create function to set user role (admin only)
  2. Create function to get all user roles (admin only)
  3. Both functions check is_admin() before executing

  ## Security
  - Functions use SECURITY DEFINER to bypass RLS
  - Both require caller to be an admin
  - Validates role values before inserting
*/

-- Function to set a user's role (admin only)
CREATE OR REPLACE FUNCTION set_user_role(target_user_id uuid, new_role text)
RETURNS void AS $$
BEGIN
  -- Check if caller is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can set user roles';
  END IF;

  -- Validate role
  IF new_role NOT IN ('admin', 'user') THEN
    RAISE EXCEPTION 'Invalid role. Must be admin or user';
  END IF;

  -- Insert or update the role
  INSERT INTO user_roles (user_id, role)
  VALUES (target_user_id, new_role)
  ON CONFLICT (user_id)
  DO UPDATE SET role = new_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get all user roles (admin only)
CREATE OR REPLACE FUNCTION get_all_user_roles()
RETURNS TABLE (
  user_id uuid,
  role text,
  created_at timestamptz
) AS $$
BEGIN
  -- Check if caller is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can view all user roles';
  END IF;

  RETURN QUERY
  SELECT ur.user_id, ur.role, ur.created_at
  FROM user_roles ur;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;