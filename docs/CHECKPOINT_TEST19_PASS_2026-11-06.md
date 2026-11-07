# Stable checkpoint — TEST19 PASS (2026-11-06)

**Project:** RICOS MOD – JAMES SIDPLAYER ONLINE  
**Repository:** https://github.com/serigrafiamdp-web/RICOS-MOD-JAMES-SIDPLAYER-ONLINE  
**Live:** https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/?test=19  
**Main branch:** production site, current stable baseline  
**Status:** **TEST19 PASS**, confirmed by the project owner in the browser on 2026-11-06.

## Functional state

- Original James/Jojati player and WebSid emulation engine are preserved.
- DEFAULT, CUSTOM and USER PLAYLISTS tabs are available.
- Local playlists can be saved and loaded using IndexedDB and exported/imported as portable JSON containing embedded SID content.
- USER PLAYLISTS loads the static GitHub Pages catalog `community/playlists.json`.
- First permanent public list: **LOS PAT MORITAS**, **Playlist by RICO**, 22 SID files, at `community/playlists/los-pat-moritas.json`.
- The playlist creator/selector is distinct from individual SID authors/composers; both may be the same person.
- Floating playlist shows track title and SID artist/composer on **one compact line**, with title tooltip for long text.
- AUTO has documented-time/fallback duration and advances to the **next .sid file**, never automatically through subtunes (TEST18).
- Manual PREVIOUS/NEXT subsong controls remain unchanged.
- AUTO keeps advancing SIDs when the tab is in the background (TEST19; confirmed PASS on user's browser).
- Playlist panel remains movable and resizable; color and filled-waveform oscilloscope modes are preserved.

## TEST19 root cause and fix

**Before:** `sidPlayer.render()` called `checkAutoAdvance()`. `render()` was scheduled by `requestAnimationFrame`, which may be heavily throttled or paused while the tab is hidden. Audio kept playing but a track switch could wait until the user returned to the tab.

**Fix:** In `js/sidPlayer.js`, `ScriptProcessorNode.onaudioprocess` counts produced audio frames in `autoElapsedSamples`. When the configured time is reached, it schedules a single `Promise.resolve().then(...)` microtask (guarded by `autoCheckQueued`) to invoke `checkAutoAdvance()` **outside** the synchronous audio-rendering callback. The visual `render()` no longer triggers AUTO checks. `checkAutoAdvance()` invokes `nextSid()` directly instead of stepping through `nextSubsong()`.

This maintains the existing player engine, timer/fallback policy and playback list selection. Audio may still be suspended by browser/OS policy; TEST19 PASS is based on the user's browser test, not a guarantee for every environment.

## Regression checklist for subsequent tests

1. Load **LOS PAT MORITAS** from USER PLAYLISTS; verify 22 SIDs and **Playlist by RICO**.
2. Verify song-title + composer on one compact line.
3. With AUTO ON and a short fallback duration (e.g. 10 seconds), confirm the next **SID file** plays after its configured duration without switching subtunes.
4. Leave the site tab inactive for longer than two fallback intervals; hear SID transitions while another tab is active.
5. Return to the site; selection and active track should be consistent.
6. Test manual subtune next/previous, manual SID navigation, local playlist SAVE/LOAD/JSON import/export, Default/CUSTOM/USER tabs.
7. Ensure web audio and oscilloscope remain functional.

## Latest milestone history

| Test | Change | Status |
|---|---|---|
| TEST09–TEST10 | Save playlists locally + JSON export/import, clickable saved list | TEST10 PASS |
| TEST11–TEST12 | Delete local saved list; floating list displays its name | Implemented |
| TEST13–TEST14 | USER PLAYLISTS static catalog; first permanent LOS PAT MORITAS list | Implemented |
| TEST15 | Display `Playlist by RICO` instead of ambiguous authorship | Implemented |
| TEST16 | Track + artist display on two lines | Superseded by TEST17 |
| TEST17 | Compact single-line title + artist | Implemented |
| TEST18 | AUTO moves between SID files, not subtunes | Functionally confirmed in subsequent user test |
| **TEST19** | **AUTO works with browser tab in background** | **PASS (user confirmed)** |

## Continuation guidelines

- Treat TEST19 as the stable checkpoint and prefer isolated changes with a new test number and user verification before marking PASS.
- Do not revert or bypass the background AUDIO-based AUTO trigger.
- Never merge playlist-selector identity (`Playlist by`) with the SID header `author` field.
- Keep publication review separate from local list creation. Shared JSON embeds actual SID binaries; verify rights before distributing new collections.
- Future: `SHARE PLAYLIST` publication workflow for authorized beta users, moderated community submissions, stars/ratings (requires an authenticated backend), rankings.

## Key files

- `js/sidPlayer.js` — playback engine interaction, AUTO, subtunes and sound callback.
- `js/customPlaylist.js` — local playlist storage, import/export, community catalog, floating list.
- `css/style.css` — compact playlist layout.
- `index.html` — UI and script version cache parameters.
- `community/playlists.json` — published community catalog.
- `community/playlists/los-pat-moritas.json` — first self-contained playlist.
- `docs/COMMUNITY_BETA.md` — publication policy.
