# TEST200 — silent-end handoff without redundant fade

**Status:** frontend code committed. GitHub Pages success and listening PASS are separate.

## Goal
Hear the incoming SID at full volume from its first rendered audio buffer, with no unnecessary silent gap at the end of the previous SID.

## Targeted change
- The existing silence detector still requires 12 seconds of playback and 2 continuous seconds below its RMS/peak thresholds before auto-advancing.
- When that detector confirms **Audio silence detected**, route directly to the next SID instead of fading already-silent output for another 5 seconds.
- Explicit end-of-SID (no samples) still advances directly as before.
- Ordinary manual NEXT and timer-based AUTO while audio is still audible retain the existing five-second cosine fade-out.
- TEST100 first-new-buffer unmute based on `event.playbackTime` is untouched. No fade-in, and no change to SID samples, reSIDfp, Loco gain, manual TIMER, metadata, playlist order, publication, or the UI.
- As before, loading a not-yet-available SID or starting the WASM reSIDfp backend can still cause a gap; TEST200 reduces the *avoidable five-second fade of silence*, not every possible asynchronous delay.
- A musical pause longer than the detector's 2-second threshold may still be mistaken for end-of-song. This heuristic is unchanged.

## Expected listening checks
1. AUTO ON: SID emits silence for 2+ seconds after playing at least 12 seconds -> next SID starts without another five-second fade.
2. AUTO ON: SID is still audible at its timer limit -> normal five-second fade and direct full-volume next SID.
3. Manual NEXT while audible -> normal five-second fade.
4. Incoming SID first attack is present, without the previous SID's volume spike (TEST100 regression).
5. Both standard TinySID and LFT / Loco reSIDfp tracks should be tried; slow loading is a distinct potential gap.
6. AUTO OFF: no automatic advance from silence.

**Do not mark audio PASS without listening.**
