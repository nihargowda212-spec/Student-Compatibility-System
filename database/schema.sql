-- Student Compatibility System Database Schema

CREATE DATABASE IF NOT EXISTS student_compatibility;
USE student_compatibility;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Personality test questions (40 questions across 5 categories)
CREATE TABLE IF NOT EXISTS questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category ENUM('Mindset', 'Self-Management', 'Interactions', 'Personality', 'Resilience') NOT NULL,
    question_text TEXT NOT NULL,
    question_number INT NOT NULL
);

-- User test responses
CREATE TABLE IF NOT EXISTS test_responses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    question_id INT NOT NULL,
    response_value INT NOT NULL, -- 1=Strongly Disagree, 2=Disagree, 3=Neutral, 4=Agree, 5=Strongly Agree
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_question (user_id, question_id)
);

-- Personality scores (calculated from responses)
CREATE TABLE IF NOT EXISTS personality_scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    mindset_score DECIMAL(5,2) DEFAULT 0,
    self_management_score DECIMAL(5,2) DEFAULT 0,
    interactions_score DECIMAL(5,2) DEFAULT 0,
    personality_score DECIMAL(5,2) DEFAULT 0,
    resilience_score DECIMAL(5,2) DEFAULT 0,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_score (user_id)
);

-- Invites table
CREATE TABLE IF NOT EXISTS invites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invite_code VARCHAR(20) UNIQUE NOT NULL,
    created_by_user_id INT NOT NULL,
    used_by_user_id INT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP NULL,
    FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (used_by_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Compatibility results
CREATE TABLE IF NOT EXISTS compatibility_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_a_id INT NOT NULL,
    user_b_id INT NOT NULL,
    compatibility_score DECIMAL(5,2) NOT NULL,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_a_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user_b_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_compatibility (user_a_id, user_b_id)
);

-- Insert sample questions (40 questions - 8 per category)
INSERT INTO questions (category, question_text, question_number) VALUES
-- Mindset (1-8)
('Mindset', 'My mind readily paints detailed scenes and possibilities.', 1),
('Mindset', 'New concepts come to me frequently.', 2),
('Mindset', 'I enjoy exploring abstract ideas and theories.', 3),
('Mindset', 'I think about multiple solutions to problems.', 4),
('Mindset', 'I am curious about how things work.', 5),
('Mindset', 'I enjoy learning new things regularly.', 6),
('Mindset', 'I can see connections between different concepts.', 7),
('Mindset', 'I like to challenge conventional thinking.', 8),

-- Self-Management (9-16)
('Self-Management', 'I manage my time effectively.', 9),
('Self-Management', 'I set clear goals for myself.', 10),
('Self-Management', 'I can prioritize tasks efficiently.', 11),
('Self-Management', 'I maintain good organizational habits.', 12),
('Self-Management', 'I follow through on my commitments.', 13),
('Self-Management', 'I can work independently without supervision.', 14),
('Self-Management', 'I plan ahead for important tasks.', 15),
('Self-Management', 'I maintain a balanced schedule.', 16),

-- Interactions (17-24)
('Interactions', 'I enjoy working in teams.', 17),
('Interactions', 'I communicate effectively with others.', 18),
('Interactions', 'I listen actively to what others say.', 19),
('Interactions', 'I can resolve conflicts constructively.', 20),
('Interactions', 'I build strong relationships with peers.', 21),
('Interactions', 'I share ideas openly in group settings.', 22),
('Interactions', 'I adapt my communication style to different people.', 23),
('Interactions', 'I value diverse perspectives in discussions.', 24),

-- Personality (25-32)
('Personality', 'I am comfortable being myself around others.', 25),
('Personality', 'I express my emotions authentically.', 26),
('Personality', 'I have a positive outlook on life.', 27),
('Personality', 'I am confident in my abilities.', 28),
('Personality', 'I am open to new experiences.', 29),
('Personality', 'I maintain my values under pressure.', 30),
('Personality', 'I am empathetic towards others.', 31),
('Personality', 'I show enthusiasm in my activities.', 32),

-- Resilience (33-40)
('Resilience', 'I bounce back quickly from setbacks.', 33),
('Resilience', 'I stay calm under pressure.', 34),
('Resilience', 'I learn from my mistakes.', 35),
('Resilience', 'I maintain motivation during difficult times.', 36),
('Resilience', 'I can adapt to changing circumstances.', 37),
('Resilience', 'I view challenges as opportunities.', 38),
('Resilience', 'I maintain a positive attitude during adversity.', 39),
('Resilience', 'I persevere when facing obstacles.', 40);

