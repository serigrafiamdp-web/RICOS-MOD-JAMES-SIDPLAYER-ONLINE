# TEST110 — OLD SID COLLECTION RICO: promote HVSC reference playlist to editable Cloudflare D1

**Status:** GitHub frontend deployed (TEST110); beta-key public SAVE browser test **PENDING USER PASS**. Existing **TEST108 PASS** of UCTUMI Cloudflare reorder/save/reload remains confirmed. TEST109 HELP changes unchanged.

## Root cause
`OLD SID COLLECTION RICO` has **298 HVSC `pack/file` references** in `community/playlists/old-sid-collection-rico.json` and appears in `community/playlists.json`. This is **not** a Cloudflare D1 playlist. Therefore the older floating SAVE action treated it as local storage even though all songs came from HVSC. Having valid HVSC paths enables playback, but **does not automatically create a D1 record with a remote playlist ID**, which public SAVE, EDIT and DELETE require.

## TEST110 frontend behavior
- When **OLD SID COLLECTION RICO** is loaded from the historical GitHub curated entry, SAVE is enabled even if no reordering occurred, and its tooltip explains that it will register an editable Cloudflare playlist.
- On SAVE the app requests the usual **beta key** and validates the current **298 HVSC references** (no duplicated `pack/file` references).
- It checks the public D1 playlist catalog for an existing entry named **OLD SID COLLECTION RICO** by **RICO**. If one already exists, it checks that its song set is unchanged and uses PUT (same ID), never blindly creates a duplicate.
- Otherwise it POSTs the 298 `pack/file` references into the **existing deployed Worker `/playlists` endpoint**. The Worker already accepts 1–2,000 HVSC references and does not upload SID bytes. **No Worker redeployment or schema change needed**.
- A GET of the newly stored D1 playlist must exactly match the saved order before the UI announces **SAVE verified**.
- On confirmation, the currently playing list is bound to its new `remoteId` and future SAVE uses the established public PUT/reorder path; the remote public listing has EDIT and DELETE controls.
- The community catalog hides the identical static OLD SID row **when the matching public D1 row exists**, avoiding visible duplicates across browsers. Other curated playlists are unchanged.
- User operations cannot move/remove songs while Cloudflare SAVE is processing. Failure leaves the current in-memory playlist intact and shows **SAVE NOT VERIFIED**. No credentials are cached.
- TOP 100 ranked lists are still immutable. No player engine/audio code was changed.

## How to test
1. Open https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/?test=110adoptold2
2. CHOOSE A SID → COMMUNITY PLAYLISTS → **OLD SID COLLECTION RICO (298)** → PLAY.
3. Optionally move a song with ↑/↓. Click **SAVE** and enter the beta key (never paste the key into ChatGPT).
4. Wait for **SAVE verified: OLD SID COLLECTION RICO is now public and editable (298 HVSC SID)**. The app must **not** report success before reading back the D1 order.
5. Close and reopen COMMUNITY PLAYLISTS. Verify there is a single editable version with EDIT and DELETE controls. Reopen it, move a song, press SAVE, enter beta key again and verify the order persists after reload.
6. Do not delete the public version yet. Once the owner confirms public adoption PASS, remove only the OLD SID curated *catalog entry* from GitHub, preserving the source JSON as a historical backup so permanent deletion of the D1 playlist does not make the old static listing reappear.

**Scope limitation:** This first migration activates public SAVE for this one named archived list, while other curated static lists remain unchanged. D1 DELETE will remove the published record but until the historical catalog entry is retired, that historical row may reappear. COPY as an independent public-list action can be addressed separately; the current source JSON remains available for REMIX copying.

## Project checkpoint
Source archive analysis: **509 SID files**, **196 SHA-256 duplicate occurrences**, **313 distinct source binaries**, **300 source matches to HVSC refs**, **2 pairs merged by identical HVSC path**, **298 unique playable references**, **13 unresolved**, **77 HVSC archive packs**.

- [Source and audit](OLD_SID_COLLECTION_RICO_REPORT.md)
- [Static reference JSON](../community/playlists/old-sid-collection-rico.json)
- [Prior Cloudflare SAVE verification TEST107](TEST107_SAVE_RELOAD_VERIFY.md)
- [UCTUMI public SAVE/reload TEST108 PASS](TEST108_UCTUMI_SAVE_ORDER_PASS.md)
