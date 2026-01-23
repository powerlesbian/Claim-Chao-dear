/*
  # Create subscriptions table with user authentication

  ## Summary
  Creates a secure subscriptions table for storing user subscription data with Row Level Security.

  ## New Tables
  - `subscriptions`
    - `id` (uuid, primary key) - Unique identifier for each subscription
    - `user_id` (uuid, foreign key) - References auth.users, links subscription to owner
    - `name` (text) - Name of the subscription service
    - `amount` (numeric) - Cost of the subscription
    - `currency` (text) - Currency code (HKD, SGD, USD)
    - `start_date` (timestamptz) - When the subscription started
    - `frequency` (text) - Billing frequency (daily, weekly, monthly, yearly)
    - `cancelled` (boolean) - Whether the subscription is cancelled
    - `cancelled_date` (timestamptz) - When the subscription was cancelled
    - `notes` (text) - Optional notes about the subscription
    - `screenshot` (text) - Optional base64 screenshot data
    - `created_at` (timestamptz) - When the record was created
    - `updated_at` (timestamptz) - When the record was last updated

  ## Security
  - Enable RLS on `subscriptions` table
  - Add policy for users to read their own subscriptions
  - Add policy for users to insert their own subscriptions
  - Add policy for users to update their own subscriptions
  - Add policy for users to delete their own subscriptions

  ## Notes
  - All subscription data is private to each user
  - The user_id is automatically set and cannot be changed
  - Timestamps are automatically managed
*/

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'HKD',
  start_date timestamptz NOT NULL,
  frequency text NOT NULL,
  cancelled boolean DEFAULT false,
  cancelled_date timestamptz,
  notes text,
  screenshot text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster queries by user
CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions(user_id);

-- Create index for faster queries by created_at
CREATE INDEX IF NOT EXISTS subscriptions_created_at_idx ON subscriptions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own subscriptions
CREATE POLICY "Users can insert own subscriptions"
  ON subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own subscriptions
CREATE POLICY "Users can update own subscriptions"
  ON subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own subscriptions
CREATE POLICY "Users can delete own subscriptions"
  ON subscriptions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on row changes
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();