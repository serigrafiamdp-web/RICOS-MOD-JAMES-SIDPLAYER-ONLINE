# TEST219 — COMMUNITY: last authorized edit moves playlist to top

Date: 2026-11-12. Temporary sorting rule until the real community rating feature is ready.

## Approved behavior

The **most recently saved public playlist edit** rises to the top of COMMUNITY PLAYLISTS **only after** the current beta-key workflow successfully saves it to Cloudflare D1.

- Supported: **EDIT — NAME / CREATOR** (authenticated metadata PATCH), **EDIT / REPUBLISH** for SID additions or changes (authenticated content PUT), and **SAVE** of track removal/order on a published playlist (authenticated PUT). An existing adopted OLD SID COLLECTION RICO list also qualifies on a real authorized PUT.
- Does **not** reorder on PLAY/listening, selecting a playlist, opening EDIT, changing songs locally without REPUBLISH, entering a wrong key, CANCEL, failed write, deleting a list, local imports, or edits to OUR COLLECTION.
- Opening an unchanged published list, or a PUT answered `No playlist changes to save`, must **not** reorder.
- PUBLISH of a new playlist remains the existing creation flow. This is a rule for **edits**, not listening statistics or newly created lists.
- No added controls, badges, messages, vote simulation, track reorder, or SID/audio changes.
- Other public lists remain in their previous relative order. Private draft/local lists retain their private behavior.

## Technical implementation

Uses **the already implemented Cloudflare Worker endpoint** `GET/PUT /catalog-order`, which persists a shared order and requires `X-Beta-Key` for PUT. No Cloudflare Worker source change or migration is required.

After an actual accepted edit:
1. Fetch the **latest server order and revision** with no cache.
2. Move only `remote:<playlist-id>` to the beginning of the order array.
3. PUT the array with the **same temporary authorized beta key** and `expectedRevision`.
4. On HTTP 409, re-read and retry against the new revision (up to four attempts).
5. Read back the public order and confirm the edited list is first; then refresh the community catalog with the existing UI. Failed catalog promotions never falsely mark a failed SID edit; they preserve the successful edit and report that the order remains pending.
6. Do not store the key in localStorage, playlists, URLs, logs, or GitHub.

The existing `sortCommunityPlaylists` applies the D1 public order across visitors and refreshes; no autonomous/background polling is added.

## Checks

- JS parsed without syntax errors.
- A successful authorized update moves its exact remote key to #1 without altering the others.
- Repeated promotion of already-first item performs no write.
- Optimistic conflict (409) retries without overwriting another editor's newer order.
- Invalid beta key (403), unavailable server (503), or invalid playlist IDs do not modify the shared order.
- Existing audio engine, TEST218 volume shape, TEST208 first hit, TEST199 timer, and fade not changed.

**Deployment:** Only `js/customPlaylist.test101.js` and its cache-bust reference in `index.html` are changed; the existing Cloudflare Worker API is reused, not redeployed.

**Final acceptance:** In the live application, edit a non-top public playlist using the beta key and save; it should become the first public playlist for every visitor after reloading. PLAY alone should not move it.
