-- ============================================================
-- CREATE TRANSACTIONS TABLE
-- ============================================================
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  team_id UUID REFERENCES teams(id),
  tier TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  transaction_id TEXT,
  reference TEXT,
  bill_code TEXT UNIQUE,
  status TEXT DEFAULT 'pending',
  payment_method TEXT DEFAULT 'toyyibpay',
  member_count INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_team_id ON transactions(team_id);
CREATE INDEX IF NOT EXISTS idx_transactions_bill_code ON transactions(bill_code);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- Add comment for documentation
COMMENT ON TABLE transactions IS 'Stores payment transaction records for ToyyibPay';
COMMENT ON COLUMN transactions.member_count IS 'Number of team members covered by this transaction (for group plans)';
