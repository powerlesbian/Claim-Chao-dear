/*
  # Add Subscription Categories

  1. Changes
    - Add category column to subscriptions table
    - Set default category to 'Other'
    - Add check constraint to ensure valid categories
  
  2. Categories
    - Entertainment (Netflix, Spotify, Gaming)
    - Productivity (Software, SaaS tools)
    - Utilities (Internet, Phone, Electricity)
    - Finance (Banking, Investment apps)
    - Health & Fitness (Gym, Health apps)
    - Education (Courses, Learning platforms)
    - Shopping (Amazon Prime, Retail memberships)
    - Other (Miscellaneous)
*/

-- Add category column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'category'
  ) THEN
    ALTER TABLE subscriptions 
    ADD COLUMN category text DEFAULT 'Other' NOT NULL;
    
    -- Add check constraint for valid categories
    ALTER TABLE subscriptions
    ADD CONSTRAINT valid_category CHECK (
      category IN (
        'Entertainment',
        'Productivity',
        'Utilities',
        'Finance',
        'Health & Fitness',
        'Education',
        'Shopping',
        'Other'
      )
    );
  END IF;
END $$;