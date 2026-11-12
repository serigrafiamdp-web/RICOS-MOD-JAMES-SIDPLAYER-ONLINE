# TEST209 — Mujer Amante on reSIDfp, Loco un Poco unchanged

Date: 2026-11-12. Status: selected path committed, awaiting listener PASS.

## Reported problem
The original HVSC `Mujer_Amante.sid` freezes/sticks one SID voice around the middle or later when played using the normal TinySID renderer. The opening-kick transition bug was previously addressed by TEST208; that change remains in place.

## Exact source identification
- HVSC #85 composer: Esteban Palladino (Uctumi).
- Source archive: `library/packs/musicians/U/Uctumi.zip`
- SID entry: `Mujer_Amante.sid`
- Uncompressed file size: **8003 bytes** (from `library/data/musicians-U.json`).
- Chip profile: **MOS8580**, PAL, single SID, from `library/uctumi-chip-profiles.json`.

## Implementation
- Only this exact HVSC archive, SID entry and byte length can enter the additional reSIDfp route.
- Newly added `UCTUMI_MUJER` allowlist kept separate from existing `UCTUMI_8580` (which still contains only `Loco_un_Poco.sid`).
- Force MOS8580 for Mujer, including in background-staged PCM preparation and normal asynchronous load. No SID file modifications, seeking or audio thresholds.
- Keep Mujer at standard **1×** output. Loco's prior MOS8580 and **2.6×** output gain are unchanged and remain gated only by the existing `active8580` variable.
- `activeMujer` is a separate flag. Clear it on deactivation; don't carry its forced chip model to unrelated SIDs.
- Avoid showing the LFT-only interface marker for Mujer.
- No change to timers, fade, first-audio-buffer protection, or community data.

## Static tests
Sandbox evaluation of `eligibleRef`:
- Approved exact Mujer path: YES
- Existing Loco path: YES (unchanged)
- Linus/LFT SID: YES (unchanged)
- Different Uctumi SID: NO
- Mujer from another pack: NO
- Source with sidId instead of native HVSC ref: NO

## Listening checks
1. Play Mujer Amante past the time when the channel previously hung; all voices should continue.
2. Verify all opening kick samples still play when switching manually or via AUTO (TEST208).
3. Loco un Poco is intentionally not modified in this test; no new issues should appear.
4. Leaving Mujer for other SIDs must restore each song's usual emulator and output level.

No listening PASS claimed until user confirms.
