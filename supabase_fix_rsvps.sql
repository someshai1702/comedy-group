-- Run this in Supabase SQL Editor to fix the rsvps table
-- This creates the correct columns for the RSVP system

-- Drop the existing table if it exists (be careful - this will delete data)
DROP TABLE IF EXISTS rsvps;

-- Create the rsvps table with proper schema
-- Note: "order" is a SQL keyword, so we use "food_order" instead
CREATE TABLE rsvps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL,
  family_id TEXT NOT NULL,
  attending TEXT NOT NULL CHECK (attending IN ('Yes', 'No', 'Maybe')),
  reason TEXT DEFAULT '',
  adults_attending_count INTEGER DEFAULT 0,
  children_attending_count INTEGER DEFAULT 0,
  food_order JSONB DEFAULT '{}',
  special_instructions TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, family_id)
);

-- Enable Row Level Security
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;

-- Allow public read and write
CREATE POLICY "Allow public access" ON rsvps
  FOR ALL USING (true) WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_rsvps_event_id ON rsvps(event_id);
CREATE INDEX idx_rsvps_family_id ON rsvps(family_id);
