# TEST106 — SAVE in all editable, non-ranked playlists (2026-11-08)

**Status:** Committed to `main`, GitHub Pages cache query updated. **Pending browser/user PASS**. The last verified user PASS remains TEST104; TEST105 reorder UI still pending its own user confirmation.

## User report and root cause

Screenshot: **RICO'S BEST OF MUSICIANS (18)** is an unpublished REMIX draft, not a historical playlist nor a TOP 100 ranked list. Previous `renderLivePlaylist()` made SAVE visible only for `activePublicPlaylist` or `activePublicCollection`. Thus UCTUMI (99), a public collection, had SAVE but this draft did not.

## New behavior

| Active playlist type | SAVE after rearranging | Persistence | Beta key |
| --- | --- | --- | --- |
| Unpublished REMIX playing in floating playlist | Yes | Updates REMIX draft in localStorage/sessionStorage | No; required on PUBLISH |
| Published Community playlist (HVSC references) | Yes | PUT to Cloudflare, existing workflow | Yes |
| Published contributed SID collection | Yes | Reorder references on Cloudflare, existing workflow | Yes |
| Other local or imported editable playlist | Yes | IndexedDB local saved playlist | No; not published |
| CSDb/HVSC TOP 100 ranked list | No | Immutable rank | N/A |

SAVE remains visible but disabled until a change. Reordering ±1 / ±10 still works through TEST105 arrow controls. Reordering uses synchronized indices/metadata and does not restart playback.

## Implementation

- `js/customPlaylist.test101.js`: New `activeRemixDraftId`, `activeReferenceTracks`, `activeLocalSavedId`, `activeLocalOrderDirty` identify the active editable source and unsaved changes.
- On REMIX PLAY, identify the currently playing draft. A floating-playlist reorder reorders both SID entries and the `activeReferenceTracks` array; SAVE applies the reordered references to the correct REMIX draft and calls `preserveRemixes()`.
- If the editor has added new songs to the draft during preview, SAVE leaves them intact, appended after reordered preview songs. It does not create a second draft, upload audio, or publish.
- For ordinary non-ranked imported/curated editable lists, `ricoSaveCurrentPlaylistLocal()` stores the reordered list in IndexedDB, preserving either HVSC pack/file references (v2) or original embedded SID bytes (v1). A locally saved playlist can be replayed from the saved-library browser.
- Public playlists continue through the existing `savePublicRemovals()` and require the beta key. Cloudflare Worker is not edited or redeployed.
- Ranking lists remain excluded from SAVE and the move arrow controls stay disabled.
- `index.html` now uses `?v=test106save` to force loading current code.

## Validation and pending manual test

Syntax and source-level assertions passed; a reordering simulation preserved an added track while saving a modified draft order.

**Manual:** Open [TEST106](https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/?test=106save), play RICO'S BEST OF MUSICIANS from the REMIX list, click a move arrow, confirm SAVE enables, press SAVE, then reload and reopen the draft to confirm the new order remains. No key requested for local SAVE. When using PUBLISH, a beta key must be requested. Confirm UCTUMI public collection still requires the key and TOP 100 does not display SAVE.

This is not yet a verified end-to-end browser PASS.