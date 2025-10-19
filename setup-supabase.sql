-- Create tables
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  username TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'seller', 'buyer')),
  wallet_address TEXT,
  wallet_connected_at TIMESTAMP WITH TIME ZONE,
  wallet_chain_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS artworks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT,
  description TEXT NOT NULL,
  price NUMERIC NOT NULL,
  image_url TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'draft',
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES users(id),
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejected_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cart_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  artwork_id UUID REFERENCES artworks(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Set up security policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE artworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Users policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can view their own profile'
  ) THEN
    CREATE POLICY "Users can view their own profile"
      ON users FOR SELECT
      USING (auth.uid() = id);
  END IF;
  
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can update their own profile'
  ) THEN
    CREATE POLICY "Users can update their own profile"
      ON users FOR UPDATE
      USING (auth.uid() = id);
  END IF;
END
$$;

-- Artworks policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'artworks' AND policyname = 'Anyone can view published artworks'
  ) THEN
    CREATE POLICY "Anyone can view published artworks"
      ON artworks FOR SELECT
      USING (status = 'published' OR user_id = auth.uid());
  END IF;
  
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'artworks' AND policyname = 'Users can create their own artworks'
  ) THEN
    CREATE POLICY "Users can create their own artworks"
      ON artworks FOR INSERT
      WITH CHECK (user_id = auth.uid());
  END IF;
  
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'artworks' AND policyname = 'Users can update their own artworks'
  ) THEN
    CREATE POLICY "Users can update their own artworks"
      ON artworks FOR UPDATE
      USING (user_id = auth.uid());
  END IF;
  
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'artworks' AND policyname = 'Users can delete their own artworks'
  ) THEN
    CREATE POLICY "Users can delete their own artworks"
      ON artworks FOR DELETE
      USING (user_id = auth.uid());
  END IF;
END
$$;

-- Cart policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'cart_items' AND policyname = 'Users can view their own cart items'
  ) THEN
    CREATE POLICY "Users can view their own cart items"
      ON cart_items FOR SELECT
      USING (user_id = auth.uid());
  END IF;
  
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'cart_items' AND policyname = 'Users can add to their own cart'
  ) THEN
    CREATE POLICY "Users can add to their own cart"
      ON cart_items FOR INSERT
      WITH CHECK (user_id = auth.uid());
  END IF;
  
  IF NOT EXISTS (
    SELECT FROM pg_policies WHERE tablename = 'cart_items' AND policyname = 'Users can remove from their own cart'
  ) THEN
    CREATE POLICY "Users can remove from their own cart"
      ON cart_items FOR DELETE
      USING (user_id = auth.uid());
  END IF;
END
$$;

-- Create a trigger to set updated_at on updates
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

DROP TRIGGER IF EXISTS update_artworks_updated_at ON artworks;
CREATE TRIGGER update_artworks_updated_at
BEFORE UPDATE ON artworks
FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

DROP TRIGGER IF EXISTS update_cart_items_updated_at ON cart_items;
CREATE TRIGGER update_cart_items_updated_at
BEFORE UPDATE ON cart_items
FOR EACH ROW EXECUTE PROCEDURE update_updated_at(); 