# TEST203 — Precise 00:00 handoff without audio detection

**Status:** frontend implemented in `main` on 2026-11-12, listener PASS pending.

## Requirement
At the end of the existing 5-second outgoing fade, the next SID must begin at **the very first PCM sample of the original tune** (time 00:00), with full normal gain, no fade-in and no extra asynchronous initialization wait where preloading is possible. Do **not** detect a sound onset, omit initial silence intentionally written into a SID, fast-forward, seek, or change SID music.

## Implementation
- `js/customPlaylist.test101.js`: when a transition is requested, fetch/decompress the next HVSC song's bytes **while the old song is fading**. Existing `loadSlot()` shares cached promises.
- For ordinary GAMES/native SID requests, fetch next original SID bytes during the fade and give them to the existing `player.loadSIDData()` at the boundary if ready. If not, use the original fetch/loader.
- For an exactly approved `Lft.zip` or `Uctumi/Loco_un_Poco.sid` reference, `lft-test/lft-mode.experimental.js` separately creates a second reSIDfp engine context while the previous song continues. It loads the incoming SID at the real first subtune position and renders exactly the first four PCM blocks **into a queue only** — no playback, thresholding or skips.
- At the transition boundary, if this prepared queue is ready, atomically replace the outgoing engine with the staged engine and deliver its first stored PCM samples to the normal audio callback. The TEST100/TEST202 first-new-buffer gain synchronisation remains in place.
- Switching queue targets during fade invalidates the previously staged SID. Cancelling/closing a transition disposes the staged engine; backend failures fall back to the original loading method.

## Preserved
- HVSC duration TIMER by SID/subtune (TEST199).
- **Silence detector disabled (TEST201)**.
- Five-second fade-out for an actually playing previous SID, normal 1x full-gain incoming first block (Loco un Poco retains its distinct 2.6x gain).
- Existing single playback channel, native SID compositions, audio emulation, playlist metadata, Cloudflare D1, REPUBLISH, interface and buttons.

## Caveats
- The tune may legitimately contain quiet samples at 00:00; those are not to be stripped.
- The start of a truly uncached/slow asynchronous load can still be delayed if 5s is not enough for staging; browser/driver latency also remains.
- Preparing a second WASM context can momentarily increase CPU usage during the outgoing fade.
- This changes code only. GitHub Pages success is not audio verification.

## Manual regression
1. AUTO TIMER ON: native SID -> native SID, ensure audible first attack appears without a new loading gap.
2. Native -> LFT, LFT -> LFT and Loco -> native: make sure fade continues to work and no first attack is missing.
3. Switch to a different NEXT selection midway through fade; only chosen tune must play from 00:00.
4. AUTO OFF: silence cannot trigger next track.
5. Check no sudden previous-SID loud spike, no cut at the opening, no changes in TIMER.
