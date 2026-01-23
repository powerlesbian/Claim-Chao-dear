/*
  # Add Dynamic Categories and Admin System

  1. New Tables
    - `categories`
      - `id` (uuid, primary key)
      - `name` (text, unique) - Category name
      - `created_at` (timestamptz)
      - `created_by` (uuid) - User who created it
    
    - `user_roles`
      - `user_id` (uuid, primary key, references auth.users)
      - `role` (text) - 'admin' or 'user'
      - `created_at` (timestamptz)

  2. Changes
    - Drop the category constraint on subscriptions table
    - Update subscriptions.category to reference categories dynamically
  
  3. Security
    - Enable RLS on categories table
    - Enable RLS on user_roles table
    - Add policies for reading categories (everyone)
    - Add policies for managing categories (admin only)
    - Add policies for admin access to all subscriptions
  
  4. Initial Data
    - Seed initial categories
    - No default admin (user must be manually set)
*/

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_role CHECK (role IN ('admin', 'user'))
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Drop old category constraint on subscriptions
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'subscriptions' AND constraint_name = 'valid_category'
  ) THEN
    ALTER TABLE subscriptions DROP CONSTRAINT valid_category;
  END IF;
END $$;

-- Seed initial categories
INSERT INTO categories (name) VALUES
  ('Entertainment'),
  ('Productivity'),
  ('Utilities'),
  ('Finance'),
  ('Health & Fitness'),
  ('Education'),
  ('non-Claim'),
  ('HowCh'),
  ('RomCh'),
  ('Other')
ON CONFLICT (name) DO NOTHING;

-- Drop existing policies if they exist to avoid conflicts
DO $$
BEGIN
  DROP POLICY IF EXISTS "Anyone can read categories" ON categories;
  DROP POLICY IF EXISTS "Admins can insert categories" ON categories;
  DROP POLICY IF EXISTS "Admins can update categories" ON categories;
  DROP POLICY IF EXISTS "Admins can delete categories" ON categories;
  DROP POLICY IF EXISTS "Users can read own role" ON user_roles;
  DROP POLICY IF EXISTS "Admins can read all roles" ON user_roles;
  DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
  DROP POLICY IF EXISTS "Admins can update roles" ON user_roles;
  DROP POLICY IF EXISTS "Admin view all subscriptions" ON subscriptions;
  DROP POLICY IF EXISTS "Admin update all subscriptions" ON subscriptions;
  DROP POLICY IF EXISTS "Admin delete all subscriptions" ON subscriptions;
END $$;

-- RLS Policies for categories table

-- Everyone can read categories
CREATE POLICY "Anyone can read categories"
  ON categories FOR SELECT
  USING (true);

-- Only admins can insert categories
CREATE POLICY "Admins can insert categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Only admins can update categories
CREATE POLICY "Admins can update categories"
  ON categories FOR UPDATE
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

-- Only admins can delete categories
CREATE POLICY "Admins can delete categories"
  ON categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- RLS Policies for user_roles table

-- Users can read their own role
CREATE POLICY "Users can read own role"
  ON user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can read all roles
CREATE POLICY "Admins can read all roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
  );

-- Only admins can manage roles
CREATE POLICY "Admins can insert roles"
  ON user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update roles"
  ON user_roles FOR UPDATE
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

-- Add admin policies for subscriptions

-- Admins can view all subscriptions
CREATE POLICY "Admin view all subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Admins can update all subscriptions
CREATE POLICY "Admin update all subscriptions"
  ON subscriptions FOR UPDATE
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

-- Admins can delete all subscriptions
CREATE POLICY "Admin delete all subscriptions"
  ON subscriptions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );