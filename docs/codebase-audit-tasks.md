# Codebase Audit: Proposed Fix Tasks

## 1) Typo fix task
**Task:** Standardize the OpenSea single-token query parameter name to `token_id` (instead of `token_ids`) across the hook and `/api/opensea/assets` route.

- In `useNFTAssets`, the client currently sends `token_ids`.
- In `/api/opensea/assets`, the server reads `token_ids` into a singular `tokenId` variable.
- In `/api/opensea/asset`, the single-asset endpoint already uses `token_id`.

**Why this is a typo-level cleanup:** It is primarily a naming inconsistency (`token_ids` plural for a singular token path), which increases confusion for callers and maintainers.

---

## 2) Bug fix task
**Task:** Fix guest gallery filtering by replacing `published` with a valid status (likely `listed_for_sale`) in `app/gallery/client-gallery.tsx`.

- Guests are filtered with `query.in('status', ['minted', 'published'])`.
- The rest of the codebase consistently uses statuses like `draft`, `pending_mint`, `minted`, `listed_for_sale`, and `sold`.

**Why this is a bug:** `published` is not part of the active status vocabulary used elsewhere, so guests can miss artworks that should be visible (e.g., listed-for-sale pieces).

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
