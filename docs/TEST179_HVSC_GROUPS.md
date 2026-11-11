# TEST179 — HVSC LIBRARY → GROUPS (A–Z)

Date: 2026-11-11. Status: automated Chromium PASS in main SpotySid and
isolated LFT preview. User acceptance pending.

## Change requested

Add a third button called **GROUPS** alongside **MUSICIANS** and **DEMOS** in
the existing HVSC LIBRARY. Reuse its alphabetical shelf selector, group list,
SID list and MY PLAYLIST builder, including existing publishing workflow.
Do not replace or change the original HVSC source files.

## Source and limits

The group index is constructed from the **explicit Released field** of the
original HVSC #85 PSID/RSID metadata, using only **exact matches** against
known CSDb group names in
`community/curation/csdb-groups-ranking-2026-11.json`. The original released
credit remains visible. This is an **index of SID releases credited to the
group**; it is not a complete group membership directory and it does not
include every CSDb release from every group.

Initial generated index:
- 83 identified groups.
- 10,376 SID ZIP references across the groups.
- 20 populated alphabetical shelves from `0-9` through `X`.
- Fairlight: 456 SID credits; Upfront: 8 SID credits.

An SID can only be added with its **original immutable HVSC pack/file path**.
No SID is copied, modified or reattributed. Tunes with no known exact group
release credit remain available in MUSICIANS and DEMOS.

## Architecture

- `scripts/build-hvsc-group-index.mjs`: deterministic generator.
- `library/groups/index.json`: standalone group shelf index.
- `library/groups/groups-*.json`: per-letter sections and SID references.
- `js/customPlaylist.test101.js` and
  `lft-test/customPlaylist.js`: lazy load of separate index when GROUPS
  is clicked. Reuse native library controls, groups selection and
  MY PLAYLIST builder. No new backend calls or permissions.
- `index.html` and `lft-test/index.html`: one new **GROUPS** button in
  the existing library category row; versioned JS URLs refreshed.
- HVSC `library/index.json`, `library/data/*`, all original ZIPs,
  LFT engine, TinySID, Cloudflare Worker and published playlists unchanged.

## Verified

[Automated browser test](https://github.com/serigrafiamdp-web/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/actions/runs/43092016428) PASS:
- Root SpotySid and LFT test page both load GROUPS after manual selection.
- Alphabetical letters include F and U.
- Fairlight shows 456 tracks and search can filter to one.
- Upfront's 8 SID can all be added to MY PLAYLIST with intact ZIP references.
- Switching back to MUSICIANS and DEMOS retains the original controls.
- No JavaScript page errors; no auto-play or playlist overwrite.

[Group source generator](https://github.com/serigrafiamdp-web/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/actions/runs/43091451284) PASS:
- Original ZIP pack files exist for each output track.
- 83 groups / 10,376 track references.

## Notes

Some confirmed groups may have no SID with an exact release-credit match
and therefore do not appear yet; this is intentional. Do not silently infer
group affiliation from an artist's nickname. An expanded CSDb dataset could
add more associations in a later TEST without changing the UI or source packs.
