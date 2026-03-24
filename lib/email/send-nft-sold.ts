import { Resend } from 'resend';

export type NftSoldEmailParams = {
  sellerEmail: string;
  artworkTitle: string;
  artworkId: string;
  tokenId: string;
};

/**
 * Sends transactional emails when an NFT is detected as sold on OpenSea.
 * Requires RESEND_API_KEY and RESEND_FROM_EMAIL (or uses Resend onboarding domain for tests).
 */
export async function sendNftSoldNotifications(params: NftSoldEmailParams): Promise<{
  sellerSent: boolean;
  adminSent: boolean;
  error?: string;
}> {
  const apiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;
  const from =
    process.env.RESEND_FROM_EMAIL ||
    'Rack N Sold <onboarding@resend.dev>';

  if (!apiKey) {
    console.error('[send-nft-sold] RESEND_API_KEY is not set');
    return { sellerSent: false, adminSent: false, error: 'RESEND_API_KEY missing' };
  }

  if (!adminEmail) {
    console.error('[send-nft-sold] ADMIN_EMAIL is not set');
    return { sellerSent: false, adminSent: false, error: 'ADMIN_EMAIL missing' };
  }

  const resend = new Resend(apiKey);
  const { sellerEmail, artworkTitle, artworkId, tokenId } = params;

  const sellerSubject = `Your artwork "${artworkTitle}" was sold on OpenSea`;
  const sellerHtml = `
    <p>Hello,</p>
    <p>Your artwork <strong>${escapeHtml(artworkTitle)}</strong> (token ID ${escapeHtml(tokenId)}) has been sold on OpenSea.</p>
    <p>An administrator will contact you shortly regarding payment transfer.</p>
    <p>Thank you for using Rack N Sold.</p>
  `;

  const adminSubject = `[Rack N Sold] NFT sold: ${artworkTitle}`;
  const adminHtml = `
    <p>An NFT listed through Rack N Sold has been sold on OpenSea.</p>
    <ul>
      <li><strong>Artwork:</strong> ${escapeHtml(artworkTitle)}</li>
      <li><strong>Artwork ID:</strong> ${escapeHtml(artworkId)}</li>
      <li><strong>Token ID:</strong> ${escapeHtml(tokenId)}</li>
      <li><strong>Seller email:</strong> ${escapeHtml(sellerEmail)}</li>
    </ul>
    <p>Please contact the artist about payment transfer.</p>
  `;

  let sellerSent = false;
  let adminSent = false;

  try {
    const sellerResult = await resend.emails.send({
      from,
      to: sellerEmail,
      subject: sellerSubject,
      html: sellerHtml,
    });
    if (sellerResult.error) {
      console.error('[send-nft-sold] Seller email error:', sellerResult.error);
    } else {
      sellerSent = true;
    }
  } catch (e) {
    console.error('[send-nft-sold] Failed to send seller email:', e);
  }

  try {
    const adminResult = await resend.emails.send({
      from,
      to: adminEmail,
      subject: adminSubject,
      html: adminHtml,
    });
    if (adminResult.error) {
      console.error('[send-nft-sold] Admin email error:', adminResult.error);
    } else {
      adminSent = true;
    }
  } catch (e) {
    console.error('[send-nft-sold] Failed to send admin email:', e);
  }

  return { sellerSent, adminSent };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
