# TEST202 — Preserve first audible SID samples

**Implementation:** Frontend committed 2026-11-12. Audio listening PASS pending.

## Goal
Keep 5-second outgoing fade and the first PCM samples of the incoming SID audible from 00:00 at normal volume, without fade-in.

## Changes
- In `lft-test/lft-mode.experimental.js`, prevent `changeRender()` from consuming the reSIDfp queue while `songReady=false`. The old player can still be active during async preparation; previously queued opening frames risked being consumed before the incoming `playSong()`.
- In `js/customPlaylist.test101.js`, valid `AudioProcessingEvent.playbackTime` still opens the gain at the timestamp of the first incoming frame (TEST100).
- For browsers where this timestamp is missing/past, the first incoming PCM block is saved while the output remains protected and replayed at normal gain on the following callback. The synth is not advanced during that replay.
- The new buffer hold is cleared when restarting/stopping or beginning a new tune.

## Deliberate non-changes
- 5-second normal fade-out and no fade-in.
- TEST199 per-SID HVSC TIMER; TEST201 silence detector disabled; music and gain rules (including Loco un Poco); controls, publication and backend unchanged.

## Limits
May still be loading-related gaps for slow HVSC fetch or WASM startup, browser/device latency, or intentional silence recorded in the composition. On timestamp fallback an approximately one-buffer delay can remain, but first musical samples are preserved.

## Required listening tests
1. TinySID manual NEXT and AUTO at TIMER: initial attack remains audible; no outgoing volume spike.
2. LFT or Loco reSIDfp to another SID: first note not cut, outgoing fades for 5 seconds.
3. No automatic transition from the silence detector (disabled); TIMER still sets next transition.
4. No new buttons or interface changes.

A successful GitHub Pages deployment alone is **not** an audio PASS.