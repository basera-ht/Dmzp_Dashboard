-- Drop all tables and types in the correct order (dependencies first)
DROP TABLE IF EXISTS event_email_logs CASCADE;
DROP TABLE IF EXISTS event_posters CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS membership_card_logs CASCADE;
DROP TABLE IF EXISTS hidden_members CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS members CASCADE;
DROP TABLE IF EXISTS chapters CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS drizzle.__drizzle_migrations CASCADE;

-- Drop custom enum types
DROP TYPE IF EXISTS event_status CASCADE;
DROP TYPE IF EXISTS member_status CASCADE;
DROP TYPE IF EXISTS member_type CASCADE;
DROP TYPE IF EXISTS report_status CASCADE;
