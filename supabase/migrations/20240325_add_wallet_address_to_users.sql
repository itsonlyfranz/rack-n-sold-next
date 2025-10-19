-- Add wallet_address column to users table
ALTER TABLE users 
ADD COLUMN wallet_address TEXT DEFAULT NULL,
ADD COLUMN wallet_connected_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN wallet_chain_id INTEGER DEFAULT NULL;

-- Add index for wallet_address for faster queries
CREATE INDEX idx_users_wallet_address ON users(wallet_address);

-- Add uniqueness constraint to prevent duplicate wallet addresses
ALTER TABLE users
ADD CONSTRAINT unique_wallet_address UNIQUE (wallet_address);

-- Create function to ensure wallet_connected_at is set when wallet_address is set
CREATE OR REPLACE FUNCTION set_wallet_connected_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.wallet_address IS NOT NULL AND 
     (OLD.wallet_address IS NULL OR NEW.wallet_address <> OLD.wallet_address) THEN
    NEW.wallet_connected_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update wallet_connected_at
CREATE TRIGGER update_wallet_connected_at
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_wallet_connected_at();

-- Add RLS policy for wallet addresses
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wallet address" 
ON users FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own wallet address" 
ON users FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id); 