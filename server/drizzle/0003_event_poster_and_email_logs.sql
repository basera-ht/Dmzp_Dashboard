-- Migration: Create event_email_logs and event_posters tables
-- Created: 2026-04-10

-- 1. Create event_email_logs table for tracking sent emails
CREATE TABLE IF NOT EXISTS event_email_logs (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  email VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'sent' NOT NULL,
  sent_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 2. Create indexes for event_email_logs
CREATE INDEX IF NOT EXISTS idx_event_email_logs_event_id ON event_email_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_event_email_logs_email ON event_email_logs(email);
CREATE INDEX IF NOT EXISTS idx_event_email_logs_event_email ON event_email_logs(event_id, email);

-- 3. Create event_posters table for storing poster images
CREATE TABLE IF NOT EXISTS event_posters (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE NOT NULL UNIQUE,
  poster_url VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 4. Create index for event_posters
CREATE INDEX IF NOT EXISTS idx_event_posters_event_id ON event_posters(event_id);
