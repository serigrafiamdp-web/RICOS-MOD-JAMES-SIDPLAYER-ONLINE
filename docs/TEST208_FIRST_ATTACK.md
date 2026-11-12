# TEST208 — Protect the first SID attack during transitions

**Date:** 2026-11-12. **Status:** committed; test simulation PASS; listening PASS pending.

## Reproduction

User hears the entire first kick of *Mujer Amante* when pressing STOP then PLAY, but reports a lost part of that kick when the same tune begins through a manual or automatic playlist transition. Therefore the SID itself appears to contain the opening; the transition output scheduling is the primary suspect.

## Root-cause candidate

TEST205 scheduled the special first-buffer opening GainNode inside the `ScriptProcessorNode.onaudioprocess` callback **for that same output buffer**. In a busy browser the callback might execute with little or no time before `AudioProcessingEvent.playbackTime`, so an output gain change scheduled at that timestamp cannot guarantee the entire first attack becomes audible. This is a timing risk, not a confirmed recording of the user's machine.

## Changes

Only `js/customPlaylist.test101.js` and the versioned script query in `index.html` are modified. No new buttons or SID modification.

- The renderer captures the entire first output buffer from the new SID into a Float32Array and outputs a silent block in its place.
- Schedules the separate TEST205 first-buffer gain **at least one buffer ahead**, on the audio clock, never during the output slot it is trying to make audible.
- On the next scheduled output slot, replays that exact buffer before advancing the emulator again. If the callback was late it holds the saved samples for an additional whole silent buffer; no PCM data is dropped.
- The original outgoing fade GainNode remains near zero through the opening block, then resumes unity at its end; no previous-SID tail is deliberately unmuted.
- When `playbackTime` is unavailable, use a conservative two-buffer scheduled opening with one held silent callback before replay.
- Resets held state on STOP, canceled transition or new `playSong`.
- The TEST206 countdown now advances only for output slots delivering SID samples, not the held silent slot.

### Preserved

- 5-second outgoing fade; no fade-in of the incoming SID.
- TEST199/206 per-song HVSC length and visual countdown.
- Silence detector still disabled.
- TEST203 early HVSC bytes/reSIDfp preparation.
- Existing album/playlist functions, gain for Loco un Poco, and backend.

## Verification

Ran isolated tests against the *actual wrapper callback code* in V8 with a 4096-sample output mock at 44,100 Hz:

1. Normal `playbackTime`: first sample and next sample preserved, exactly one held output buffer.
2. Late callback: opening block held until a future scheduled audio slot; samples reproduced in order.
3. Invalid `playbackTime`: extra slot held and original first samples reproduced.

All three pass in code-level simulation. These are not a browser-audio recording or a substitute for listening.

## Listening acceptance

- Direct STOP/PLAY of Mujer Amante remains intact.
- Manual switch from another SID to Mujer Amante should reproduce the same first kick, with no clipping or duplication.
- Timer-based AUTO uses the same transition and must have the same first hit.
- No previous-song spike, excessive silence, changed volume, or TIMER regression.

If the first kick is still truncated, add diagnostic timing/capture on the running browser next; do not increase arbitrary post-fade hold lengths.
