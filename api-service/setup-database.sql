-- Setup database for Morse Learn analytics
-- This script creates the necessary tables for the Morse Learn application

-- Create progress_log table
CREATE TABLE IF NOT EXISTS progress_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_identifier VARCHAR(36) NOT NULL,
  progress_dump TEXT NOT NULL,
  progress_percent INT NOT NULL,
  time_played INT NOT NULL,
  date_created DATETIME NOT NULL,
  visual_hints BOOLEAN NOT NULL,
  speech_hints BOOLEAN NOT NULL,
  sound BOOLEAN NOT NULL,
  settings_dump TEXT NOT NULL,
  progress_detail TEXT,
  settings_changed BOOLEAN NOT NULL DEFAULT FALSE,
  INDEX (user_identifier),
  INDEX (date_created)
);
