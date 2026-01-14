-- ============================================================
-- CATEGORY RULES MIGRATION
-- Enables user-defined category rules with fuzzy matching
-- ============================================================

-- User Category Rules Table
-- Stores user-defined rules for auto-categorizing transactions
CREATE TABLE IF NOT EXISTS finance_category_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  -- Matching criteria
  merchant_pattern TEXT NOT NULL,           -- Original merchant name or pattern
  normalized_pattern TEXT NOT NULL,         -- Lowercased, cleaned for matching
  match_type TEXT NOT NULL DEFAULT 'contains' CHECK (match_type IN ('exact', 'contains', 'starts_with', 'regex')),
  -- Category assignment
  category TEXT NOT NULL,                   -- The category to assign
  -- Metadata
  source_transaction_id UUID REFERENCES finance_transactions(id) ON DELETE SET NULL,
  hit_count INTEGER DEFAULT 0,              -- How many times this rule matched
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,               -- Higher = checked first
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Prevent duplicate rules for same user/pattern
  UNIQUE(user_id, normalized_pattern)
);

-- Indexes for efficient rule lookup
CREATE INDEX IF NOT EXISTS idx_category_rules_user ON finance_category_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_category_rules_pattern ON finance_category_rules(normalized_pattern);
CREATE INDEX IF NOT EXISTS idx_category_rules_active ON finance_category_rules(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_category_rules_priority ON finance_category_rules(user_id, priority DESC);

-- Add user_category fields to transactions table
ALTER TABLE finance_transactions
  ADD COLUMN IF NOT EXISTS user_category TEXT,
  ADD COLUMN IF NOT EXISTS category_rule_id UUID REFERENCES finance_category_rules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_category_user_set BOOLEAN DEFAULT false;

-- Index for finding transactions by category rule
CREATE INDEX IF NOT EXISTS idx_finance_transactions_rule ON finance_transactions(category_rule_id) WHERE category_rule_id IS NOT NULL;

-- Function to increment rule hit count
CREATE OR REPLACE FUNCTION increment_rule_hit_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.category_rule_id IS NOT NULL AND (OLD.category_rule_id IS NULL OR OLD.category_rule_id != NEW.category_rule_id) THEN
    UPDATE finance_category_rules
    SET hit_count = hit_count + 1, updated_at = NOW()
    WHERE id = NEW.category_rule_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-increment hit count when rule is applied
DROP TRIGGER IF EXISTS trigger_increment_rule_hit_count ON finance_transactions;
CREATE TRIGGER trigger_increment_rule_hit_count
  AFTER INSERT OR UPDATE ON finance_transactions
  FOR EACH ROW
  EXECUTE FUNCTION increment_rule_hit_count();

-- RLS Policies for category_rules
ALTER TABLE finance_category_rules ENABLE ROW LEVEL SECURITY;

-- Users can only see their own rules
CREATE POLICY "Users can view own category rules" ON finance_category_rules
  FOR SELECT USING (user_id = current_setting('request.jwt.claims')::json->>'sub');

-- Users can insert their own rules
CREATE POLICY "Users can insert own category rules" ON finance_category_rules
  FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims')::json->>'sub');

-- Users can update their own rules
CREATE POLICY "Users can update own category rules" ON finance_category_rules
  FOR UPDATE USING (user_id = current_setting('request.jwt.claims')::json->>'sub');

-- Users can delete their own rules
CREATE POLICY "Users can delete own category rules" ON finance_category_rules
  FOR DELETE USING (user_id = current_setting('request.jwt.claims')::json->>'sub');

-- Grant realtime access
ALTER PUBLICATION supabase_realtime ADD TABLE finance_category_rules;
