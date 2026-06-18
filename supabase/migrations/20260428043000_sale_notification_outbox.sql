-- Sale notification outbox for reliable Resend delivery.
-- The Edge Function records detected OpenSea sales here, then retries pending emails.

CREATE TABLE IF NOT EXISTS public.nft_sale_notifications (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  artwork_id uuid NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  seller_email text NOT NULL,
  artwork_title text NOT NULL,
  token_id text NOT NULL,
  buyer_wallet text NULL,
  sold_at timestamptz NOT NULL,
  seller_sent_at timestamptz NULL,
  admin_sent_at timestamptz NULL,
  seller_resend_id text NULL,
  admin_resend_id text NULL,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_attempt_at timestamptz NULL,
  last_error text NULL,
  processing_started_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT nft_sale_notifications_artwork_id_key UNIQUE (artwork_id)
);

CREATE INDEX IF NOT EXISTS idx_nft_sale_notifications_pending
  ON public.nft_sale_notifications (created_at)
  WHERE seller_sent_at IS NULL OR admin_sent_at IS NULL;

ALTER TABLE public.nft_sale_notifications ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.nft_sale_notifications IS
  'Outbox for NFT sold email notifications sent by the Supabase Edge Function.';
COMMENT ON COLUMN public.nft_sale_notifications.processing_started_at IS
  'Soft lock timestamp used by the Edge Function to avoid duplicate concurrent delivery attempts.';

CREATE OR REPLACE FUNCTION public.record_nft_sale_and_enqueue_notification(
  p_artwork_id uuid,
  p_token_id text,
  p_buyer_wallet text,
  p_sold_at timestamptz
)
RETURNS TABLE(marked_sold boolean, notification_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_artwork record;
  v_seller_email text;
  v_notification_id uuid;
BEGIN
  UPDATE public.artworks
  SET
    status = 'sold',
    sold_at = p_sold_at,
    buyer_wallet = p_buyer_wallet,
    updated_at = now()
  WHERE id = p_artwork_id
    AND status = 'listed_for_sale'
    AND token_id = p_token_id
  RETURNING id, title, token_id, user_id, buyer_wallet, sold_at
  INTO v_artwork;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid;
    RETURN;
  END IF;

  SELECT email
  INTO v_seller_email
  FROM public.users
  WHERE id = v_artwork.user_id;

  IF v_seller_email IS NULL THEN
    RETURN QUERY SELECT true, NULL::uuid;
    RETURN;
  END IF;

  INSERT INTO public.nft_sale_notifications (
    artwork_id,
    seller_email,
    artwork_title,
    token_id,
    buyer_wallet,
    sold_at
  )
  VALUES (
    v_artwork.id,
    v_seller_email,
    v_artwork.title,
    COALESCE(v_artwork.token_id, p_token_id),
    v_artwork.buyer_wallet,
    COALESCE(v_artwork.sold_at, p_sold_at)
  )
  ON CONFLICT (artwork_id) DO UPDATE
  SET
    buyer_wallet = EXCLUDED.buyer_wallet,
    sold_at = EXCLUDED.sold_at,
    updated_at = now()
  RETURNING id INTO v_notification_id;

  RETURN QUERY SELECT true, v_notification_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_pending_nft_sale_notifications(
  p_limit integer DEFAULT 20,
  p_max_attempts integer DEFAULT 10,
  p_lock_timeout interval DEFAULT interval '5 minutes'
)
RETURNS TABLE(
  id uuid,
  artwork_id uuid,
  seller_email text,
  artwork_title text,
  token_id text,
  buyer_wallet text,
  sold_at timestamptz,
  seller_sent_at timestamptz,
  admin_sent_at timestamptz,
  seller_resend_id text,
  admin_resend_id text,
  attempt_count integer,
  last_attempt_at timestamptz,
  last_error text,
  processing_started_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  WITH pending AS (
    SELECT id
    FROM public.nft_sale_notifications
    WHERE (seller_sent_at IS NULL OR admin_sent_at IS NULL)
      AND attempt_count < p_max_attempts
      AND (
        processing_started_at IS NULL
        OR processing_started_at < now() - p_lock_timeout
      )
    ORDER BY created_at ASC
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
    FOR UPDATE SKIP LOCKED
  ),
  claimed AS (
    UPDATE public.nft_sale_notifications n
    SET
      processing_started_at = now(),
      last_attempt_at = now(),
      attempt_count = n.attempt_count + 1,
      updated_at = now()
    FROM pending
    WHERE n.id = pending.id
    RETURNING n.*
  )
  SELECT
    claimed.id,
    claimed.artwork_id,
    claimed.seller_email,
    claimed.artwork_title,
    claimed.token_id,
    claimed.buyer_wallet,
    claimed.sold_at,
    claimed.seller_sent_at,
    claimed.admin_sent_at,
    claimed.seller_resend_id,
    claimed.admin_resend_id,
    claimed.attempt_count,
    claimed.last_attempt_at,
    claimed.last_error,
    claimed.processing_started_at,
    claimed.created_at,
    claimed.updated_at
  FROM claimed;
$$;

REVOKE ALL ON TABLE public.nft_sale_notifications FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_nft_sale_and_enqueue_notification(uuid, text, text, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_pending_nft_sale_notifications(integer, integer, interval) FROM PUBLIC, anon, authenticated;

GRANT ALL ON TABLE public.nft_sale_notifications TO service_role;
GRANT EXECUTE ON FUNCTION public.record_nft_sale_and_enqueue_notification(uuid, text, text, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_pending_nft_sale_notifications(integer, integer, interval) TO service_role;
