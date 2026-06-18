// @ts-nocheck - Supabase Edge Functions run in Deno and support npm: imports.
import { createClient } from "npm:@supabase/supabase-js@2";

type ArtworkRow = {
  id: string;
  title: string;
  token_id: string | null;
  status: string | null;
};

type OpenSeaSaleEvent = {
  event_type?: string;
  buyer?: string;
  closing_date?: number;
};

type OpenSeaEventsResponse = {
  asset_events?: OpenSeaSaleEvent[];
};

type SaleNotification = {
  id: string;
  artwork_id: string;
  seller_email: string;
  artwork_title: string;
  token_id: string;
  buyer_wallet: string | null;
  sold_at: string;
  seller_sent_at: string | null;
  admin_sent_at: string | null;
  seller_resend_id: string | null;
  admin_resend_id: string | null;
  attempt_count: number;
};

type ResendResult =
  | { ok: true; id: string | null }
  | { ok: false; error: string };

const OPENSEA_CHAIN = "polygon";
const DEFAULT_CONTRACT = "0x67a422A7E41337E346038e8c4a9013215D786105";

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return jsonResponse({ ok: true });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = getServiceRoleKey();

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(
      { error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
      500,
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const cronSecret = await getConfiguredSecret(
    supabase,
    "poll_opensea_sales_cron_secret",
    "CRON_SECRET",
  );

  if (!isAuthorized(request, cronSecret)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const errors: string[] = [];
  const processedIds: string[] = [];
  let checked = 0;
  let markedSold = 0;

  try {
    const pollResult = await pollOpenSeaSales(supabase);
    checked = pollResult.checked;
    markedSold = pollResult.markedSold;
    processedIds.push(...pollResult.processedIds);
    errors.push(...pollResult.errors);
  } catch (error) {
    errors.push(`poll: ${getErrorMessage(error)}`);
  }

  const emailResult = await sendPendingNotifications(supabase);
  errors.push(...emailResult.errors);

  return jsonResponse({
    ok: errors.length === 0,
    checked,
    markedSold,
    emailBatches: emailResult.emailBatches,
    processedIds,
    errors: errors.length ? errors : undefined,
  });
});

function isAuthorized(request: Request, secret?: string | null): boolean {
  if (!secret) return false;

  const cronSecret = request.headers.get("x-cron-secret");
  if (cronSecret === secret) return true;

  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

function getServiceRoleKey(): string | undefined {
  const legacyKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacyKey) return legacyKey;

  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (!secretKeys) return undefined;

  try {
    const parsed = JSON.parse(secretKeys) as Record<string, string | undefined>;
    return parsed.service_role ?? parsed.serviceRole ?? parsed.secret;
  } catch {
    return undefined;
  }
}

async function pollOpenSeaSales(
  supabase: ReturnType<typeof createClient>,
): Promise<{
  checked: number;
  markedSold: number;
  processedIds: string[];
  errors: string[];
}> {
  const openseaApiKey = await getConfiguredSecret(
    supabase,
    "opensea_api_key",
    "OPENSEA_API_KEY",
  );
  if (!openseaApiKey) {
    return {
      checked: 0,
      markedSold: 0,
      processedIds: [],
      errors: ["OPENSEA_API_KEY is not configured"],
    };
  }

  const pollLimit = getPositiveIntegerEnv("POLL_LIMIT", 50);
  const configuredContractAddress = await getConfiguredSecret(
    supabase,
    "nft_contract_address",
    "NFT_CONTRACT_ADDRESS",
  );
  const contractAddress = (
    configuredContractAddress ||
    Deno.env.get("NEXT_PUBLIC_NFT_CONTRACT_ADDRESS") ||
    DEFAULT_CONTRACT
  ).toLowerCase();

  const { data: artworks, error } = await supabase
    .from("artworks")
    .select("id, title, token_id, status")
    .eq("status", "listed_for_sale")
    .not("token_id", "is", null)
    .limit(pollLimit);

  if (error) {
    return {
      checked: 0,
      markedSold: 0,
      processedIds: [],
      errors: [`list artworks: ${error.message}`],
    };
  }

  const rows = (artworks ?? []) as ArtworkRow[];
  const processedIds: string[] = [];
  const errors: string[] = [];
  let markedSold = 0;

  for (const artwork of rows) {
    const tokenId = artwork.token_id?.trim();
    if (!tokenId) continue;

    try {
      const events = await fetchSaleEventsForNft(
        contractAddress,
        tokenId,
        openseaApiKey,
      );
      const latestSale = pickLatestSaleEvent(events);
      if (!latestSale) continue;

      const buyerWallet = latestSale.buyer?.toLowerCase() ?? null;
      const soldAt = typeof latestSale.closing_date === "number"
        ? new Date(latestSale.closing_date * 1000).toISOString()
        : new Date().toISOString();

      const { data: rpcRows, error: rpcError } = await supabase.rpc(
        "record_nft_sale_and_enqueue_notification",
        {
          p_artwork_id: artwork.id,
          p_token_id: tokenId,
          p_buyer_wallet: buyerWallet,
          p_sold_at: soldAt,
        },
      );

      if (rpcError) {
        errors.push(`${artwork.id}: ${rpcError.message}`);
        continue;
      }

      const result = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows;
      if (result?.marked_sold) {
        markedSold += 1;
        processedIds.push(artwork.id);
      }
    } catch (error) {
      errors.push(`${artwork.id}: ${getErrorMessage(error)}`);
    }
  }

  return {
    checked: rows.length,
    markedSold,
    processedIds,
    errors,
  };
}

async function fetchSaleEventsForNft(
  contractAddress: string,
  tokenId: string,
  apiKey: string,
): Promise<OpenSeaSaleEvent[]> {
  const url = new URL(
    `https://api.opensea.io/api/v2/events/chain/${OPENSEA_CHAIN}/contract/${contractAddress}/nfts/${
      encodeURIComponent(tokenId)
    }`,
  );
  url.searchParams.set("event_type", "sale");
  url.searchParams.set("limit", "50");

  const response = await fetch(url.toString(), {
    headers: {
      accept: "application/json",
      "x-api-key": apiKey,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenSea API ${response.status}: ${text.slice(0, 500)}`);
  }

  const data = (await response.json()) as OpenSeaEventsResponse;
  return data.asset_events ?? [];
}

function pickLatestSaleEvent(events: OpenSeaSaleEvent[]): OpenSeaSaleEvent | null {
  const sales = events.filter((event) =>
    (event.event_type || "").toLowerCase() === "sale" &&
    event.buyer &&
    event.closing_date
  );

  if (sales.length === 0) return null;

  sales.sort((a, b) => (b.closing_date ?? 0) - (a.closing_date ?? 0));
  return sales[0];
}

async function sendPendingNotifications(
  supabase: ReturnType<typeof createClient>,
): Promise<{ emailBatches: number; errors: string[] }> {
  const resendApiKey = await getConfiguredSecret(
    supabase,
    "resend_api_key",
    "RESEND_API_KEY",
  );
  const from = await getConfiguredSecret(
    supabase,
    "resend_from_email",
    "RESEND_FROM_EMAIL",
  ) ||
    "Rack N Sold <onboarding@resend.dev>";
  const adminEmail = await getConfiguredSecret(
    supabase,
    "admin_email",
    "ADMIN_EMAIL",
  );

  if (!resendApiKey || !adminEmail) {
    return {
      emailBatches: 0,
      errors: [
        !resendApiKey ? "RESEND_API_KEY is not configured" : "",
        !adminEmail ? "ADMIN_EMAIL is not configured" : "",
      ].filter(Boolean),
    };
  }

  const { data, error } = await supabase.rpc(
    "claim_pending_nft_sale_notifications",
    {
      p_limit: getPositiveIntegerEnv("EMAIL_BATCH_LIMIT", 20),
      p_max_attempts: getPositiveIntegerEnv("EMAIL_MAX_ATTEMPTS", 10),
    },
  );

  if (error) {
    return { emailBatches: 0, errors: [`claim notifications: ${error.message}`] };
  }

  const notifications = (data ?? []) as SaleNotification[];
  const errors: string[] = [];
  let emailBatches = 0;

  for (const notification of notifications) {
    const update: Record<string, string | null> = {
      processing_started_at: null,
      updated_at: new Date().toISOString(),
    };
    const sendErrors: string[] = [];
    let sentAny = false;

    if (!notification.seller_sent_at) {
      const sellerResult = await sendResendEmail({
        apiKey: resendApiKey,
        from,
        to: notification.seller_email,
        subject: `Your artwork "${notification.artwork_title}" was sold on OpenSea`,
        html: buildSellerHtml(notification),
      });

      if (sellerResult.ok) {
        update.seller_sent_at = new Date().toISOString();
        update.seller_resend_id = sellerResult.id;
        sentAny = true;
      } else {
        sendErrors.push(`seller: ${sellerResult.error}`);
      }
    }

    if (!notification.admin_sent_at) {
      const adminResult = await sendResendEmail({
        apiKey: resendApiKey,
        from,
        to: adminEmail,
        subject: `[Rack N Sold] NFT sold: ${notification.artwork_title}`,
        html: buildAdminHtml(notification),
      });

      if (adminResult.ok) {
        update.admin_sent_at = new Date().toISOString();
        update.admin_resend_id = adminResult.id;
        sentAny = true;
      } else {
        sendErrors.push(`admin: ${adminResult.error}`);
      }
    }

    update.last_error = sendErrors.length ? sendErrors.join("; ") : null;

    const { error: updateError } = await supabase
      .from("nft_sale_notifications")
      .update(update)
      .eq("id", notification.id);

    if (updateError) {
      errors.push(`${notification.id}: ${updateError.message}`);
    } else if (sendErrors.length) {
      errors.push(`${notification.id}: ${sendErrors.join("; ")}`);
    }

    if (sentAny) {
      emailBatches += 1;
    }
  }

  return { emailBatches, errors };
}

async function sendResendEmail(params: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
}): Promise<ResendResult> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: params.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    }),
  });

  const payload = await response.json().catch(() => null) as
    | { id?: string; error?: { message?: string } | string; message?: string }
    | null;

  if (!response.ok || payload?.error) {
    const error = typeof payload?.error === "string"
      ? payload.error
      : payload?.error?.message;
    return {
      ok: false,
      error: error || payload?.message || `Resend HTTP ${response.status}`,
    };
  }

  return { ok: true, id: payload?.id ?? null };
}

function buildSellerHtml(notification: SaleNotification): string {
  return `
    <p>Hello,</p>
    <p>Your artwork <strong>${escapeHtml(notification.artwork_title)}</strong> (token ID ${escapeHtml(notification.token_id)}) has been sold on OpenSea.</p>
    <p>An administrator will contact you shortly regarding payment transfer.</p>
    <p>Thank you for using Rack N Sold.</p>
  `;
}

function buildAdminHtml(notification: SaleNotification): string {
  return `
    <p>An NFT listed through Rack N Sold has been sold on OpenSea.</p>
    <ul>
      <li><strong>Artwork:</strong> ${escapeHtml(notification.artwork_title)}</li>
      <li><strong>Artwork ID:</strong> ${escapeHtml(notification.artwork_id)}</li>
      <li><strong>Token ID:</strong> ${escapeHtml(notification.token_id)}</li>
      <li><strong>Seller email:</strong> ${escapeHtml(notification.seller_email)}</li>
      <li><strong>Buyer wallet:</strong> ${escapeHtml(notification.buyer_wallet || "Unknown")}</li>
      <li><strong>Sold at:</strong> ${escapeHtml(notification.sold_at)}</li>
    </ul>
    <p>Please contact the artist about payment transfer.</p>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getPositiveIntegerEnv(name: string, fallback: number): number {
  const parsed = Number.parseInt(Deno.env.get(name) || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function getConfiguredSecret(
  supabase: ReturnType<typeof createClient>,
  vaultName: string,
  envName: string,
): Promise<string | undefined> {
  const envValue = Deno.env.get(envName);
  if (envValue) return envValue;

  const { data, error } = await supabase.rpc("get_sale_notification_secret", {
    p_name: vaultName,
  });

  if (error || typeof data !== "string" || data.length === 0) {
    return undefined;
  }

  return data;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Connection": "keep-alive",
    },
  });
}
