# Codebase Audit: Proposed Fix Tasks

## 1) Typo fix task
**Task:** Standardize the OpenSea single-token query parameter name to `token_id` (instead of `token_ids`) across the hook and `/api/opensea/assets` route.

- In `useNFTAssets`, the client currently sends `token_ids`.
- In `/api/opensea/assets`, the server reads `token_ids` into a singular `tokenId` variable.
- In `/api/opensea/asset`, the single-asset endpoint already uses `token_id`.

**Why this is a typo-level cleanup:** It is primarily a naming inconsistency (`token_ids` plural for a singular token path), which increases confusion for callers and maintainers.

---

## 2) Bug fix task
**Task:** Resolve public-gallery status drift by aligning app query filters and RLS policy together (do not change only one side).

- Guests are filtered with `query.in('status', ['minted', 'published'])` in `app/gallery/client-gallery.tsx`.
- `setup-supabase.sql` currently defines guest visibility as `status = 'published' OR user_id = auth.uid()`.
- Other code paths heavily use statuses like `draft`, `pending_mint`, `minted`, `listed_for_sale`, and `sold`.

**Why this is a bug-risk:** the app and policy may be coupled to an older `published` model in some environments, while newer flows use `listed_for_sale`. A unilateral code-only change can break guest visibility under existing RLS, and a policy-only change can break existing clients.

---

## 3) Comment/documentation discrepancy task
**Task:** Update README flow copy to match current UX language and behavior for minting.

- README currently says users click **"Mint as NFT"** directly.
- Current UI button in the artwork card is **"Request Mint"** and explicitly requires admin approval.

**Why this is a docs discrepancy:** The user-facing docs imply direct minting, while implementation is an approval workflow.

---

## 4) Test improvement task
**Task:** Add Jest tests for `app/gallery/client-gallery.tsx` filtering rules and regression coverage for guest-visible statuses.

Suggested cases:
- Guest mode builds a query that includes valid public statuses.
- Logged-in users only query their own `user_id`.
- Regression test preventing reintroduction of invalid status values like `published`.

**Why this matters:** The project has Jest config but little/no route/component test coverage; this area directly affects marketplace discoverability.
