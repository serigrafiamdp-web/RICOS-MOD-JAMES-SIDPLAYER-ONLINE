# TEST205 — Full first-buffer output during SID transitions

**Status:** source changes committed; GitHub Pages and listening PASS separate.

## Why TEST204 did not help
Adding 150ms after the outgoing fade did not alter the volume gate of the new SID. The first audio block might still have been emitted under the previous SID's near-muted `fadeGainNode`. TEST205 removes the TEST204 hold rather than increasing it further.

## Implementation
In `js/customPlaylist.test101.js`, `player.initWebAudio` installs a second, normally silent `GainNode` output path running in parallel to the outgoing-song fade node. It is fed from the **existing per-track GainNode**, so the separate 2.6× gain for Loco un Poco applies to both paths.

At the first incoming `AudioProcessingEvent`, once `player.playSong()` has initialized the SID and `pendingNewSidUnmute` is set:
- Keep the normal fade path at its 0.005 floor.
- Open the parallel first-buffer path at the exact `event.playbackTime` and close it at `playbackTime + outputBuffer.length/sampleRate`.
- Restore the normal fade path to 1.0 at that exact buffer boundary.
- Do not drop, skip, seek, detect or copy any musical samples on the normal valid-timestamp path.
- The TEST202 first-PCM replay fallback remains for browsers where `playbackTime` is unavailable or in the past.

This keeps the old tail protected until the new buffer and avoids hiding the start of the incoming tune. Unlike a speculative early-unmute of the main fade path, the parallel path remains at 0 before the buffer begins, preventing the old SID tail from returning to full volume.

## Other preserved behavior
- Five-second normal fade-out
- HVSC song TIMER
- Silence detector disabled
- ReSIDfp staging during fade (TEST203) for trusted LFT/Loco references; regular native SID prefetch
- No fade-in, new UI, controls, altered SID data, or backend changes.

## Listening checks (do not mark PASS automatically)
- `Mujer Amante`: ensure first bass drum hit at the real start is present, both after TIMER and manual NEXT.
- Other SIDs with a sharp attack at 00:00: no missing beginnings.
- Loco un Poco and LFT playback: original per-track output gains, no double amplification.
- Outgoing fade still lasts five seconds; no old-song pop during the handoff.
- AUTO OFF should still disable timer changes and silence detector.

## Caveat
`ScriptProcessorNode` and `AudioProcessingEvent.playbackTime` are deprecated Web Audio APIs. Browser-specific behavior can still require a future migration; do not claim perfect sample precision without a listener test or browser capture.