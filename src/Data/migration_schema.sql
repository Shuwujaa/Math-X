/* 
  RUN THIS IN THE SUPABASE SQL EDITOR
  This script sets up the infrastructure for scalable quiz storage.
*/

-- 1. Create Tests Table
CREATE TABLE IF NOT EXISTS tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Questions Table
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- Storing options as an array in JSONB
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- 4. Policies (Public Read for now, suitable for an LMS)
CREATE POLICY "Public Read Tests" ON tests FOR SELECT USING (true);
CREATE POLICY "Public Read Questions" ON questions FOR SELECT USING (true);

-- 5. Insert Initial Test Metadata
INSERT INTO tests (id, name, description) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Mathematics Assessment 1', 'Practice questions for Algebra and Geometry fundamentals.');
