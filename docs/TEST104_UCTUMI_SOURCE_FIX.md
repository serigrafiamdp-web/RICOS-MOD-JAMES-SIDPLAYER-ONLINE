# TEST104 — Uctumi SID source correction (2026-11-08)

**Status:** **PASS — user-confirmed playback restored on 2026-11-08**. The user reported «listo ahi volvio» after the embedded SID replacement and cache-refresh deployment. This establishes recovery of the Uctumi track, not a fresh end-to-end regression test of all functionality.

Baseline: TEST102 PASS (audio TEST100 PASS). TEST103 corrected TOP GROUPS alias display to recognize `Uctumi / PVM`; that was only a UI attribution fix.

## Finding

TOP GROUPS #95 PVM already contained a `Balloon_Country_Bursts.sid` (4500-byte PSID v2), but the embedded binary differed from the original file supplied by the project owner, including a non-identical music/data region around bytes 2048–2303. This was not a rank cross-check: the renderer does not gate playback based on CSDb rankings. The correct issue to fix first was embedded SID provenance.

## Changes

- Replaced only `tracks[94].sidBase64` in `community/playlists/csdb-top-100-groups.json` with the user's uploaded `Balloon_Country_Bursts.sid`. Exact 4500-byte identity checked using FNV-1a32 `3768c894`; uploaded file SHA-256 `447823d27e27e46c14bebf87b174aaf098130ed55a894f4d38f019b950ab036e`.
- Retained `rank:95`, `group:PVM`, `csdbGroup:PVM`, `csdbRank:95`, and original HVSC reference path `MUSICIANS/U/Uctumi/Balloon_Country_Bursts.sid`. All 100 ranked entries retained.
- User-supplied PSID metadata now credits `Esteban Palladino (Uctumi)`, released `2016 PVM`.
- Forced a new URL version for rank JSON and JS to avoid the old embedded binary being reused from browser/CDN cache.
- Did not change audio engine, AUTO, fade, silence detection, remote playlists, Cloudflare D1, or the immutable HVSC library ZIP (already contains Uctumi and is generated from HVSC).

## User test result / follow-up

**PASS:** after accessing the updated GitHub Pages site the user confirmed the song «volvió». This verifies that Uctumi playback returned in the tested flow. AUTO switching for this specific tune was not separately confirmed; retain its existing TEST101 preliminary status. The 100-entry ranking and existing stable TEST102/TEST100 functionality remain unchanged.

Source: `https://serigrafiamdp-web.github.io/RICOS-MOD-JAMES-SIDPLAYER-ONLINE/?test=104uctumi`.
