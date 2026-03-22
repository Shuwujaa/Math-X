/* 
  RUN THIS IN THE SUPABASE SQL EDITOR
  This table stores granular performance data for every question answered.
*/

CREATE TABLE IF NOT EXISTS question_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    result_id UUID REFERENCES test_results(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id), -- Null if question not from DB
    user_answer TEXT,
    is_correct BOOLEAN NOT NULL,
    time_spent_seconds INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE question_analytics ENABLE ROW LEVEL SECURITY;

-- Policy (Users can see their own analytics via test_results join)
CREATE POLICY "Users can insert their own analytics" 
ON question_analytics FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM test_results 
        WHERE test_results.id = result_id 
        AND test_results.user_id = auth.uid()::text -- Adjust based on your Auth setup
    )
);

-- For simple LMS, we can allow authenticated selection
CREATE POLICY "Authenticated users can read analytics"
ON question_analytics FOR SELECT
USING (auth.role() = 'authenticated');
