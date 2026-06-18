-- Harden collection cache writes and storage object ownership.

CREATE TABLE IF NOT EXISTS public.nft_collections (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  image_url TEXT,
  description TEXT,
  verified BOOLEAN DEFAULT false,
  floor_price DECIMAL,
  total_volume DECIMAL,
  market_cap DECIMAL,
  num_owners INTEGER,
  total_supply INTEGER,
  last_fetched TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE IF EXISTS public.nft_collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view NFT collections" ON public.nft_collections;
DROP POLICY IF EXISTS "Authenticated users can manage NFT collections" ON public.nft_collections;
DROP POLICY IF EXISTS "Admins can insert NFT collections" ON public.nft_collections;
DROP POLICY IF EXISTS "Admins can update NFT collections" ON public.nft_collections;
DROP POLICY IF EXISTS "Admins can delete NFT collections" ON public.nft_collections;

CREATE POLICY "Anyone can view NFT collections"
  ON public.nft_collections
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert NFT collections"
  ON public.nft_collections
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update NFT collections"
  ON public.nft_collections
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete NFT collections"
  ON public.nft_collections
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Public Read Policy" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Policy" ON storage.objects;
DROP POLICY IF EXISTS "Public read artwork and profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload owned artwork and profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update owned artwork and profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete owned artwork and profile images" ON storage.objects;

CREATE POLICY "Public read artwork and profile images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id IN ('artworks', 'artwork_images', 'profiles'));

CREATE POLICY "Users can upload owned artwork and profile images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id IN ('artworks', 'artwork_images', 'profiles')
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (storage.foldername(name))[2] = auth.uid()::text
    )
  );

CREATE POLICY "Users can update owned artwork and profile images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id IN ('artworks', 'artwork_images', 'profiles')
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (storage.foldername(name))[2] = auth.uid()::text
    )
  )
  WITH CHECK (
    bucket_id IN ('artworks', 'artwork_images', 'profiles')
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (storage.foldername(name))[2] = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete owned artwork and profile images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id IN ('artworks', 'artwork_images', 'profiles')
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (storage.foldername(name))[2] = auth.uid()::text
    )
  );
