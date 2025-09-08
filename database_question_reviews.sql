-- Create question reviews table
CREATE TABLE IF NOT EXISTS question_reviews (
  id BIGSERIAL PRIMARY KEY,
  original_question_id UUID REFERENCES quiz_questions(id),
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer INTEGER NOT NULL,
  explanation TEXT,
  category TEXT,
  difficulty TEXT,
  season TEXT,
  submitted_by UUID REFERENCES auth.users(id),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  review_status TEXT DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected', 'updated')),
  review_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_question_reviews_status ON question_reviews(review_status);
CREATE INDEX IF NOT EXISTS idx_question_reviews_submitted_by ON question_reviews(submitted_by);
CREATE INDEX IF NOT EXISTS idx_question_reviews_season ON question_reviews(season);
CREATE INDEX IF NOT EXISTS idx_question_reviews_submitted_at ON question_reviews(submitted_at);

-- Enable RLS
ALTER TABLE question_reviews ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow authenticated users to insert their own reviews
CREATE POLICY "Users can submit question reviews" ON question_reviews
  FOR INSERT WITH CHECK (auth.uid() = submitted_by);

-- Allow authenticated users to view all reviews (for admin purposes)
CREATE POLICY "Authenticated users can view question reviews" ON question_reviews
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to update reviews (for admin purposes)
CREATE POLICY "Authenticated users can update question reviews" ON question_reviews
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete reviews (for admin purposes)
CREATE POLICY "Authenticated users can delete question reviews" ON question_reviews
  FOR DELETE USING (auth.role() = 'authenticated');

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_question_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_question_reviews_updated_at_trigger
  BEFORE UPDATE ON question_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_question_reviews_updated_at();

COMMENT ON TABLE question_reviews IS 'Table to store questions submitted for review by users';
