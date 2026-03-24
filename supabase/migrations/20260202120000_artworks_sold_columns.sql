-- Run in Supabase SQL Editor if migrations are not applied automatically.
-- NFT sale detection: store when sold on OpenSea and optional buyer wallet (off-chain record only).

ALTER TABLE public.artworks
  ADD COLUMN IF NOT EXISTS sold_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS buyer_wallet text NULL;

COMMENT ON COLUMN public.artworks.sold_at IS 'When the NFT was detected as sold on OpenSea (cron job).';
COMMENT ON COLUMN public.artworks.buyer_wallet IS 'Buyer wallet from OpenSea sale event (may be unregistered in app).';
