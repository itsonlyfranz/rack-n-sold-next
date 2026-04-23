# Proposal: Public Gallery Status Alignment (App Query + RLS)

## Context
Current behavior mixes two status models for guest visibility:

- Client gallery guest query uses: `['minted', 'published']`.
- Supabase RLS policy allows guest reads when: `status = 'published'`.
- Newer NFT/listing flows in the app also use statuses like `listed_for_sale` and `sold`.

This creates environment drift risk: changing only frontend query or only RLS can break guest visibility.

---

## Goal
Adopt a single public-visibility model and migrate safely without downtime for guests.

---

## Proposal (3 phases)

### Phase 1 — Backward-compatible query and policy (safe bridge)
1. Update guest gallery query to include both legacy and current public statuses:
   - `published` (legacy)
   - `minted` (if intended to be public)
   - `listed_for_sale`
2. Expand RLS SELECT policy to allow the same public set.
3. Keep existing `published` support temporarily.

**Outcome:** no guest regression in old or new data states.

### Phase 2 — Data normalization
1. Run a one-time SQL migration to map legacy rows:
   - `published` → `listed_for_sale` (or your chosen canonical status)
2. Validate row counts before/after migration.
3. Add a rollback SQL script.

**Outcome:** database rows converge on one canonical public status.

### Phase 3 — Cleanup and enforcement
1. Remove `published` from frontend filters.
2. Remove `published` from RLS policy.
3. Add a DB constraint/check (or enum) to prevent reintroduction.
4. Update docs and seed/setup SQL to canonical statuses only.

**Outcome:** long-term consistency and reduced maintenance risk.

---

## Test Plan

### Automated
- Add Jest tests for gallery filtering logic:
  - guest mode includes canonical public statuses.
  - logged-in mode scopes to `user_id`.
  - regression test ensures deprecated status is not reintroduced after cleanup.

### Manual smoke checks
1. Guest can see intended public artworks.
2. Authenticated owner still sees own non-public drafts.
3. Admin/seller workflows still transition status correctly through mint/list/sold stages.

---

## Acceptance Criteria
- Guest visibility works before and after migration.
- RLS and frontend query use the same status contract.
- No remaining writes produce deprecated `published` after Phase 3.
- README/setup docs match implemented status model.

---

## Risks and Mitigations
- **Risk:** One-sided deployment (frontend-only or DB-only) causes empty guest results.
  - **Mitigation:** Deploy Phase 1 bridge first.
- **Risk:** Legacy scripts still write `published`.
  - **Mitigation:** add constraint/check in Phase 3 and update setup SQL/docs.
