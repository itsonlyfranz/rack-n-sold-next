-- Secret access and cron schedule for the NFT sale notification Edge Function.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM vault.decrypted_secrets
    WHERE name = 'poll_opensea_sales_cron_secret'
  ) THEN
    PERFORM vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'poll_opensea_sales_cron_secret'
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_sale_notification_secret(p_name text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, vault
AS $$
  SELECT decrypted_secret
  FROM vault.decrypted_secrets
  WHERE name = p_name
    AND name IN (
      'poll_opensea_sales_cron_secret',
      'resend_api_key',
      'resend_from_email',
      'admin_email',
      'opensea_api_key',
      'nft_contract_address'
    )
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_sale_notification_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_sale_notification_secret(text) TO service_role;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'poll-opensea-sales-every-minute'
  ) THEN
    PERFORM cron.unschedule('poll-opensea-sales-every-minute');
  END IF;
END;
$$;

SELECT cron.schedule(
  'poll-opensea-sales-every-minute',
  '* * * * *',
  $cron$
    SELECT net.http_post(
      url := 'https://ukamngdajouofvynqjcn.supabase.co/functions/v1/poll-opensea-sales',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', public.get_sale_notification_secret('poll_opensea_sales_cron_secret')
      ),
      body := jsonb_build_object('source', 'pg_cron'),
      timeout_milliseconds := 25000
    ) AS request_id;
  $cron$
);
