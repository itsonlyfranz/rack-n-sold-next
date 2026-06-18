-- Service-role-only helper used to seed sale notification secrets into Supabase Vault.

CREATE OR REPLACE FUNCTION public.upsert_sale_notification_secret(
  p_name text,
  p_secret text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_secret_id uuid;
BEGIN
  IF p_name NOT IN (
    'resend_api_key',
    'resend_from_email',
    'admin_email',
    'opensea_api_key',
    'nft_contract_address'
  ) THEN
    RAISE EXCEPTION 'Unsupported sale notification secret name: %', p_name;
  END IF;

  IF p_secret IS NULL OR length(p_secret) = 0 THEN
    RAISE EXCEPTION 'Secret value cannot be empty';
  END IF;

  SELECT id
  INTO v_secret_id
  FROM vault.secrets
  WHERE name = p_name
  LIMIT 1;

  IF v_secret_id IS NULL THEN
    PERFORM vault.create_secret(
      p_secret,
      p_name,
      'Rack N Sold sale notification secret'
    );
  ELSE
    PERFORM vault.update_secret(
      v_secret_id,
      p_secret,
      p_name,
      'Rack N Sold sale notification secret'
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_sale_notification_secret(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_sale_notification_secret(text, text) TO service_role;
