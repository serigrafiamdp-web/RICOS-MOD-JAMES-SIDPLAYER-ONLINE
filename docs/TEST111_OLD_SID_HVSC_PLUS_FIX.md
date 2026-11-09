# TEST111 — HVSC references in + (REMIX) from OLD SID COLLECTION RICO

**Date:** 2026-11-08 (Argentina)  
**Status:** GitHub source published, code/logic verification PASS, **BROWSER USER PASS PENDING**. Preserve TEST108 PASS and TEST110 adoption behavior.

## User report and screenshot

OLD SID COLLECTION RICO (298) loaded and played. On pressing the floating track-row **+** button, it displayed:

> Cannot add SID: This SID has no verified HVSC #85 source yet; cannot add it to a reference-only Remix.

This message is produced by **addRemixTrack()**, not by the header **SAVE** button. The separate SAVE operation attempts to register a GitHub-curated playlist into the Cloudflare D1 public registry with the beta key (TEST110).

## Root cause

`loadStoredPlaylist()` already validates every v2 `pack/file` reference, opens the matching HVSC ZIP and decodes the SID from its archive, then stores aligned copies in `activeReferenceTracks`. However `addRemixTrack()` only considered `activePublicPlaylist.tracks[index]` (Cloudflare playlists). When the source was a static curated v2 list such as OLD SID COLLECTION RICO, `activePublicPlaylist` was `null`. The fallback tried `embeddedHvscPaths[index]`, which is reserved for v1 embedded tracks and empty for reference-only v2 lists. This falsely reported a missing HVSC source.

## FIX

`addRemixTrack()` now first considers `activeReferenceTracks[index]` when it is in sync with the playing list; otherwise uses Cloudflare `activePublicPlaylist.tracks[index]` for backwards compatibility. The normal legacy `embeddedHvscPaths` / `resolveOriginalHvscPath()` fallback remains for v1/ranked sources without reference-only metadata.

The candidate reference was already validated and its SID bytes loaded from an existing HVSC ZIP. No new HVSC lookup, no SID upload, and no backend permission change are required.

## Verification

- JavaScript syntax compile: PASS
- Test harness invoked the real `addRemixTrack()` function for all 298 entries of `community/playlists/old-sid-collection-rico.json`: **298/298 accepted** into a draft with exact `pack/file` reference alignment.
- Adding an already selected song a second time: correctly rejected as a duplicate.
- `SAVE` adoption handler and beta-key flow from TEST110 remain present and unchanged.
- GitHub Pages references the updated client with query `test111hvscplus` for a fresh cache version.
- The audio engine, original playlist, HVSC ZIP packs, D1 DB and Worker were NOT modified.

## Browser acceptance tests

1. Open https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/?test=111hvscplus
2. CHOOSE A SID → COMMUNITY PLAYLISTS → OLD SID COLLECTION RICO (298) → PLAY.
3. Select a REMIX in ADD + TO, press **+** beside a track. Confirm the success message and increase in the selected REMIX's SID counter. Try another track.
4. Press **SAVE** at the top of OLD SID COLLECTION RICO. For the static original, TEST110 should request beta key and register the 298 references as a D1 editable playlist; success must show **SAVE verified**. After reload, the D1 version should be editable with beta-key SAVE.
5. Confirm UCTUMI continues to play and save; TOP 100 ranked lists remain immutable.

**Do not mark TEST111 PASS until the owner confirms browser + and SAVE behavior.** No Cloudflare publication was triggered during code update.

## See also
- [TEST110 Cloudflare adoption](TEST110_OLD_SID_COLLECTION_CLOUD_ADOPTION.md)
- [Original OLD SID import report](OLD_SID_COLLECTION_RICO_REPORT.md)
