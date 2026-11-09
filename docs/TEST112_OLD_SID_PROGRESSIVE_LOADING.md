# TEST112 — Progressive HVSC loading for OLD SID COLLECTION RICO

**Date:** 2026-11-08 (Argentina)  
**Status:** Front-end published to `main`; **owner browser PASS pending**. Preserve TEST108 UCTUMI SAVE/reload PASS and ongoing TEST110/TEST111 tests.

## User symptom and root cause

The 298-track `OLD SID COLLECTION RICO` takes substantially longer to begin playback than other playlists of similar track counts.

The existing `loadStoredPlaylist()` loads *every* SID before calling `loadCustomIndex(0)`: the loop opens **77 separate HVSC ZIP packages**, decompresses SID files sequentially, parses all 298, and only then displays/plays the list. This is chiefly the number of serialized pack fetches, not a single oversized SID. The HVSC catalog index shows approximately 1.64 MB total SID payload across the 298 referenced files, before ZIP overhead. Individual large tunes (~40–44 KB) are not the bottleneck.

## Implementation

**TEST112 is strictly limited to `OLD SID COLLECTION RICO` reference playlists of at least 200 tracks**. Other v1/v2 playlist loaders keep the previous atomic behavior and all existing playback controls.

- Preserve the same original 298 `pack/file` references (HVSC #85). No new files, HVSC copies or databases were created.
- Validate **all** 298 reference strings immediately, then request/decompress only the ZIP holding the **first** SID, decode that SID, and start playback using the existing `loadCustomIndex(0)`.
- Represent the rest as lightweight in-memory slots holding their source `_hvscRef` plus display placeholders. They become full PSID/RSID metadata/bytes when their ZIP data is ready. Track order and index remain stable.
- After starting the first tune, launch at most **two parallel background workers** to prepare the remaining entries. Each HVSC ZIP fetch is represented by one shared promise and is reused by all songs from that archive.
- A manual click or NEXT on an unloaded SID prioritizes only that SID while the current audio continues; fading/switching starts when the requested SID bytes are ready. Requests rejected by the browser/server show an error and can be retried.
- Cancelling/loading a different playlist aborts this stream and prevents stale background work from updating the new playlist. Existing public SAVE, key handling, + to REMIX, reorder, and cloud adoption retain their old code paths.
- Browser network requests for bytes from GitHub are still necessary for Web Audio (the SID emulator runs in the browser); they are in-memory/HTTP cached, not duplicate uploads, publications or IndexedDB SID copies.

## Source validation (no real-world timing asserted)

An isolated execution of the actual progressive loader against all **298** references with a deterministic mock ZIP/fetch layer returned:
- **First-play threshold:** **1** ZIP fetch and **1** SID decode (previous code waited for all 77 ZIP and 298 SID).
- Background completion: **77** distinct archive requests total and **298** SID decodes. All slots preserved exact `pack/file` identities. No duplicate archive fetches.
- JavaScript parses successfully.
- The existing atomic loader is still present for other playlists.
- GitHub Pages `index.html` now uses `js/customPlaylist.test101.js?v=test112progressive`.

These checks validate sequencing/logic, **not** live network performance or all possible browser interactions.

## User acceptance

1. Open [TEST112](https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/?test=112progressive).
2. CHOOSE A SID → COMMUNITY PLAYLISTS → **OLD SID COLLECTION RICO** → PLAY.
3. Confirm the first SID starts playing promptly and the other songs are prepared in the background. Compare to old browser behavior.
4. While the rest is loading, click a distant song (e.g. position 250) and confirm it eventually plays and the playlist remains in the original order. Test NEXT/AUTO once or twice.
5. Confirm + to REMIX still uses existing HVSC references; SAVE requires the beta key on the adopted public list.
6. For regression, load **UCTUMI (99)** and confirm normal playback and SAVE/reload.
7. Mark **TEST112 PASS only after user confirms actual playback and acceptable speed**.

## Checkpoint and limitations

The user already confirmed the original 298-track list *plays*, but reported slow startup. TEST112 seeks to reduce time-to-first-play, not total network traffic. On a slow connection or after a cleared HTTP cache, opening 77 archive packs in the background can still take time; future refinements might lazily fetch only songs users approach rather than prefetch the entire collection.

- [Original archive migration report](OLD_SID_COLLECTION_RICO_REPORT.md)
- [TEST111 + HVSC references](TEST111_OLD_SID_HVSC_PLUS_FIX.md)
- [TEST110 Cloudflare public SAVE](TEST110_OLD_SID_COLLECTION_CLOUD_ADOPTION.md)
