# TEST107 — Verify saved order against Cloudflare (2026-11-08)

**Status:** Published to `main`, **BROWSER PASS PENDING**. Latest user-verified baseline: TEST104 PASS for Uctumi playback. TEST105/TEST106 functionality was implemented, but their end-to-end PASS had not been verified.

## User-reported regression

The owner reordered a playlist with the arrows, clicked SAVE, entered the beta key, and when loading the list again the old order was shown.

### Two code defects found

1. **REMIX publication used the editor's stale draft order**. In TEST106, floating-playlist SAVE updated the draft, but PUBLISH could still send the original `draft.tracks` sequence if it was used after reordering without the extra local SAVE. There was no automatic reconciliation between the playing preview and the draft before POST.
2. **Cloudflare SAVE trusted HTTP success without a read-back**. The UI cleared `dirtyOrder` and announced success after receiving a successful PUT response. It did not fetch the canonical saved playlist or collection to verify the exact track sequence.

These defects are demonstrable from the client source. We cannot establish from source alone whether the currently deployed Cloudflare Worker persisted the specific earlier failed save.

## TEST107 changes

- Added `verifyRemoteOrder(url,expected,kind)`, which GETs the canonical Worker playlist or SID collection with `cache:'no-store'` and compares every `pack/file` or `sidId/file` reference in exact order.
- Public SAVE marks a playlist clean and displays **SAVE verified** only after GET matches the requested order. On mismatch/failed GET, the in-session order remains dirty and an explicit **SAVE NOT VERIFIED** error instructs the user to retry before reloading.
- Supports idempotent retry when a preceding playlist PUT succeeded but a later read-back failed: the Worker can return "No playlist changes to save" while GET confirms the existing desired order.
- PUBLISH of a REMIX first incorporates the live playing playlist order into the corresponding local draft. Additional songs added since preview began are kept.
- PUBLISH verifies the newly created D1 playlist via GET. If the first POST succeeded but verification failed, the returned ID is preserved in the draft; retry uses the **same published ID**, with PUT reorder if necessary, never another POST/duplicate public playlist.
- After successful verified PUBLISH, the currently playing draft is promoted to an editable public playlist only if its live track references equal the published list. This prevents in-memory length/order mismatches.
- Catalog refresh failure after a verified publication is logged separately and cannot misreport a successful publication as a failure.
- `index.html` references the script with `?v=test107orderverify2` to invalidate prior browser/CDN cache.

## Safeguards

- No audio engine, SID binary, AUTO, fade, silence detection, controls layout, Cloudflare Worker source, or database schema was modified.
- Public edits remain beta-key protected and remain restricted to reordering/removing existing tracks; TOP 100 ranking is immutable.
- No public playlist was mutated during development. No beta keys were accessed or stored.
- The diagnostics environment could inspect GitHub source but could not query the live Worker endpoint; verifying production deployment remains part of the user test.

## Tests

JavaScript syntax compilation PASS. Isolated `verifyRemoteOrder()` tests PASS for correctly ordered public playlists/collections, rejection of wrong order, and rejection of missing entries. Structural checks PASS for the new POST sync, read-back after PUT, duplicate-preventing retry, existing Cloudflare Worker GET/PUT endpoints, and cache-busted JS.

## Manual browser test

1. Open https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/?test=107orderverify2
2. Load an already-public editable playlist. Move one song (single-click ±1 or double-click ±10), press SAVE, enter beta key. Do not reload until the message reads **SAVE verified**.
3. Close and reopen the same public playlist, and verify the same track remains in the same position.
4. For an unpublished REMIX, reorder in the floating playlist and press PUBLISH **without** pressing local SAVE. Enter beta key. Verify the message reads **PUBLISHED AND VERIFIED**; reopen the published list and confirm its order.
5. Ensure no SAVE appears for TOP 100 rank lists; verify Uctumi playback unaffected.

**Do not mark TEST107 PASS until the owner confirms the persisted order after reloading**.