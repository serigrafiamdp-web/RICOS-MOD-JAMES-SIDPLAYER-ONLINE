# TEST172 — Lft SID playback compatibility: Nine / Rodents in the Attic

Date: 2026-11-11. **Status: diagnostic only, no production changes. User reports that both tracks do not play in SpotySid.**

## Symptom and exact source links

- TOP 100 CSDb ONEFILE DEMOS: rank **#2 Nine**. Rank #1 **Subway Arts** has no SID association, and is **not** the failure reported by the user.
- Rank **#5 Rodents in the Attic** also fails according to the user.
- The references in `community/playlists/csdb-top-100-onefile.json` are correct:
  - `library/packs/musicians/L/Lft.zip` → `Nine.sid`
  - `library/packs/musicians/L/Lft.zip` → `Rodents_in_the_Attic.sid`
- Both are separately verified on CSDb as actual music used in the corresponding Lft demos:
  - https://csdb.dk/release/?id=249713
  - https://csdb.dk/release/?id=262145
- The composer publishes `Nine.sid` as an ordinary downloadable music asset (distinct from his `.prg` demo): https://www.linusakesson.net/scene/nine/

## Binary ZIP/header inspection (actual GitHub file)

Fetched original `Lft.zip` from GitHub (`library/packs/musicians/L/Lft.zip`), parsed ZIP central directory, and decompressed SID entries. `Nine.sid` (4,478 bytes) and `Rodents_in_the_Attic.sid` (5,246 bytes) both pass raw DEFLATE decompression length checks and are valid `PSID` v2.

| Metadata | Nine | Rodents in the Attic | Control: Computational Soup 2KB |
| --- | --- | --- | --- |
| Format | PSID v2 | PSID v2 | PSID v2 |
| CHIP flag | PAL + **MOS 8580** (`0x0024`) | PAL + **MOS 8580** (`0x0024`) | PAL + **unspecified model** (`0x0004`) |
| Load | `$1000` | `$1000` | `$0A2A` |
| INIT | `$1000` | `$1000` | `$0A2A` |
| PLAY | `$1003` | `$1003` | `$0A35` |
| Subtunes | 1 | 1 | 1 |
| Second/third SID | none | none | none |
| Header author | Linus Åkesson (lft) | Linus Åkesson (lft) | Linus Åkesson (lft) |

Also checked `Quondam_Tunneling.sid`: PSID v2, `0x0024` flags, $1000/$1003, one SID. It is a useful additional comparison.

**Critical CPU observation:** The start of `Nine.sid` contains `A7 E6` (undocumented **LAX** zero-page) and `CB 07` (undocumented **AXS/SBX** immediate) directly after the INIT jump, in the PLAY routine starting at `$1003`. A simplified 6510 interpreter without these opcodes can fail even though the PSID header is valid. This has **not** been proven as the precise failure until the backend is exercised.

## SpotySid findings

- `js/customPlaylist.test101.js` loads the indexed ZIP via JSZip, finds the correct `.sid` entry, decodes bytes, and calls `player.loadSIDData`.
- `js/sidPlayer.js` passes bytes to `SID.loadMusicData`.
- `js/backend_tinysid.js` uses Emscripten `loadSidFile`, `playTune`, and `computeAudioSamples` for actual emulation. There is no publicly exposed model-selection call in the current JS wrapper.
- **Probable issues to isolate**, not confirmed root cause: undocumented 6510 instructions in Lft's music player; MOS 8580-specific synthesis/filter behavior; possible more specific timing requirements.
- Nothing in the examined headers requires multi-SID, RSID, or replacing the HVSC asset.

## Safe next tests (do not change published playlists/engine yet)

1. In the current SpotySid player, try **Computational Soup 2KB** (same composer, no explicitly requested 8580 chip), then **Quondam Tunneling** (same 8580 flags). Record whether they start, produce silence, or show a console error. Try Nine/Rodents again, capturing `ret = ...` / `SID engine rejected file; error code` messages.
2. Run the exact `Nine.sid` and `Rodents_in_the_Attic.sid` files in **VICE / a reSID-compatible player**, selecting 8580 as indicated by their headers. This establishes a known-good reference.
3. Test the original Tiny'R'Sid backend in isolation to determine whether it supports `LAX` / `AXS` and reports the correct chip model, and whether a track that uses these instructions writes sound registers to `$D400`–`$D418`.
4. Only if the backend is confirmed incompatible should we evaluate a standards-compatible secondary emulator or a narrow fallback. Keep any change strictly scoped, with regression tests for normal 6581 SID, NO HVSC, autoplay, silence detection, plus/+ buttons, timer, and every playlist.

**No changes to `Lft.zip`, `csdb-top-100-onefile.json`, playback code, CSS, Cloudflare Worker, or D1 data in this diagnostic.** Do not label TEST172 PASS without actual playback confirmation.
