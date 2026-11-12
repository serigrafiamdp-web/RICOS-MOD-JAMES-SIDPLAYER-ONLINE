# TEST199 — HVSC known song lengths for TIMER

**Status:** frontend and reference data committed. GitHub Pages deployment and listener verification are separate checkpoints.

## Purpose

Retain the **existing TIMER (MM:SS)**, AUTO mode, silence detector and five-second between-song fade. At the start of **each SID and each subtune**, use the duration registered in the available HVSC song-length database **when the exact HVSC path is present**. Unknown songs keep the original **03:00** default. Never invent durations.

## Source and freshness

- Origin: HVSC Crew `DOCUMENTS/Songlengths.md5`; documentation: https://hvsc.c64.org/downloads
- Auditable snapshot: [mickeyl/retrotunes (5,090,428-byte Songlengths.md5)](https://github.com/mickeyl/retrotunes/blob/c02e4723bd2c/HVSC/C64Music/DOCUMENTS/Songlengths.md5), last copied **2025-10-06**.
- **Caution:** this snapshot predates the project's HVSC #85 (2026). Entries are therefore **tentative path-based matches**, not verified against every 2026 SID binary hash. Tracks absent from the snapshot do **not** receive a guessed time.
- Timings are rounded to whole seconds to fit the preexisting MM:SS field. Unknown, unsupported or out-of-range subtunes keep 03:00.

## Generated reference data

- **34 alphabetical shards** under `library/songlengths/` (27 MUSICIANS and 7 DEMOS).
- **58,257 dated source records** with at least one available playable duration. This is the number imported from the 2025 snapshot, **not** a claim of 58,257 verified local HVSC #85 files.
- Same-origin JSON files are fetched **lazily by the currently playing SID's shelf** and cached in the browser; no 5 MB database fetch on initial load.
- Lookup source: `library/packs/musicians/U/Uctumi.zip + Loco_un_Poco.sid` → `library/songlengths/musicians-U.json` → `Uctumi/Loco_un_Poco.sid` → **03:15**.
- Another example: `Lft/Air_on_a_Rasterline.sid` → **02:29**.
- A multi-subtune SID uses its **current subtune index**, not a global average or first-track length.

## Runtime behaviour

- `js/customPlaylist.test101.js`: after `player.playSong()`, choose time for the actual track/subtune. While metadata loads, the field is 03:00; if a matching value is found, update TIMER automatically.
- Manual TIMER changes override the tentative value **only for that SID and subtune during this browser session**. Changing tracks and returning reapplies that session override. No new UI controls.
- The existing AUTO skip/fade begins five seconds before the displayed TIMER limit; the existing silence detector can still advance earlier. The music engine and SID PCM remain untouched.
- If metadata is unavailable, unsupported, or there is a race with a later selection, leave the fallback unchanged rather than applying a stale duration.

## Important non-goals / pending

- **Per-SID manual duration edits are NOT currently stored in Cloudflare D1 by REPUBLISH.** The deployed Worker validates/stores canonical reference tracks and does not currently support saved per-track duration overrides. It requires a separately deployed backend change and a successful readback test before claiming it works.
- This change is NOT a persistent per-playlist timer and does not alter public playlist IDs, ordering, metadata, publication keys or backend data.
- Song lengths should not be interpreted as guaranteed first-loop or perfect stop points; older HVSC entries may differ from current arrangements.

[Features](FEATURES.md) · [Architecture](ARCHITECTURE.md) · [README](../README.md)
